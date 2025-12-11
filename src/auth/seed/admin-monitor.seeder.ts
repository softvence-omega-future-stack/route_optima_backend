import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

interface AdminData {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class AdminMonitorSeeder {
  private readonly logger = new Logger(AdminMonitorSeeder.name);

  private readonly defaultAdmin: AdminData = {
    name: "System Admin",
    email: "admin@dispatchbros.com",
    password: "monitor123",
  };

  constructor(private readonly prisma: PrismaService) {}

  async seedAdminMonitor() {
    try {
      // Check if admin already exists
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: this.defaultAdmin.email }
      });

      if (existingAdmin) {
        this.logger.log('ℹ️ Admin monitor user already exists');
        return;
      }

      this.logger.log('👑 Creating admin monitor user...');

      // Hash password
      const hashedPassword = await bcrypt.hash(this.defaultAdmin.password, 12);

      // Create admin user
      const admin = await this.prisma.user.create({
        data: {
          name: this.defaultAdmin.name,
          email: this.defaultAdmin.email,
          password: hashedPassword,
          role: 'ADMIN',
          photo: null,
        },
      });

      this.logger.log('Admin monitor user created successfully!');
      this.logger.log(`Name: ${admin.name}`);
      this.logger.log(`Email: ${admin.email}`);
      this.logger.log(`Role: ${admin.role}`);
      this.logger.log(`ID: ${admin.id}`);

    } catch (error) {
      this.logger.error('❌ Error seeding admin monitor:', error);
    }
  }
}