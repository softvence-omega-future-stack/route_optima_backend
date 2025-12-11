import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DispatcherController } from './dispatcher.controller';
import { DispatcherService } from './dispatcher.service';
import { PrismaModule } from 'prisma/prisma.module';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [DispatcherController],
  providers: [DispatcherService, MailService],
  exports: [DispatcherService],
})
export class DispatcherModule {}