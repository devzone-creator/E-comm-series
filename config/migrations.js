import { pool } from './database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationManager {
  constructor() {
    this.migrationsTable = 'schema_migrations';
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await pool.query(query);
      console.log('✅ Migrations table created');
    } catch (error) {
      console.error('❌ Error creating migrations table:', error.message);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const result = await pool.query(
        `SELECT version FROM ${this.migrationsTable} ORDER BY executed_at`
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      console.error('❌ Error fetching executed migrations:', error.message);
      return [];
    }
  }

  async executeMigration(version, sql) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration
      await client.query(
        `INSERT INTO ${this.migrationsTable} (version) VALUES ($1)`,
        [version]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${version} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${version} failed:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async runInitialSchema() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = await fs.readFile(schemaPath, 'utf8');
      
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      
      if (!executedMigrations.includes('001_initial_schema')) {
        await this.executeMigration('001_initial_schema', schemaSql);
      } else {
        console.log('✅ Initial schema already exists');
      }
    } catch (error) {
      console.error('❌ Error running initial schema:', error.message);
      throw error;
    }
  }

  async runMigrations() {
    try {
      await this.createMigrationsTable();
      await this.runInitialSchema();
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration process failed:', error.message);
      throw error;
    }
  }
}

export default MigrationManager;