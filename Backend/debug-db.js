// Debug script to check database connection and table structure

import sequelize, { connectDB } from './config/database.js';
import { User, Note, Todo } from './models/index.js';

const debugDatabase = async () => {
  console.log('🔍 Debugging Database Connection and Data Storage...\n');
  
  try {
    // 1. Test database connection
    console.log('1️⃣ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // 2. Check if tables exist
    console.log('2️⃣ Checking database tables...');
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log('📊 Existing tables:', tables.map(t => Object.values(t)[0]));
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found! Creating tables...');
      await sequelize.sync({ force: true });
      console.log('✅ Tables created');
    }
    console.log('');
    
    // 3. Check table structures
    console.log('3️⃣ Checking table structures...');
    for (const tableName of ['users', 'notes', 'todos']) {
      try {
        const [columns] = await sequelize.query(`DESCRIBE ${tableName}`);
        console.log(`📋 ${tableName} table structure:`, columns.length, 'columns');
      } catch (error) {
        console.log(`❌ ${tableName} table not found:`, error.message);
      }
    }
    console.log('');
    
    // 4. Test data insertion
    console.log('4️⃣ Testing data insertion...');
    
    // Test user creation
    console.log('👤 Creating test user...');
    const testUser = await User.create({
      name: 'Debug Test User',
      email: 'debug@test.com',
      username: 'debuguser',
      password: 'password123'
    });
    console.log('✅ Test user created with ID:', testUser.id);
    
    // Test note creation
    console.log('📝 Creating test note...');
    const testNote = await Note.create({
      title: 'Debug Test Note',
      text: 'This is a test note to verify database storage',
      userId: testUser.id,
      tags: ['debug', 'test'],
      isPinned: false,
      isArchived: false
    });
    console.log('✅ Test note created with ID:', testNote.id);
    
    // Test todo creation
    console.log('✅ Creating test todo...');
    const testTodo = await Todo.create({
      text: 'Debug database storage',
      userId: testUser.id,
      priority: 'high',
      completed: false
    });
    console.log('✅ Test todo created with ID:', testTodo.id);
    
    console.log('');
    
    // 5. Verify data was stored
    console.log('5️⃣ Verifying data storage...');
    
    const userCount = await User.count();
    const noteCount = await Note.count();
    const todoCount = await Todo.count();
    
    console.log('📊 Data counts:');
    console.log('  Users:', userCount);
    console.log('  Notes:', noteCount);
    console.log('  Todos:', todoCount);
    
    // 6. Test data retrieval
    console.log('\n6️⃣ Testing data retrieval...');
    
    const retrievedUser = await User.findByPk(testUser.id);
    const retrievedNote = await Note.findByPk(testNote.id);
    const retrievedTodo = await Todo.findByPk(testTodo.id);
    
    console.log('👤 Retrieved user:', retrievedUser ? 'SUCCESS' : 'FAILED');
    console.log('📝 Retrieved note:', retrievedNote ? 'SUCCESS' : 'FAILED');
    console.log('✅ Retrieved todo:', retrievedTodo ? 'SUCCESS' : 'FAILED');
    
    // 7. Test relationships
    console.log('\n7️⃣ Testing relationships...');
    
    const userWithData = await User.findByPk(testUser.id, {
      include: [
        { model: Note, as: 'notes' },
        { model: Todo, as: 'todos' }
      ]
    });
    
    console.log('🔗 User with relationships:');
    console.log('  Notes count:', userWithData?.notes?.length || 0);
    console.log('  Todos count:', userWithData?.todos?.length || 0);
    
    // 8. Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...');
    await Note.destroy({ where: { id: testNote.id } });
    await Todo.destroy({ where: { id: testTodo.id } });
    await User.destroy({ where: { id: testUser.id } });
    console.log('🗑️ Test data cleaned up');
    
    console.log('\n✅ DATABASE DEBUG COMPLETED SUCCESSFULLY! 🎉');
    console.log('✅ Database is working properly and can store/retrieve data');
    
  } catch (error) {
    console.error('\n❌ DATABASE DEBUG FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Common issues and solutions
    console.log('\n🔧 COMMON SOLUTIONS:');
    console.log('1. Check if MySQL server is running');
    console.log('2. Verify database credentials in .env file');
    console.log('3. Ensure database "micronote" exists');
    console.log('4. Check if tables have proper permissions');
    console.log('5. Try running: DROP DATABASE micronote; CREATE DATABASE micronote;');
  } finally {
    await sequelize.close();
  }
};

// Run debug if file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugDatabase();
}

export { debugDatabase };