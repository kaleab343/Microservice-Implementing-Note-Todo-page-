# 🗄️ MicroNote MySQL Database Structure

## 📊 Database Overview

**Database Name:** `micronote`
**Engine:** MySQL 8.0+
**Character Set:** utf8mb4_unicode_ci

## 🗂️ Tables Structure

### 1. **users** Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_username (username)
);
```

**Fields:**
- `id`: Auto-increment primary key
- `name`: User's full name (max 50 chars)
- `email`: Unique email address (max 100 chars)
- `username`: Unique username (3-20 chars, alphanumeric + underscore)
- `password`: Hashed password (bcrypt, 255 chars)
- `created_at`: Registration timestamp
- `updated_at`: Last update timestamp

---

### 2. **notes** Table
```sql
CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    user_id INT NOT NULL,
    tags JSON DEFAULT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_user_pinned (user_id, is_pinned, created_at),
    FULLTEXT INDEX idx_search (title, text)
);
```

**Fields:**
- `id`: Auto-increment primary key
- `title`: Note title (max 100 chars)
- `text`: Note content (max 5000 chars)
- `user_id`: Foreign key to users table
- `tags`: JSON array of tags (e.g., ["work", "important"])
- `is_pinned`: Whether note is pinned to top
- `is_archived`: Whether note is archived
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

---

### 3. **todos** Table
```sql
CREATE TABLE todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(200) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    user_id INT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    due_date DATETIME DEFAULT NULL,
    category VARCHAR(30) DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_user_completed (user_id, completed, created_at),
    INDEX idx_user_due (user_id, due_date),
    INDEX idx_user_priority (user_id, priority)
);
```

**Fields:**
- `id`: Auto-increment primary key
- `text`: Todo description (max 200 chars)
- `completed`: Completion status
- `user_id`: Foreign key to users table
- `priority`: Priority level (low/medium/high)
- `due_date`: Optional due date
- `category`: Optional category (max 30 chars)
- `completed_at`: Completion timestamp (auto-set)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## 🔗 Relationships

### **One-to-Many Relationships:**
```
users (1) ←→ (∞) notes
users (1) ←→ (∞) todos
```

**Cascade Rules:**
- When a user is deleted → All their notes and todos are deleted
- When a user is updated → Foreign keys are updated automatically

## 📈 Indexes for Performance

### **Primary Indexes:**
- `users.id` (PRIMARY KEY)
- `notes.id` (PRIMARY KEY) 
- `todos.id` (PRIMARY KEY)

### **Unique Indexes:**
- `users.email` (UNIQUE)
- `users.username` (UNIQUE)

### **Foreign Key Indexes:**
- `notes.user_id` → `users.id`
- `todos.user_id` → `users.id`

### **Performance Indexes:**
- `notes(user_id, created_at)` - For user's notes chronologically
- `notes(user_id, is_pinned, created_at)` - For pinned notes first
- `todos(user_id, completed, created_at)` - For filtering completed todos
- `todos(user_id, due_date)` - For due date queries
- `todos(user_id, priority)` - For priority filtering

### **Full-Text Search:**
- `notes(title, text)` - For searching note content

## 💾 Sample Data Structure

### **User Record:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "$2a$12$...", // hashed
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### **Note Record:**
```json
{
  "id": 1,
  "title": "Meeting Notes",
  "text": "Discussed project timeline and deliverables...",
  "user_id": 1,
  "tags": ["work", "meeting", "important"],
  "is_pinned": true,
  "is_archived": false,
  "created_at": "2024-01-15T14:20:00Z",
  "updated_at": "2024-01-15T14:25:00Z"
}
```

### **Todo Record:**
```json
{
  "id": 1,
  "text": "Complete project proposal",
  "completed": false,
  "user_id": 1,
  "priority": "high",
  "due_date": "2024-01-20T17:00:00Z",
  "category": "work",
  "completed_at": null,
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-01-15T09:00:00Z"
}
```

## 🔍 Common Queries

### **Get User's Notes:**
```sql
SELECT * FROM notes 
WHERE user_id = ? 
ORDER BY is_pinned DESC, created_at DESC;
```

### **Search Notes:**
```sql
SELECT * FROM notes 
WHERE user_id = ? 
  AND MATCH(title, text) AGAINST(? IN NATURAL LANGUAGE MODE);
```

### **Get Pending Todos:**
```sql
SELECT * FROM todos 
WHERE user_id = ? AND completed = FALSE 
ORDER BY priority DESC, due_date ASC;
```

### **Todo Statistics:**
```sql
SELECT 
  COUNT(*) as total,
  SUM(completed) as completed,
  COUNT(*) - SUM(completed) as pending
FROM todos 
WHERE user_id = ?;
```

## 🛠️ Database Size Estimates

**Storage Requirements:**
- **User**: ~200 bytes per user
- **Note**: ~1-5KB per note (depending on content)
- **Todo**: ~300 bytes per todo

**For 1000 users with average usage:**
- Users: ~200KB
- Notes (10 per user): ~50MB
- Todos (50 per user): ~15MB
- **Total**: ~65MB

This structure is optimized for performance, scalability, and data integrity! 🚀