import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

interface AdminData {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class DispatcherSeeder implements OnModuleInit {
  private readonly logger = new Logger(DispatcherSeeder.name);

  private readonly defaultDispatcher: AdminData = {
    name: "Dispatch Bros",
    email: "dispatchbros444@gmail.com",
    password: "admin123",
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDispatcher();
  }

  private async seedDispatcher() {
    try {
      // Check if dispatcher already exists
      const existingDispatcher = await this.prisma.user.findUnique({
        where: { email: this.defaultDispatcher.email }
      });

      if (existingDispatcher) {
        this.logger.log('ℹ️ Default dispatcher already exists');
        return;
      }

      this.logger.log('👑 Creating default dispatcher user...');

      // Hash password
      const hashedPassword = await bcrypt.hash(this.defaultDispatcher.password, 12);

      // Create dispatcher user
      const dispatcher = await this.prisma.user.create({
        data: {
          name: this.defaultDispatcher.name,
          email: this.defaultDispatcher.email,
          password: hashedPassword,
          role: 'DISPATCHER',
          photo: null,
        },
      });

      this.logger.log('Default dispatcher created successfully!');
      this.logger.log(`Name: ${dispatcher.name}`);
      this.logger.log(`Email: ${dispatcher.email}`);
      this.logger.log(`Role: ${dispatcher.role}`);
      this.logger.log(`ID: ${dispatcher.id}`);

    } catch (error) {
      this.logger.error('❌ Error seeding default dispatcher:', error);
    }
  }
}