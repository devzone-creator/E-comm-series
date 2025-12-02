import prisma from './database.js';

function escapeParam(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSQL(text, params = []) {
  let sql = text;
  params.forEach((p, i) => {
    const placeholder = `$${i + 1}`;
    sql = sql.split(placeholder).join(escapeParam(p));
  });
  return sql;
}

async function withRetry(fn, retries = 2, delay = 200) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, delay * (attempt + 1)));
    }
  }
  throw lastError;
}

class DatabaseUtils {
  static async query(text, params = []) {
    return withRetry(async () => {
      try {
        const sql = buildSQL(text, params);
        const result = await prisma.$queryRawUnsafe(sql);
        return { rows: Array.isArray(result) ? result : [] };
      } catch (error) {
        console.error('Database query error:', error?.message || error);
        throw error;
      }
    });
  }

  static async findOne(table, conditions = {}, columns = '*') {
    const whereKeys = Object.keys(conditions);
    const whereClause = whereKeys.length > 0
      ? 'WHERE ' + whereKeys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
      : '';
    const sql = `SELECT ${columns} FROM ${table} ${whereClause} LIMIT 1`;
    const values = Object.values(conditions);
    const result = await this.query(sql, values);
    return result.rows[0] || null;
  }

  static async findMany(table, conditions = {}, options = {}) {
    const { columns = '*', orderBy = '', limit = '', offset = '' } = options;
    const whereKeys = Object.keys(conditions);
    const whereClause = whereKeys.length > 0
      ? 'WHERE ' + whereKeys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
      : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const offsetClause = offset ? `OFFSET ${offset}` : '';
    const sql = `SELECT ${columns} FROM ${table} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`;
    const values = Object.values(conditions);
    const result = await this.query(sql, values);
    return result.rows;
  }

  static async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const values = Object.values(data);
    const result = await this.query(sql, values);
    return result.rows[0] || null;
  }

  static async update(table, data, conditions) {
    const setKeys = Object.keys(data);
    const whereKeys = Object.keys(conditions);
    const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const whereClause = whereKeys.map((k, i) => `${k} = $${i + setKeys.length + 1}`).join(' AND ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const values = [...Object.values(data), ...Object.values(conditions)];
    const result = await this.query(sql, values);
    return result.rows[0] || null;
  }

  static async delete(table, conditions) {
    const whereKeys = Object.keys(conditions);
    const whereClause = whereKeys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
    const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    const values = Object.values(conditions);
    const result = await this.query(sql, values);
    return result.rows[0] || null;
  }

  static async count(table, conditions = {}) {
    const whereKeys = Object.keys(conditions);
    const whereClause = whereKeys.length > 0
      ? 'WHERE ' + whereKeys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
      : '';
    const sql = `SELECT COUNT(*)::int AS count FROM ${table} ${whereClause}`;
    const values = Object.values(conditions);
    const result = await this.query(sql, values);
    return (result.rows[0] && result.rows[0].count) ? parseInt(result.rows[0].count, 10) : 0;
  }

  static async exists(table, conditions) {
    const count = await this.count(table, conditions);
    return count > 0;
  }

  static async transaction(callback) {
    return prisma.$transaction(async (tx) => {
      const client = {
        query: async (text, params = []) => {
          const sql = buildSQL(text, params);
          const res = await tx.$queryRawUnsafe(sql);
          return { rows: Array.isArray(res) ? res : [] };
        }
      };
      return callback(client);
    });
  }
}

export default DatabaseUtils;
