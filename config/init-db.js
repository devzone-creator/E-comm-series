import { testConnection } from './database.js';
import MigrationManager from './migrations.js';
import DatabaseSeeder from './seeder.js';

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Test database connection
    await testConnection();
    
    // Run migrations
    const migrationManager = new MigrationManager();
    await migrationManager.runMigrations();
    
    // Run seeders
    const seeder = new DatabaseSeeder();
    await seeder.runAllSeeders();
    
    console.log('✅ Database initialization completed successfully!');
    console.log('\n📋 Default Admin Credentials:');
    console.log('Email: admin@afriglam.com');
    console.log('Password: admin123');
    console.log('\n⚠️  Please change the admin password after first login!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };