import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Note title is required' },
      len: { args: [1, 100], msg: 'Title cannot be more than 100 characters' }
    },
    set(value) {
      this.setDataValue('title', value.trim());
    }
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Note content is required' },
      len: { args: [1, 5000], msg: 'Note content cannot be more than 5000 characters' }
    }
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
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidTags(value) {
        if (Array.isArray(value)) {
          for (let tag of value) {
            if (typeof tag !== 'string' || tag.length > 20) {
              throw new Error('Each tag must be a string with max 20 characters');
            }
          }
        } else if (value !== null) {
          throw new Error('Tags must be an array');
        }
      }
    }
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'notes',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['user_id', 'is_pinned', 'created_at']
    },
    {
      type: 'FULLTEXT',
      fields: ['title', 'text']
    }
  ]
});

export default Note;