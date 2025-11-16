import { Module } from '@nestjs/common';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { JwtModule } from '@nestjs/jwt';
// import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    JwtModule,
  ],  
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}