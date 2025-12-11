// Test MySQL operations in your MicroNote application

import { connectDB } from './config/database.js';
import { User, Note, Todo } from './models/index.js';

// ========================================
// SIMPLE EXAMPLES FOR YOUR APPLICATION
// ========================================

const testMySQLOperations = async () => {
  console.log('🔧 Testing MySQL Read/Write Operations...\n');
  
  try {
    // Connect to database
    await connectDB();
    
    console.log('1️⃣ CREATING TEST USER...');
    // CREATE - Add a new user
    const newUser = await User.create({
      name: 'Test User',
      email: 'test@micronote.com',
      username: 'testuser',
      password: 'password123'
    });
    console.log('✅ User created:', {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username
    });
    
    console.log('\n2️⃣ CREATING TEST NOTE...');
    // CREATE - Add a note for the user
    const newNote = await Note.create({
      title: 'My Test Note',
      text: 'This is a test note created using Sequelize ORM',
      userId: newUser.id,
      tags: ['test', 'sequelize', 'mysql'],
      isPinned: true,
      isArchived: false
    });
    console.log('✅ Note created:', {
      id: newNote.id,
      title: newNote.title,
      tags: newNote.tags,
      isPinned: newNote.isPinned
    });
    
    console.log('\n3️⃣ CREATING TEST TODO...');
    // CREATE - Add a todo for the user
    const newTodo = await Todo.create({
      text: 'Test MySQL integration',
      userId: newUser.id,
      priority: 'high',
      dueDate: new Date('2024-12-31'),
      category: 'development',
      completed: false
    });
    console.log('✅ Todo created:', {
      id: newTodo.id,
      text: newTodo.text,
      priority: newTodo.priority,
      dueDate: newTodo.dueDate
    });
    
    console.log('\n4️⃣ READING DATA...');
    // READ - Get all users
    const allUsers = await User.findAll();
    console.log('👥 Total users in database:', allUsers.length);
    
    // READ - Get user's notes
    const userNotes = await Note.findAll({
      where: { userId: newUser.id },
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']]
    });
    console.log('📝 User notes:', userNotes.length);
    
    // READ - Get user's todos
    const userTodos = await Todo.findAll({
      where: { userId: newUser.id },
      order: [['completed', 'ASC'], ['createdAt', 'DESC']]
    });
    console.log('✅ User todos:', userTodos.length);
    
    console.log('\n5️⃣ UPDATING DATA...');
    // UPDATE - Update note
    await Note.update(
      { title: 'Updated Test Note', isPinned: false },
      { where: { id: newNote.id } }
    );
    console.log('✅ Note updated');
    
    // UPDATE - Toggle todo completion
    await Todo.update(
      { completed: true },
      { where: { id: newTodo.id } }
    );
    console.log('✅ Todo completed');
    
    console.log('\n6️⃣ ADVANCED QUERIES...');
    // SEARCH - Find notes with specific text
    const searchResults = await Note.findAll({
      where: {
        userId: newUser.id,
        text: {
          [Op.like]: '%test%'
        }
      }
    });
    console.log('🔍 Search results:', searchResults.length);
    
    // STATISTICS - Get user statistics
    const stats = await Promise.all([
      Note.count({ where: { userId: newUser.id } }),
      Todo.count({ where: { userId: newUser.id } }),
      Todo.count({ where: { userId: newUser.id, completed: true } }),
      Todo.count({ where: { userId: newUser.id, completed: false } })
    ]);
    
    const [notesCount, todosCount, completedTodos, pendingTodos] = stats;
    console.log('📊 User Statistics:', {
      notes: notesCount,
      todos: todosCount,
      completed: completedTodos,
      pending: pendingTodos
    });
    
    console.log('\n7️⃣ RELATIONSHIPS...');
    // RELATIONSHIPS - Get user with all their data
    const userWithData = await User.findByPk(newUser.id, {
      include: [
        { model: Note, as: 'notes' },
        { model: Todo, as: 'todos' }
      ]
    });
    console.log('👤 User with data:', {
      name: userWithData.name,
      notesCount: userWithData.notes.length,
      todosCount: userWithData.todos.length
    });
    
    console.log('\n8️⃣ CLEANUP...');
    // DELETE - Clean up test data
    await Note.destroy({ where: { userId: newUser.id } });
    await Todo.destroy({ where: { userId: newUser.id } });
    await User.destroy({ where: { id: newUser.id } });
    console.log('🗑️ Test data cleaned up');
    
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
};

// Import Op for advanced queries
import { Op } from 'sequelize';

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMySQLOperations();
}

export { testMySQLOperations };