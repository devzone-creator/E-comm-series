import { pool } from './database.js';

class DatabaseUtils {
  // Generic query method with error handling
  static async query(text, params = []) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    }
  }

  // Get single record
  static async findOne(table, conditions = {}, columns = '*') {
    const whereClause = Object.keys(conditions).length > 0 
      ? 'WHERE ' + Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : '';
    
    const query = `SELECT ${columns} FROM ${table} ${whereClause} LIMIT 1`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return result.rows[0] || null;
  }

  // Get multiple records
  static async findMany(table, conditions = {}, options = {}) {
    const { columns = '*', orderBy = '', limit = '', offset = '' } = options;
    
    const whereClause = Object.keys(conditions).length > 0 
      ? 'WHERE ' + Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : '';
    
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const offsetClause = offset ? `OFFSET ${offset}` : '';
    
    const query = `SELECT ${columns} FROM ${table} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return result.rows;
  }

  // Insert record
  static async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Update record
  static async update(table, data, conditions) {
    const setClause = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${index + Object.keys(data).length + 1}`).join(' AND ');
    
    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const values = [...Object.values(data), ...Object.values(conditions)];
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Delete record
  static async delete(table, conditions) {
    const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Count records
  static async count(table, conditions = {}) {
    const whereClause = Object.keys(conditions).length > 0 
      ? 'WHERE ' + Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : '';
    
    const query = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return parseInt(result.rows[0].count);
  }

  // Check if record exists
  static async exists(table, conditions) {
    const count = await this.count(table, conditions);
    return count > 0;
  }

  // Transaction wrapper
  static async transaction(callback) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default DatabaseUtils;