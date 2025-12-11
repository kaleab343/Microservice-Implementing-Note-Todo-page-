// Examples of MySQL Read/Write operations using your existing Sequelize setup

import { User, Note, Todo } from '../models/index.js';

// ========================================
// USER OPERATIONS
// ========================================

// CREATE a new user
export const createUser = async () => {
  try {
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password: 'password123'
    });
    console.log('User created:', newUser.toJSON());
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error.message);
  }
};

// READ users
export const getUsers = async () => {
  try {
    // Get all users
    const users = await User.findAll();
    console.log('All users:', users.map(u => u.toJSON()));

    // Get user by ID
    const user = await User.findByPk(1);
    console.log('User by ID:', user?.toJSON());

    // Get user by email
    const userByEmail = await User.findOne({
      where: { email: 'john@example.com' }
    });
    console.log('User by email:', userByEmail?.toJSON());

    return users;
  } catch (error) {
    console.error('Error reading users:', error.message);
  }
};

// UPDATE user
export const updateUser = async (userId, updateData) => {
  try {
    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: userId }
    });
    
    if (updatedRowsCount > 0) {
      const updatedUser = await User.findByPk(userId);
      console.log('User updated:', updatedUser.toJSON());
      return updatedUser;
    }
  } catch (error) {
    console.error('Error updating user:', error.message);
  }
};

// DELETE user
export const deleteUser = async (userId) => {
  try {
    const deletedRowsCount = await User.destroy({
      where: { id: userId }
    });
    console.log(`Deleted ${deletedRowsCount} user(s)`);
    return deletedRowsCount;
  } catch (error) {
    console.error('Error deleting user:', error.message);
  }
};

// ========================================
// NOTE OPERATIONS
// ========================================

// CREATE a note
export const createNote = async (userId) => {
  try {
    const newNote = await Note.create({
      title: 'My First Note',
      text: 'This is the content of my note',
      userId: userId,
      tags: ['important', 'work'],
      isPinned: false,
      isArchived: false
    });
    console.log('Note created:', newNote.toJSON());
    return newNote;
  } catch (error) {
    console.error('Error creating note:', error.message);
  }
};

// READ notes
export const getNotes = async (userId) => {
  try {
    // Get all notes for a user
    const notes = await Note.findAll({
      where: { userId },
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']]
    });
    console.log('User notes:', notes.map(n => n.toJSON()));

    // Get notes with user info
    const notesWithUser = await Note.findAll({
      where: { userId },
      include: [{ model: User, as: 'user' }]
    });
    console.log('Notes with user:', notesWithUser.map(n => n.toJSON()));

    return notes;
  } catch (error) {
    console.error('Error reading notes:', error.message);
  }
};

// SEARCH notes
export const searchNotes = async (userId, searchTerm) => {
  try {
    const notes = await Note.findAll({
      where: {
        userId,
        [Op.or]: [
          { title: { [Op.like]: `%${searchTerm}%` } },
          { text: { [Op.like]: `%${searchTerm}%` } }
        ]
      }
    });
    console.log('Search results:', notes.map(n => n.toJSON()));
    return notes;
  } catch (error) {
    console.error('Error searching notes:', error.message);
  }
};

// ========================================
// TODO OPERATIONS
// ========================================

// CREATE a todo
export const createTodo = async (userId) => {
  try {
    const newTodo = await Todo.create({
      text: 'Complete project documentation',
      userId: userId,
      priority: 'high',
      dueDate: new Date('2024-12-31'),
      category: 'work',
      completed: false
    });
    console.log('Todo created:', newTodo.toJSON());
    return newTodo;
  } catch (error) {
    console.error('Error creating todo:', error.message);
  }
};

// READ todos
export const getTodos = async (userId) => {
  try {
    // Get all todos for user
    const todos = await Todo.findAll({
      where: { userId },
      order: [['completed', 'ASC'], ['createdAt', 'DESC']]
    });

    // Get pending todos only
    const pendingTodos = await Todo.findAll({
      where: { userId, completed: false }
    });

    // Get todos by priority
    const highPriorityTodos = await Todo.findAll({
      where: { userId, priority: 'high' }
    });

    console.log('All todos:', todos.map(t => t.toJSON()));
    console.log('Pending todos:', pendingTodos.length);
    console.log('High priority todos:', highPriorityTodos.length);

    return todos;
  } catch (error) {
    console.error('Error reading todos:', error.message);
  }
};

// TOGGLE todo completion
export const toggleTodo = async (todoId) => {
  try {
    const todo = await Todo.findByPk(todoId);
    if (todo) {
      todo.completed = !todo.completed;
      await todo.save(); // This will trigger the beforeSave hook to set completedAt
      console.log('Todo toggled:', todo.toJSON());
      return todo;
    }
  } catch (error) {
    console.error('Error toggling todo:', error.message);
  }
};

// ========================================
// COMPLEX QUERIES
// ========================================

// Get user with their notes and todos
export const getUserWithData = async (userId) => {
  try {
    const userWithData = await User.findByPk(userId, {
      include: [
        { model: Note, as: 'notes' },
        { model: Todo, as: 'todos' }
      ]
    });
    console.log('User with data:', userWithData?.toJSON());
    return userWithData;
  } catch (error) {
    console.error('Error getting user with data:', error.message);
  }
};

// Get statistics
export const getStats = async (userId) => {
  try {
    const stats = await Promise.all([
      Note.count({ where: { userId } }),
      Todo.count({ where: { userId } }),
      Todo.count({ where: { userId, completed: true } }),
      Todo.count({ where: { userId, completed: false } })
    ]);

    const [notesCount, todosCount, completedTodos, pendingTodos] = stats;

    console.log('User Statistics:', {
      notes: notesCount,
      todos: todosCount,
      completedTodos,
      pendingTodos,
      completionRate: todosCount > 0 ? (completedTodos / todosCount * 100).toFixed(1) + '%' : '0%'
    });

    return { notesCount, todosCount, completedTodos, pendingTodos };
  } catch (error) {
    console.error('Error getting stats:', error.message);
  }
};

// ========================================
// EXAMPLE USAGE
// ========================================
export const runExamples = async () => {
  console.log('🚀 Running MySQL Read/Write Examples...');
  
  // Create user
  const user = await createUser();
  if (!user) return;

  // Create some data
  await createNote(user.id);
  await createTodo(user.id);

  // Read data
  await getUsers();
  await getNotes(user.id);
  await getTodos(user.id);

  // Get user with all data
  await getUserWithData(user.id);

  // Get statistics
  await getStats(user.id);

  console.log('✅ Examples completed!');
};