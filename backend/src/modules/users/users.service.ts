import {
  Injectable, NotFoundException, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dayjs from 'dayjs';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { UserDelegation } from '../../database/entities/user-delegation.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction } from '../../common/enums';
import { hash, maskEmail, maskPhone, encrypt } from '../../common/utils/crypto.util';
import { CreateUserDto, UpdateUserDto, CreateDelegationDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly PASSWORD_EXPIRY_DAYS = 90;
  private readonly PASSWORD_HISTORY_COUNT = 5;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserDelegation) private delegationRepo: Repository<UserDelegation>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.userRepo.findAndCount({
      where: { deletedAt: null },
      select: ['id', 'username', 'nameTh', 'nameEn', 'emailMasked', 'primaryRole', 'approvalLevel', 'isActive', 'createdAt'],
      relations: ['roles'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Strip sensitive fields
    const { passwordHash, mfaSecretEncrypted, passwordHistory, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto, actorId: string): Promise<User> {
    // Check username uniqueness
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) throw new ConflictException('Username already exists');

    // Validate password policy
    this.validatePasswordPolicy(dto.password);

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
    const passwordExpiresAt = dayjs().add(this.PASSWORD_EXPIRY_DAYS, 'day').toDate();

    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      nameTh: dto.nameTh,
      nameEn: dto.nameEn,
      emailMasked: maskEmail(dto.email),
      emailHash: hash(dto.email),
      phoneMasked: dto.phone ? maskPhone(dto.phone) : null,
      phoneHash: dto.phone ? hash(dto.phone) : null,
      employeeId: dto.employeeId,
      department: dto.department,
      primaryRole: dto.primaryRole,
      approvalLevel: dto.approvalLevel,
      maxApprovalAmount: dto.maxApprovalAmount,
      isMfaEnabled: false,
      isActive: true,
      passwordHistory: [passwordHash],
      passwordChangedAt: new Date(),
      passwordExpiresAt,
      adminIpWhitelist: dto.adminIpWhitelist || [],
      createdBy: actorId,
    });

    const saved = await this.userRepo.save(user);

    // Assign roles
    if (dto.roleIds?.length) {
      const roles = await this.roleRepo.findByIds(dto.roleIds);
      saved.roles = roles;
      await this.userRepo.save(saved);
    }

    await this.writeAudit(AuditAction.USER_CREATE, actorId, saved.id, null, { username: dto.username, role: dto.primaryRole });
    return saved;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: Partial<User> = { updatedBy: actorId };

    if (dto.nameTh) updateData.nameTh = dto.nameTh;
    if (dto.nameEn) updateData.nameEn = dto.nameEn;
    if (dto.email) {
      updateData.emailMasked = maskEmail(dto.email);
      updateData.emailHash = hash(dto.email);
    }
    if (dto.phone) {
      updateData.phoneMasked = maskPhone(dto.phone);
      updateData.phoneHash = hash(dto.phone);
    }
    if (dto.approvalLevel !== undefined) updateData.approvalLevel = dto.approvalLevel;
    if (dto.maxApprovalAmount !== undefined) updateData.maxApprovalAmount = dto.maxApprovalAmount;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.adminIpWhitelist) updateData.adminIpWhitelist = dto.adminIpWhitelist;

    await this.userRepo.update(id, updateData);
    await this.writeAudit(AuditAction.USER_UPDATE, actorId, id, null, dto);

    return this.findOne(id);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    // Validate new password policy
    this.validatePasswordPolicy(newPassword);

    const newHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Check password history (last 5)
    for (const oldHash of user.passwordHistory) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        throw new BadRequestException('Cannot reuse last 5 passwords');
      }
    }

    const history = [newHash, ...user.passwordHistory].slice(0, this.PASSWORD_HISTORY_COUNT);

    await this.userRepo.update(userId, {
      passwordHash: newHash,
      passwordHistory: history,
      passwordChangedAt: new Date(),
      passwordExpiresAt: dayjs().add(this.PASSWORD_EXPIRY_DAYS, 'day').toDate(),
      updatedBy: actorId,
    });

    await this.writeAudit(AuditAction.PASSWORD_CHANGE, actorId, userId, null, null);
    return { success: true };
  }

  async softDelete(id: string, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepo.softDelete(id);
    await this.writeAudit(AuditAction.USER_DELETE, actorId, id, { username: user.username }, null);
    return { success: true };
  }

  async createDelegation(dto: CreateDelegationDto, actorId: string) {
    const delegator = await this.userRepo.findOne({ where: { id: dto.delegatorId } });
    const delegate = await this.userRepo.findOne({ where: { id: dto.delegateId } });

    if (!delegator || !delegate) throw new NotFoundException('User not found');
    if (dto.delegatorId === dto.delegateId) throw new BadRequestException('Cannot delegate to yourself');

    const delegation = this.delegationRepo.create({
      delegatorId: dto.delegatorId,
      delegateId: dto.delegateId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      reason: dto.reason,
      isActive: true,
      createdBy: actorId,
    });

    const saved = await this.delegationRepo.save(delegation);
    await this.writeAudit(AuditAction.DELEGATION_CREATE, actorId, saved.id, null, dto);
    return saved;
  }

  async getActiveDelegations() {
    return this.delegationRepo
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.delegator', 'delegator')
      .innerJoinAndSelect('d.delegate', 'delegate')
      .where('d.is_active = true')
      .andWhere('d.end_date > NOW()')
      .select([
        'd.id', 'd.startDate', 'd.endDate', 'd.reason',
        'delegator.username', 'delegator.nameTh',
        'delegate.username', 'delegate.nameTh',
      ])
      .getMany();
  }

  private validatePasswordPolicy(password: string) {
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) throw new BadRequestException('Password must contain uppercase letter');
    if (!/[a-z]/.test(password)) throw new BadRequestException('Password must contain lowercase letter');
    if (!/[0-9]/.test(password)) throw new BadRequestException('Password must contain a digit');
    if (!/[^A-Za-z0-9]/.test(password)) throw new BadRequestException('Password must contain a special character');

    // Common passwords list (sample — extend in production)
    const commonPasswords = ['Password1!', 'Admin1234!', 'Welcome1!', 'Qwerty1!'];
    if (commonPasswords.includes(password)) throw new BadRequestException('Password is too common');
  }

  private async writeAudit(action: AuditAction, actorId: string, resourceId: string, oldValue: any, newValue: any) {
    await this.auditRepo.save(
      this.auditRepo.create({ action, actorId, resourceType: 'User', resourceId, oldValue, newValue, result: 'SUCCESS' }),
    );
  }
}
