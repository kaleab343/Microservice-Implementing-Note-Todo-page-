import express from 'express';
import { body, validationResult } from 'express-validator';
import mysql from 'mysql2/promise';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create MySQL connection
const createConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'micronote'
  });
};

// @route   GET /api/todos
// @desc    Get all todos for authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const { page = 1, limit = 50, completed, priority, category } = req.query;
    
    let query = 'SELECT * FROM todos WHERE user_id = ?';
    const params = [req.user.id];
    
    if (completed !== undefined) {
      query += ' AND completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }
    
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY completed ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const [todos] = await connection.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM todos WHERE user_id = ?';
    const countParams = [req.user.id];
    
    if (completed !== undefined) {
      countQuery += ' AND completed = ?';
      countParams.push(completed === 'true' ? 1 : 0);
    }
    
    if (priority) {
      countQuery += ' AND priority = ?';
      countParams.push(priority);
    }
    
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Get stats
    const [statsResult] = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending
       FROM todos WHERE user_id = ?`,
      [req.user.id]
    );
    
    const parsedTodos = todos.map(todo => ({
      ...todo,
      completed: Boolean(todo.completed)
    }));
    
    res.json({
      success: true,
      data: {
        todos: parsedTodos,
        stats: statsResult[0] || { total: 0, completed: 0, pending: 0 },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching todos'
    });
  } finally {
    await connection.end();
  }
});

// @route   GET /api/todos/:id
// @desc    Get a specific todo
// @access  Private
router.get('/:id', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const [todos] = await connection.execute(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (todos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    const todo = {
      ...todos[0],
      completed: Boolean(todos[0].completed)
    };
    
    res.json({
      success: true,
      data: { todo }
    });
  } catch (error) {
    console.error('Get todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching todo'
    });
  } finally {
    await connection.end();
  }
});

// @route   POST /api/todos
// @desc    Create a new todo
// @access  Private
router.post('/', auth, [
  body('text').trim().isLength({ min: 1, max: 200 }).withMessage('Todo text is required and must be less than 200 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('category').optional().trim().isLength({ max: 30 }).withMessage('Category must be less than 30 characters'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date')
], async (req, res) => {
  const connection = await createConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { text, priority = 'medium', category, dueDate } = req.body;

    const [result] = await connection.execute(
      'INSERT INTO todos (text, user_id, priority, category, due_date, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [text, req.user.id, priority, category || null, dueDate || null, 0]
    );

    const [todos] = await connection.execute(
      'SELECT * FROM todos WHERE id = ?',
      [result.insertId]
    );

    const todo = {
      ...todos[0],
      completed: Boolean(todos[0].completed)
    };

    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: { todo }
    });
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating todo'
    });
  } finally {
    await connection.end();
  }
});

// @route   PUT /api/todos/:id
// @desc    Update a todo
// @access  Private
router.put('/:id', auth, [
  body('text').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Todo text must be less than 200 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('category').optional().trim().isLength({ max: 30 }).withMessage('Category must be less than 30 characters'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date'),
  body('completed').optional().isBoolean().withMessage('Completed must be a boolean')
], async (req, res) => {
  const connection = await createConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if todo exists and belongs to user
    const [existingTodos] = await connection.execute(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existingTodos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const updates = [];
    const values = [];

    if (req.body.text !== undefined) {
      updates.push('text = ?');
      values.push(req.body.text);
    }
    if (req.body.priority !== undefined) {
      updates.push('priority = ?');
      values.push(req.body.priority);
    }
    if (req.body.category !== undefined) {
      updates.push('category = ?');
      values.push(req.body.category);
    }
    if (req.body.dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(req.body.dueDate);
    }
    if (req.body.completed !== undefined) {
      updates.push('completed = ?');
      values.push(req.body.completed ? 1 : 0);
      
      // Update completed_at timestamp
      if (req.body.completed) {
        updates.push('completed_at = NOW()');
      } else {
        updates.push('completed_at = NULL');
      }
    }

    updates.push('updated_at = NOW()');
    values.push(req.params.id, req.user.id);

    await connection.execute(
      `UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const [todos] = await connection.execute(
      'SELECT * FROM todos WHERE id = ?',
      [req.params.id]
    );

    const todo = {
      ...todos[0],
      completed: Boolean(todos[0].completed)
    };

    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: { todo }
    });
  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating todo'
    });
  } finally {
    await connection.end();
  }
});

// @route   PATCH /api/todos/:id/toggle
// @desc    Toggle todo completion status
// @access  Private
router.patch('/:id/toggle', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const [todos] = await connection.execute(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (todos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const newCompletedStatus = !todos[0].completed;

    if (newCompletedStatus) {
      await connection.execute(
        'UPDATE todos SET completed = ?, completed_at = NOW(), updated_at = NOW() WHERE id = ?',
        [1, req.params.id]
      );
    } else {
      await connection.execute(
        'UPDATE todos SET completed = ?, completed_at = NULL, updated_at = NOW() WHERE id = ?',
        [0, req.params.id]
      );
    }

    const [updatedTodos] = await connection.execute(
      'SELECT * FROM todos WHERE id = ?',
      [req.params.id]
    );

    const todo = {
      ...updatedTodos[0],
      completed: Boolean(updatedTodos[0].completed)
    };

    res.json({
      success: true,
      message: `Todo marked as ${todo.completed ? 'completed' : 'pending'}`,
      data: { todo }
    });
  } catch (error) {
    console.error('Toggle todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling todo status'
    });
  } finally {
    await connection.end();
  }
});

// @route   DELETE /api/todos/:id
// @desc    Delete a todo
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM todos WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting todo'
    });
  } finally {
    await connection.end();
  }
});

// @route   GET /api/todos/stats/summary
// @desc    Get todo statistics
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    // General stats
    const [generalStats] = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending
       FROM todos WHERE user_id = ?`,
      [req.user.id]
    );

    // Stats by priority
    const [priorityStats] = await connection.execute(
      `SELECT 
        priority as _id,
        COUNT(*) as count,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
       FROM todos WHERE user_id = ?
       GROUP BY priority`,
      [req.user.id]
    );

    // Stats by category
    const [categoryStats] = await connection.execute(
      `SELECT 
        category as _id,
        COUNT(*) as count,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
       FROM todos WHERE user_id = ? AND category IS NOT NULL
       GROUP BY category`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        general: generalStats[0] || { total: 0, completed: 0, pending: 0 },
        byPriority: priorityStats,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    console.error('Get todo stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching todo statistics'
    });
  } finally {
    await connection.end();
  }
});

export default router;