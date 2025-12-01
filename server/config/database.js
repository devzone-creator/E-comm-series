import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 3, // Reduced maximum number of clients in the pool
  min: 0, // Allow pool to go to 0 connections when idle
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout for Neon
  acquireTimeoutMillis: 15000, // Increased acquire timeout
  createTimeoutMillis: 10000, // Increased create timeout
  destroyTimeoutMillis: 5000, // Increased destroy timeout
  reapIntervalMillis: 5000, // Check for idle clients every 5 seconds
  createRetryIntervalMillis: 200, // Retry creating a client every 200ms
};

// Fallback to individual connection parameters if DATABASE_URL is not provided
if (!process.env.DATABASE_URL) {
  dbConfig.host = process.env.DB_HOST;
  dbConfig.port = process.env.DB_PORT;
  dbConfig.database = process.env.DB_NAME;
  dbConfig.user = process.env.DB_USER;
  dbConfig.password = process.env.DB_PASSWORD;
}

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process, let it recover
});

// Handle connection errors
pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('Database client error:', err);
    // Don't manually release here - pool will handle it
  });
});

// Add connection retry wrapper
export const withRetry = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Database operation attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Test database connection with retry logic
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ Database connected successfully');
      client.release();
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error('❌ All database connection attempts failed');
        process.exit(1);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});

export { pool, testConnection };