import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TechnicianController } from './technician.controller';
import { TechnicianService } from './technician.service';
import { AuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/role-guard';

@Module({
  imports: [JwtModule],
  controllers: [TechnicianController],
  providers: [TechnicianService],
})
export class TechnicianModule {}
