import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaService } from 'prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { GeocoderUtil } from 'src/utils/geocoder.util';
import { TwilioUtil } from 'src/utils/twilio.util';
import { NotificationPreferencesSeeder } from './seed/notification-preferences.seeder';
import { AddressParserUtil } from 'src/utils/address-parser.util';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [JobsController],
  providers: [JobsService, PrismaService, GeocoderUtil, TwilioUtil, NotificationPreferencesSeeder, AddressParserUtil],
  exports: [JobsService],
})
export class JobsModule { }
