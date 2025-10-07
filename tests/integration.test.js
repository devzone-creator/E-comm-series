import { pool, testConnection } from '../config/database.js';
import DatabaseUtils from '../config/db-utils.js';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Test connection before running tests
    await testConnection();
  });

  afterAll(async () => {
    // Close database connections after tests
    await pool.end();
  });

  test('should connect to database successfully', async () => {
    const result = await pool.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  test('should count users table', async () => {
    const count = await DatabaseUtils.count('users');
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should find admin user', async () => {
    const admin = await DatabaseUtils.findOne('users', { email: 'admin@afriglam.com' });
    expect(admin).toBeTruthy();
    expect(admin.email).toBe('admin@afriglam.com');
    expect(admin.role).toBe('admin');
  });

  test('should count categories', async () => {
    const count = await DatabaseUtils.count('categories');
    expect(count).toBeGreaterThanOrEqual(4); // We seeded 4 categories
  });

  test('should count products', async () => {
    const count = await DatabaseUtils.count('products');
    expect(count).toBeGreaterThanOrEqual(2); // We seeded 2 products
  });

  test('should verify database schema exists', async () => {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map(row => row.table_name);
    
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('orders');
    expect(tableNames).toContain('order_items');
    expect(tableNames).toContain('cart_items');
    expect(tableNames).toContain('addresses');
    expect(tableNames).toContain('reviews');
  });
});