import User from './User.js';
import Note from './Note.js';
import Todo from './Todo.js';

// Define associations
User.hasMany(Note, {
  foreignKey: 'userId',
  as: 'notes',
  onDelete: 'CASCADE'
});

Note.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Todo, {
  foreignKey: 'userId',
  as: 'todos',
  onDelete: 'CASCADE'
});

Todo.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

export { User, Note, Todo };