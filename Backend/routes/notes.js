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

// @route   GET /api/notes
// @desc    Get all notes for authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const { page = 1, limit = 20, search, archived = false, pinned } = req.query;
    
    let query = 'SELECT * FROM notes WHERE user_id = ? AND is_archived = ?';
    const params = [req.user.id, archived === 'true' ? 1 : 0];
    
    if (pinned !== undefined) {
      query += ' AND is_pinned = ?';
      params.push(pinned === 'true' ? 1 : 0);
    }
    
    if (search) {
      query += ' AND (title LIKE ? OR text LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const [notes] = await connection.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM notes WHERE user_id = ? AND is_archived = ?';
    const countParams = [req.user.id, archived === 'true' ? 1 : 0];
    
    if (pinned !== undefined) {
      countQuery += ' AND is_pinned = ?';
      countParams.push(pinned === 'true' ? 1 : 0);
    }
    
    if (search) {
      countQuery += ' AND (title LIKE ? OR text LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Parse JSON tags for each note
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : [],
      isPinned: Boolean(note.is_pinned),
      isArchived: Boolean(note.is_archived)
    }));
    
    res.json({
      success: true,
      data: {
        notes: parsedNotes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notes'
    });
  } finally {
    await connection.end();
  }
});

// @route   GET /api/notes/:id
// @desc    Get a specific note
// @access  Private
router.get('/:id', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const [notes] = await connection.execute(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (notes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    const note = {
      ...notes[0],
      tags: notes[0].tags ? JSON.parse(notes[0].tags) : [],
      isPinned: Boolean(notes[0].is_pinned),
      isArchived: Boolean(notes[0].is_archived)
    };
    
    res.json({
      success: true,
      data: { note }
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching note'
    });
  } finally {
    await connection.end();
  }
});

// @route   POST /api/notes
// @desc    Create a new note
// @access  Private
router.post('/', auth, [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
  body('text').trim().isLength({ min: 1, max: 5000 }).withMessage('Content is required and must be less than 5000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isLength({ max: 20 }).withMessage('Each tag must be less than 20 characters')
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

    const { title, text, tags = [], isPinned = false } = req.body;

    const [result] = await connection.execute(
      'INSERT INTO notes (title, text, user_id, tags, is_pinned, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [title, text, req.user.id, JSON.stringify(tags), isPinned ? 1 : 0, 0]
    );

    const [notes] = await connection.execute(
      'SELECT * FROM notes WHERE id = ?',
      [result.insertId]
    );

    const note = {
      ...notes[0],
      tags: notes[0].tags ? JSON.parse(notes[0].tags) : [],
      isPinned: Boolean(notes[0].is_pinned),
      isArchived: Boolean(notes[0].is_archived)
    };

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating note'
    });
  } finally {
    await connection.end();
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a note
// @access  Private
router.put('/:id', auth, [
  body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be less than 100 characters'),
  body('text').optional().trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be less than 5000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isLength({ max: 20 }).withMessage('Each tag must be less than 20 characters')
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

    // Check if note exists and belongs to user
    const [existingNotes] = await connection.execute(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existingNotes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const updates = [];
    const values = [];

    if (req.body.title !== undefined) {
      updates.push('title = ?');
      values.push(req.body.title);
    }
    if (req.body.text !== undefined) {
      updates.push('text = ?');
      values.push(req.body.text);
    }
    if (req.body.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(req.body.tags));
    }
    if (req.body.isPinned !== undefined) {
      updates.push('is_pinned = ?');
      values.push(req.body.isPinned ? 1 : 0);
    }
    if (req.body.isArchived !== undefined) {
      updates.push('is_archived = ?');
      values.push(req.body.isArchived ? 1 : 0);
    }

    updates.push('updated_at = NOW()');
    values.push(req.params.id, req.user.id);

    await connection.execute(
      `UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const [notes] = await connection.execute(
      'SELECT * FROM notes WHERE id = ?',
      [req.params.id]
    );

    const note = {
      ...notes[0],
      tags: notes[0].tags ? JSON.parse(notes[0].tags) : [],
      isPinned: Boolean(notes[0].is_pinned),
      isArchived: Boolean(notes[0].is_archived)
    };

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note }
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating note'
    });
  } finally {
    await connection.end();
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting note'
    });
  } finally {
    await connection.end();
  }
});

// @route   PATCH /api/notes/:id/pin
// @desc    Toggle pin status of a note
// @access  Private
router.patch('/:id/pin', auth, async (req, res) => {
  const connection = await createConnection();
  try {
    const [notes] = await connection.execute(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (notes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const newPinnedStatus = !notes[0].is_pinned;

    await connection.execute(
      'UPDATE notes SET is_pinned = ?, updated_at = NOW() WHERE id = ?',
      [newPinnedStatus ? 1 : 0, req.params.id]
    );

    const [updatedNotes] = await connection.execute(
      'SELECT * FROM notes WHERE id = ?',
      [req.params.id]
    );

    const note = {
      ...updatedNotes[0],
      tags: updatedNotes[0].tags ? JSON.parse(updatedNotes[0].tags) : [],
      isPinned: Boolean(updatedNotes[0].is_pinned),
      isArchived: Boolean(updatedNotes[0].is_archived)
    };

    res.json({
      success: true,
      message: `Note ${note.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: { note }
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling pin status'
    });
  } finally {
    await connection.end();
  }
});

export default router;