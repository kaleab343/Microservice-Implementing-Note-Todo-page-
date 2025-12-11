import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Name is required' },
      len: { args: [1, 50], msg: 'Name cannot be more than 50 characters' }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Email is required' },
      isEmail: { msg: 'Please enter a valid email' }
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  username: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Username is required' },
      len: { args: [3, 20], msg: 'Username must be 3-20 characters' },
      is: { args: /^[a-zA-Z0-9_]+$/, msg: 'Username can only contain letters, numbers, and underscores' }
    },
    set(value) {
      this.setDataValue('username', value.trim());
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Password is required' },
      len: { args: [6, 255], msg: 'Password must be at least 6 characters' }
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['username']
    }
  ]
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

export default User;