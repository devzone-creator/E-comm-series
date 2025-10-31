import DatabaseUtils from '../config/db-utils.js';
import { pool } from '../config/database.js';

class CategoryService {
  // Get all categories with hierarchy
  static async getAllCategories(includeInactive = false) {
    try {
      let whereClause = '';
      const queryParams = [];

      if (!includeInactive) {
        whereClause = 'WHERE is_active = true';
      }

      const query = `
        SELECT 
          c.*,
          COUNT(p.id) as product_count,
          COUNT(CASE WHEN p.is_active = true THEN 1 END) as active_product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.name ASC
      `;

      const result = await pool.query(query, queryParams);

      return {
        success: true,
        categories: result.rows
      };
    } catch (error) {
      console.error('Get categories error:', error.message);
      throw new Error('Failed to fetch categories');
    }
  }

  // Create new category
  static async createCategory(categoryData) {
    try {
      const {
        name,
        description,
        parentId = null,
        sortOrder = 0,
        isActive = true
      } = categoryData;

      // Validate required fields
      if (!name || name.trim().length === 0) {
        throw new Error('Category name is required');
      }

      // Check if category name already exists
      const existingCategory = await DatabaseUtils.findOne('categories', { 
        name: name.trim() 
      });
      if (existingCategory) {
        throw new Error('Category name already exists');
      }

      // Generate slug from name
      const slug = this.generateSlug(name);

      const newCategory = await DatabaseUtils.insert('categories', {
        name: name.trim(),
        description: description ? description.trim() : null,
        slug,
        parent_id: parentId,
        sort_order: parseInt(sortOrder) || 0,
        is_active: isActive
      });

      return {
        success: true,
        category: newCategory,
        message: 'Category created successfully'
      };
    } catch (error) {
      console.error('Create category error:', error.message);
      throw new Error(error.message || 'Failed to create category');
    }
  }

  // Update category
  static async updateCategory(categoryId, updateData) {
    try {
      const existingCategory = await DatabaseUtils.findOne('categories', { id: categoryId });
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      const updateFields = {};
      if (updateData.name !== undefined) updateFields.name = updateData.name.trim();
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;

      const updatedCategory = await DatabaseUtils.update('categories', updateFields, { id: categoryId });

      return {
        success: true,
        category: updatedCategory,
        message: 'Category updated successfully'
      };
    } catch (error) {
      console.error('Update category error:', error.message);
      throw new Error(error.message || 'Failed to update category');
    }
  }

  // Delete category (soft delete)
  static async deleteCategory(categoryId) {
    try {
      const existingCategory = await DatabaseUtils.findOne('categories', { id: categoryId });
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      await DatabaseUtils.update('categories', { is_active: false }, { id: categoryId });

      return {
        success: true,
        message: 'Category deleted successfully'
      };
    } catch (error) {
      console.error('Delete category error:', error.message);
      throw new Error(error.message || 'Failed to delete category');
    }
  }

  // Helper method to generate slug from name
  static generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export default CategoryService;