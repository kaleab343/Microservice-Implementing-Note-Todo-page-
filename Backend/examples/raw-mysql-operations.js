// Examples of MySQL Read/Write operations using raw SQL queries

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create MySQL connection
const createConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'micronote'
    });
    console.log('✅ Raw MySQL connection established');
    return connection;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    throw error;
  }
};

// ========================================
// USER OPERATIONS (Raw SQL)
// ========================================

// CREATE user
export const createUserRaw = async (userData) => {
  const connection = await createConnection();
  try {
    const { name, email, username, password } = userData;
    
    const query = `
      INSERT INTO users (name, email, username, password, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await connection.execute(query, [name, email, username, password]);
    console.log('User created with ID:', result.insertId);
    
    return { id: result.insertId, ...userData };
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// READ users
export const getUsersRaw = async () => {
  const connection = await createConnection();
  try {
    // Get all users
    const [users] = await connection.execute(`
      SELECT id, name, email, username, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('All users:', users);
    return users;
  } catch (error) {
    console.error('Error reading users:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// READ user by ID
export const getUserByIdRaw = async (userId) => {
  const connection = await createConnection();
  try {
    const [users] = await connection.execute(`
      SELECT id, name, email, username, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    console.log('User by ID:', users[0]);
    return users[0];
  } catch (error) {
    console.error('Error reading user by ID:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// UPDATE user
export const updateUserRaw = async (userId, updateData) => {
  const connection = await createConnection();
  try {
    const { name, email } = updateData;
    
    const [result] = await connection.execute(`
      UPDATE users 
      SET name = ?, email = ?, updated_at = NOW() 
      WHERE id = ?
    `, [name, email, userId]);
    
    console.log('Updated rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// DELETE user
export const deleteUserRaw = async (userId) => {
  const connection = await createConnection();
  try {
    const [result] = await connection.execute(`
      DELETE FROM users WHERE id = ?
    `, [userId]);
    
    console.log('Deleted rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting user:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// ========================================
// NOTE OPERATIONS (Raw SQL)
// ========================================

// CREATE note
export const createNoteRaw = async (noteData) => {
  const connection = await createConnection();
  try {
    const { title, text, user_id, tags, is_pinned = false, is_archived = false } = noteData;
    
    const [result] = await connection.execute(`
      INSERT INTO notes (title, text, user_id, tags, is_pinned, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [title, text, user_id, JSON.stringify(tags), is_pinned, is_archived]);
    
    console.log('Note created with ID:', result.insertId);
    return { id: result.insertId, ...noteData };
  } catch (error) {
    console.error('Error creating note:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// READ notes for user
export const getNotesRaw = async (userId) => {
  const connection = await createConnection();
  try {
    const [notes] = await connection.execute(`
      SELECT 
        id, title, text, user_id, tags, is_pinned, is_archived, 
        created_at, updated_at
      FROM notes 
      WHERE user_id = ? 
      ORDER BY is_pinned DESC, created_at DESC
    `, [userId]);
    
    // Parse JSON tags
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    }));
    
    console.log('User notes:', parsedNotes);
    return parsedNotes;
  } catch (error) {
    console.error('Error reading notes:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// SEARCH notes
export const searchNotesRaw = async (userId, searchTerm) => {
  const connection = await createConnection();
  try {
    const [notes] = await connection.execute(`
      SELECT 
        id, title, text, user_id, tags, is_pinned, is_archived, 
        created_at, updated_at
      FROM notes 
      WHERE user_id = ? 
        AND (title LIKE ? OR text LIKE ?)
      ORDER BY is_pinned DESC, created_at DESC
    `, [userId, `%${searchTerm}%`, `%${searchTerm}%`]);
    
    console.log('Search results:', notes);
    return notes;
  } catch (error) {
    console.error('Error searching notes:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// ========================================
// TODO OPERATIONS (Raw SQL)
// ========================================

// CREATE todo
export const createTodoRaw = async (todoData) => {
  const connection = await createConnection();
  try {
    const { text, user_id, priority = 'medium', due_date, category, completed = false } = todoData;
    
    const [result] = await connection.execute(`
      INSERT INTO todos (text, user_id, priority, due_date, category, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [text, user_id, priority, due_date, category, completed]);
    
    console.log('Todo created with ID:', result.insertId);
    return { id: result.insertId, ...todoData };
  } catch (error) {
    console.error('Error creating todo:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// READ todos for user
export const getTodosRaw = async (userId) => {
  const connection = await createConnection();
  try {
    const [todos] = await connection.execute(`
      SELECT 
        id, text, user_id, priority, due_date, category, 
        completed, completed_at, created_at, updated_at
      FROM todos 
      WHERE user_id = ? 
      ORDER BY completed ASC, created_at DESC
    `, [userId]);
    
    console.log('User todos:', todos);
    return todos;
  } catch (error) {
    console.error('Error reading todos:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// TOGGLE todo completion
export const toggleTodoRaw = async (todoId) => {
  const connection = await createConnection();
  try {
    // First get current status
    const [todos] = await connection.execute(`
      SELECT completed FROM todos WHERE id = ?
    `, [todoId]);
    
    if (todos.length === 0) {
      throw new Error('Todo not found');
    }
    
    const newStatus = !todos[0].completed;
    const completedAt = newStatus ? 'NOW()' : 'NULL';
    
    const [result] = await connection.execute(`
      UPDATE todos 
      SET completed = ?, completed_at = ${completedAt}, updated_at = NOW() 
      WHERE id = ?
    `, [newStatus, todoId]);
    
    console.log('Todo toggled:', { id: todoId, completed: newStatus });
    return { id: todoId, completed: newStatus };
  } catch (error) {
    console.error('Error toggling todo:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// ========================================
// COMPLEX QUERIES
// ========================================

// Get user with their notes and todos count
export const getUserStatsRaw = async (userId) => {
  const connection = await createConnection();
  try {
    const [stats] = await connection.execute(`
      SELECT 
        u.id, u.name, u.email, u.username,
        COUNT(DISTINCT n.id) as notes_count,
        COUNT(DISTINCT t.id) as todos_count,
        COUNT(DISTINCT CASE WHEN t.completed = 1 THEN t.id END) as completed_todos,
        COUNT(DISTINCT CASE WHEN t.completed = 0 THEN t.id END) as pending_todos
      FROM users u
      LEFT JOIN notes n ON u.id = n.user_id
      LEFT JOIN todos t ON u.id = t.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);
    
    console.log('User stats:', stats[0]);
    return stats[0];
  } catch (error) {
    console.error('Error getting user stats:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// Get recent activity
export const getRecentActivityRaw = async (userId, limit = 10) => {
  const connection = await createConnection();
  try {
    const [activity] = await connection.execute(`
      (SELECT 'note' as type, id, title as content, created_at 
       FROM notes WHERE user_id = ?)
      UNION ALL
      (SELECT 'todo' as type, id, text as content, created_at 
       FROM todos WHERE user_id = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, userId, limit]);
    
    console.log('Recent activity:', activity);
    return activity;
  } catch (error) {
    console.error('Error getting recent activity:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// ========================================
// CONNECTION POOL (Better for Production)
// ========================================

// Create connection pool for better performance
export const createPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'micronote',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};

// Example using connection pool
export const queryWithPool = async (query, params = []) => {
  const pool = createPool();
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

// ========================================
// EXAMPLE USAGE
// ========================================
export const runRawSQLExamples = async () => {
  console.log('🚀 Running Raw MySQL Examples...');
  
  try {
    // Create user
    const user = await createUserRaw({
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      password: 'hashed_password_here'
    });

    // Create note
    await createNoteRaw({
      title: 'Raw SQL Note',
      text: 'This note was created using raw SQL',
      user_id: user.id,
      tags: ['sql', 'example'],
      is_pinned: true
    });

    // Create todo
    await createTodoRaw({
      text: 'Learn raw SQL operations',
      user_id: user.id,
      priority: 'high',
      due_date: '2024-12-31',
      category: 'learning'
    });

    // Read data
    await getUsersRaw();
    await getNotesRaw(user.id);
    await getTodosRaw(user.id);

    // Get statistics
    await getUserStatsRaw(user.id);

    console.log('✅ Raw SQL examples completed!');
  } catch (error) {
    console.error('❌ Example failed:', error.message);
  }
};