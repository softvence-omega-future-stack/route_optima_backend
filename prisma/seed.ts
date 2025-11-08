import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TIME_SLOTS = [
  { label: '8:00 AM - 10:00 AM', startTime: '08:00', endTime: '10:00', order: 1 },
  { label: '10:00 AM - 12:00 PM', startTime: '10:00', endTime: '12:00', order: 2 },
  { label: '11:00 AM - 1:00 PM', startTime: '11:00', endTime: '13:00', order: 3 },
  { label: '1:00 PM - 3:00 PM', startTime: '13:00', endTime: '15:00', order: 4 },
  { label: '2:00 PM - 4:00 PM', startTime: '14:00', endTime: '16:00', order: 5 },
  { label: '4:00 PM - 6:00 PM', startTime: '16:00', endTime: '18:00', order: 6 },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Check if default time slots already exist
  const existingSlots = await prisma.defaultTimeSlot.count();

  if (existingSlots === 0) {
    console.log('📅 Creating default time slots...');
    
    for (const slot of DEFAULT_TIME_SLOTS) {
      await prisma.defaultTimeSlot.create({
        data: slot,
      });
    }
    
    console.log('✅ Default time slots created successfully!');
  } else {
    console.log('ℹ️  Default time slots already exist, skipping...');
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });