import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@musti.com' },
      update: {},
      create: {
        name: 'Admin',
        email: 'admin@musti.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });

    console.log('✅ Admin user created:', admin.email);
    console.log('Password: admin123');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
