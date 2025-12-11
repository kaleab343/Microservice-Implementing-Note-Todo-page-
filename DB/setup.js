// MongoDB Database Setup Script for MicroNote
// This script sets up the database, indexes, and initial data

// Connect to MongoDB
use micronote;

// Create collections with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "username", "password"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "must be a valid email address and is required"
        },
        username: {
          bsonType: "string",
          minLength: 3,
          maxLength: 20,
          description: "must be a string between 3-20 characters and is required"
        },
        password: {
          bsonType: "string",
          minLength: 4,
          description: "must be a string and is required"
        }
      }
    }
  }
});

db.createCollection("notes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "text", "user"],
      properties: {
        title: {
          bsonType: "string",
          maxLength: 100,
          description: "must be a string and is required"
        },
        text: {
          bsonType: "string",
          maxLength: 5000,
          description: "must be a string and is required"
        },
        user: {
          bsonType: "objectId",
          description: "must be a valid ObjectId and is required"
        },
        tags: {
          bsonType: "array",
          items: {
            bsonType: "string",
            maxLength: 20
          },
          description: "must be an array of strings"
        },
        isPinned: {
          bsonType: "bool",
          description: "must be a boolean"
        },
        isArchived: {
          bsonType: "bool",
          description: "must be a boolean"
        }
      }
    }
  }
});

db.createCollection("todos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["text", "user"],
      properties: {
        text: {
          bsonType: "string",
          maxLength: 200,
          description: "must be a string and is required"
        },
        user: {
          bsonType: "objectId",
          description: "must be a valid ObjectId and is required"
        },
        completed: {
          bsonType: "bool",
          description: "must be a boolean"
        },
        priority: {
          bsonType: "string",
          enum: ["low", "medium", "high"],
          description: "must be one of: low, medium, high"
        },
        category: {
          bsonType: "string",
          maxLength: 30,
          description: "must be a string"
        }
      }
    }
  }
});

// Create indexes for better performance

// User indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });

// Note indexes
db.notes.createIndex({ "user": 1, "createdAt": -1 });
db.notes.createIndex({ "user": 1, "isPinned": -1, "createdAt": -1 });
db.notes.createIndex({ "title": "text", "text": "text" });

// Todo indexes
db.todos.createIndex({ "user": 1, "completed": 1, "createdAt": -1 });
db.todos.createIndex({ "user": 1, "priority": 1 });
db.todos.createIndex({ "user": 1, "dueDate": 1 });

print("Database setup completed successfully!");
print("Collections created: users, notes, todos");
print("Indexes created for optimal performance");
print("Validation rules applied to all collections");

// Optional: Create a demo user (uncomment if needed)
/*
db.users.insertOne({
  name: "Demo User",
  email: "demo@micronote.com",
  username: "demo",
  password: "$2a$12$demoHashedPassword", // This would be properly hashed
  createdAt: new Date(),
  updatedAt: new Date()
});

print("Demo user created!");
*/