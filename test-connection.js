import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);
    
    const productCount = await prisma.product.count();
    console.log(`📦 Products in database: ${productCount}`);
    
    console.log('\n✨ Connection test passed!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Make sure to:');
    console.log('1. Update DATABASE_URL in .env file');
    console.log('2. Run: npx prisma migrate dev --name init');
    console.log('3. Run: npm run seed');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
