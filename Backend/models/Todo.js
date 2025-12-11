import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Todo = sequelize.define('Todo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  text: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Todo text is required' },
      len: { args: [1, 200], msg: 'Todo text cannot be more than 200 characters' }
    },
    set(value) {
      this.setDataValue('text', value.trim());
    }
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
    validate: {
      isIn: { args: [['low', 'medium', 'high']], msg: 'Priority must be low, medium, or high' }
    }
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(30),
    allowNull: true,
    validate: {
      len: { args: [0, 30], msg: 'Category cannot be more than 30 characters' }
    },
    set(value) {
      this.setDataValue('category', value ? value.trim() : value);
    }
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'todos',
  timestamps: true,
  hooks: {
    beforeSave: async (todo) => {
      if (todo.changed('completed')) {
        if (todo.completed) {
          todo.completedAt = new Date();
        } else {
          todo.completedAt = null;
        }
      }
    }
  },
  indexes: [
    {
      fields: ['user_id', 'completed', 'created_at']
    },
    {
      fields: ['user_id', 'due_date']
    },
    {
      fields: ['user_id', 'priority']
    }
  ]
});

export default Todo;