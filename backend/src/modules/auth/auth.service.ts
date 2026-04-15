import {
  Injectable, UnauthorizedException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import { User } from '../../database/entities/user.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction, UserRole } from '../../common/enums';
import { encrypt, decrypt } from '../../common/utils/crypto.util';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRedis() private redis: Redis,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
      withDeleted: false,
    });

    // Account does not exist — same error message to prevent enumeration
    if (!user || !user.isActive) {
      await this.writeAuditLog(AuditAction.LOGIN_FAILED, null, dto.username, ip, 'FAILURE', 'User not found or inactive');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check lockout
    if (user.lockedUntil && dayjs().isBefore(dayjs(user.lockedUntil))) {
      const minutesLeft = dayjs(user.lockedUntil).diff(dayjs(), 'minute');
      throw new ForbiddenException(`Account locked. Try again in ${minutesLeft} minutes`);
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      await this.handleFailedLogin(user, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Password expired?
    if (user.passwordExpiresAt && dayjs().isAfter(dayjs(user.passwordExpiresAt))) {
      throw new ForbiddenException('Password expired. Please change your password.');
    }

    // Reset failed attempts on success
    await this.userRepo.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });

    // MFA required for L3+
    const requiresMfa = user.isMfaEnabled && this.userRequiresMfa(user);
    if (requiresMfa) {
      const partialToken = await this.issuePartialToken(user);
      await this.writeAuditLog(AuditAction.LOGIN, user.id, user.username, ip, 'SUCCESS', 'MFA required');
      return { mfaRequired: true, partialToken };
    }

    const tokens = await this.issueTokens(user, ip);
    await this.writeAuditLog(AuditAction.LOGIN, user.id, user.username, ip, 'SUCCESS', null);
    return { mfaRequired: false, ...tokens };
  }

  async verifyMfa(dto: MfaVerifyDto, partialToken: string, ip: string) {
    // Verify partial token
    let payload: any;
    try {
      payload = this.jwtService.verify(partialToken, { secret: this.getSecret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired partial token');
    }

    if (payload.scope !== 'mfa_pending') {
      throw new UnauthorizedException('Invalid token scope');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    // Check OTP (TOTP or SMS)
    let otpValid = false;
    if (user.mfaType === 'TOTP' && user.mfaSecretEncrypted) {
      const secret = decrypt(user.mfaSecretEncrypted);
      const totp = new OTPAuth.TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 });
      otpValid = totp.validate({ token: dto.otp, window: 1 }) !== null;
    } else if (user.mfaType === 'SMS') {
      const storedOtp = await this.redis.get(`sms_otp:${user.id}`);
      otpValid = storedOtp === dto.otp;
      if (otpValid) await this.redis.del(`sms_otp:${user.id}`);
    }

    if (!otpValid) {
      await this.writeAuditLog(AuditAction.LOGIN_FAILED, user.id, user.username, ip, 'FAILURE', 'Invalid OTP');
      throw new UnauthorizedException('Invalid OTP');
    }

    // Invalidate partial token
    await this.redis.setex(`blacklist:${payload.jti}`, 600, '1');

    const tokens = await this.issueTokens(user, ip);
    await this.writeAuditLog(AuditAction.MFA_VERIFIED, user.id, user.username, ip, 'SUCCESS', null);
    return tokens;
  }

  async refreshToken(refreshToken: string, ip: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: this.getSecret() });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') throw new UnauthorizedException('Not a refresh token');

    // Check blacklist
    const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
    if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    // Blacklist old refresh token (rotation)
    await this.redis.setex(`blacklist:${payload.jti}`, 8 * 3600, '1');

    return this.issueTokens(user, ip);
  }

  async logout(userId: string, jti: string) {
    // Blacklist the current access token's jti
    await this.redis.setex(`blacklist:${jti}`, 15 * 60, '1');
    await this.redis.del(`session:${userId}`);
    await this.writeAuditLog(AuditAction.LOGOUT, userId, null, null, 'SUCCESS', null);
  }

  async setupTotp(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      issuer: this.config.get('mfa.issuer'),
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const encryptedSecret = encrypt(secret.base32);
    await this.userRepo.update(userId, {
      mfaSecretEncrypted: encryptedSecret,
      mfaType: 'TOTP',
    });

    return { uri: totp.toString(), secret: secret.base32 };
  }

  async enableMfa(userId: string, otp: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.mfaSecretEncrypted) throw new BadRequestException('MFA not setup');

    const secret = decrypt(user.mfaSecretEncrypted);
    const totp = new OTPAuth.TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 });
    if (totp.validate({ token: otp, window: 1 }) === null) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.userRepo.update(userId, { isMfaEnabled: true });
    return { success: true };
  }

  private async issueTokens(user: User, ip: string) {
    const jti = uuidv4();
    const refreshJti = uuidv4();

    const accessPayload = {
      sub: user.id,
      username: user.username,
      primaryRole: user.primaryRole,
      approvalLevel: user.approvalLevel,
      jti,
      type: 'access',
    };

    const refreshPayload = {
      sub: user.id,
      jti: refreshJti,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: '15m',
      secret: this.getSecret(),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '8h',
      secret: this.getSecret(),
    });

    // Store session in Redis
    await this.redis.setex(
      `session:${user.id}`,
      8 * 3600,
      JSON.stringify({ jti, refreshJti, ip, updatedAt: Date.now() }),
    );

    return { accessToken, refreshToken };
  }

  private async issuePartialToken(user: User) {
    const jti = uuidv4();
    return this.jwtService.sign(
      { sub: user.id, scope: 'mfa_pending', jti, type: 'partial' },
      { expiresIn: '5m', secret: this.getSecret() },
    );
  }

  private userRequiresMfa(user: User): boolean {
    const mfaLevels: UserRole[] = [
      UserRole.CREDIT_SUPERVISOR,
      UserRole.CREDIT_MANAGER,
      UserRole.CREDIT_DIRECTOR,
      UserRole.VP_CREDIT,
      UserRole.CREDIT_COMMITTEE,
      UserRole.ADMIN,
    ];
    return mfaLevels.includes(user.primaryRole as UserRole) || (user.approvalLevel >= 3);
  }

  private async handleFailedLogin(user: User, ip: string) {
    const maxAttempts = this.config.get<number>('security.maxLoginAttempts');
    const lockoutMinutes = this.config.get<number>('security.lockoutDuration');
    const newAttempts = user.failedLoginAttempts + 1;

    const update: Partial<User> = { failedLoginAttempts: newAttempts };
    if (newAttempts >= maxAttempts) {
      update.lockedUntil = dayjs().add(lockoutMinutes, 'minute').toDate();
      await this.writeAuditLog(AuditAction.ACCOUNT_LOCKED, user.id, user.username, ip, 'FAILURE', `Locked after ${newAttempts} attempts`);
    }

    await this.userRepo.update(user.id, update);
    await this.writeAuditLog(AuditAction.LOGIN_FAILED, user.id, user.username, ip, 'FAILURE', `Attempt ${newAttempts}`);
  }

  private getSecret(): string {
    return this.config.get('jwt.privateKey') || 'los-jwt-secret-change-in-prod';
  }

  private async writeAuditLog(
    action: AuditAction,
    actorId: string,
    username: string,
    ip: string,
    result: string,
    errorMessage: string,
  ) {
    try {
      const log = this.auditRepo.create({
        action,
        actorId,
        actorUsername: username,
        ipAddress: ip,
        result,
        errorMessage,
      });
      await this.auditRepo.save(log);
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }
}
