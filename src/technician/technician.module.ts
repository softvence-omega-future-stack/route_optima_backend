import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TechnicianController } from './technician.controller';
import { TechnicianService } from './technician.service';

@Module({
  imports: [JwtModule],
  controllers: [TechnicianController],
  providers: [TechnicianService],
})
export class TechnicianModule {}
