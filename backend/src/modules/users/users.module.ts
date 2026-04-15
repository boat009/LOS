import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { UserDelegation } from '../../database/entities/user-delegation.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserDelegation, AuditLog])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
