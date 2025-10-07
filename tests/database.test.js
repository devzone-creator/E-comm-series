import DatabaseUtils from '../config/db-utils.js';
import { pool } from '../config/database.js';

describe('DatabaseUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await DatabaseUtils.query('SELECT * FROM test', []);
      
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM test', []);
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors', async () => {
      const mockError = new Error('Database error');
      pool.query.mockRejectedValue(mockError);

      await expect(DatabaseUtils.query('SELECT * FROM test')).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should find single record with conditions', async () => {
      const mockResult = { rows: [{ id: 1, email: 'test@example.com' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await DatabaseUtils.findOne('users', { email: 'test@example.com' });
      
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        ['test@example.com']
      );
      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });

    it('should return null when no record found', async () => {
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      const result = await DatabaseUtils.findOne('users', { email: 'nonexistent@example.com' });
      
      expect(result).toBeNull();
    });
  });

  describe('insert', () => {
    it('should insert record successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }] };
      pool.query.mockResolvedValue(mockResult);

      const data = { name: 'Test User', email: 'test@example.com' };
      const result = await DatabaseUtils.insert('users', data);
      
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        ['Test User', 'test@example.com']
      );
      expect(result).toEqual({ id: 1, name: 'Test User', email: 'test@example.com' });
    });
  });

  describe('update', () => {
    it('should update record successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Updated User', email: 'test@example.com' }] };
      pool.query.mockResolvedValue(mockResult);

      const data = { name: 'Updated User' };
      const conditions = { id: 1 };
      const result = await DatabaseUtils.update('users', data, conditions);
      
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
        ['Updated User', 1]
      );
      expect(result).toEqual({ id: 1, name: 'Updated User', email: 'test@example.com' });
    });
  });

  describe('delete', () => {
    it('should delete record successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Deleted User' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await DatabaseUtils.delete('users', { id: 1 });
      
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1 RETURNING *',
        [1]
      );
      expect(result).toEqual({ id: 1, name: 'Deleted User' });
    });
  });

  describe('count', () => {
    it('should count records successfully', async () => {
      const mockResult = { rows: [{ count: '5' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await DatabaseUtils.count('users', { is_active: true });
      
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users WHERE is_active = $1',
        [true]
      );
      expect(result).toBe(5);
    });
  });

  describe('exists', () => {
    it('should return true when record exists', async () => {
      const mockResult = { rows: [{ count: '1' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await DatabaseUtils.exists('users', { email: 'test@example.com' });
      
      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      const mockResult = { rows: [{ count: '0' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await DatabaseUtils.exists('users', { email: 'nonexistent@example.com' });
      
      expect(result).toBe(false);
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      
      pool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [] });

      const callback = jest.fn().mockResolvedValue('success');
      const result = await DatabaseUtils.transaction(callback);

      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      
      pool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [] });

      const callback = jest.fn().mockRejectedValue(new Error('Transaction error'));

      await expect(DatabaseUtils.transaction(callback)).rejects.toThrow('Transaction error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});