import { pool, testConnection } from '../config/database.js';
import DatabaseUtils from '../config/db-utils.js';

async function runTests() {
  console.log('🧪 Running Database Tests...\n');
  
  let passed = 0;
  let failed = 0;

  const test = async (name, testFn) => {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  };

  // Test 1: Database Connection
  await test('Database Connection', async () => {
    await testConnection();
  });

  // Test 2: Basic Query
  await test('Basic Query', async () => {
    const result = await pool.query('SELECT 1 as test');
    if (result.rows[0].test !== 1) throw new Error('Query failed');
  });

  // Test 3: Admin User Exists
  await test('Admin User Exists', async () => {
    const admin = await DatabaseUtils.findOne('users', { email: 'admin@afriglam.com' });
    if (!admin) throw new Error('Admin user not found');
    if (admin.role !== 'admin') throw new Error('Admin role incorrect');
  });

  // Test 4: Categories Count
  await test('Categories Seeded', async () => {
    const count = await DatabaseUtils.count('categories');
    if (count < 4) throw new Error(`Expected at least 4 categories, got ${count}`);
  });

  // Test 5: Products Count
  await test('Products Seeded', async () => {
    const count = await DatabaseUtils.count('products');
    if (count < 2) throw new Error(`Expected at least 2 products, got ${count}`);
  });

  // Test 6: Database Schema
  await test('Database Schema', async () => {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map(row => row.table_name);
    const requiredTables = ['users', 'categories', 'products', 'orders', 'order_items', 'cart_items'];
    
    for (const table of requiredTables) {
      if (!tableNames.includes(table)) {
        throw new Error(`Table ${table} not found`);
      }
    }
  });

  // Test 7: DatabaseUtils Insert/Update/Delete
  await test('DatabaseUtils CRUD Operations', async () => {
    // Insert test category
    const testCategory = await DatabaseUtils.insert('categories', {
      name: 'Test Category',
      description: 'Test description'
    });
    
    if (!testCategory.id) throw new Error('Insert failed');
    
    // Update test category
    const updated = await DatabaseUtils.update('categories', 
      { description: 'Updated description' },
      { id: testCategory.id }
    );
    
    if (updated.description !== 'Updated description') throw new Error('Update failed');
    
    // Delete test category
    const deleted = await DatabaseUtils.delete('categories', { id: testCategory.id });
    if (!deleted) throw new Error('Delete failed');
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
  }
  
  await pool.end();
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});