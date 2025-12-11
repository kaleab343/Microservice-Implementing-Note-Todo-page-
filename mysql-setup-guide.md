# 🗄️ MySQL Setup Guide for MicroNote

## 🚀 Quick Start Options

### Option 1: Install MySQL Locally (Recommended)

#### **Step 1: Download MySQL**
1. Go to: https://dev.mysql.com/downloads/mysql/
2. Download **MySQL Community Server** for Windows
3. Choose **MySQL Installer** for easier setup

#### **Step 2: Install MySQL**
1. Run the installer
2. Choose **Developer Default** setup
3. Set root password (remember this!)
4. Complete the installation

#### **Step 3: Start MySQL Service**
```powershell
# Start MySQL service
net start MySQL80

# Or use MySQL Workbench GUI
```

#### **Step 4: Create Database**
```powershell
# Connect to MySQL
mysql -u root -p

# Run setup script
mysql -u root -p < DB/setup.sql
```

### Option 2: Use XAMPP (All-in-one)

#### **Step 1: Download XAMPP**
1. Go to: https://www.apachefriends.org/
2. Download XAMPP for Windows
3. Install XAMPP

#### **Step 2: Start Services**
1. Open XAMPP Control Panel
2. Start **Apache** and **MySQL** services

#### **Step 3: Create Database**
1. Open http://localhost/phpmyadmin
2. Create database named `micronote`

### Option 3: Cloud MySQL (Free Options)

#### **PlanetScale (Recommended)**
1. Go to: https://planetscale.com/
2. Sign up for free account
3. Create database
4. Get connection string

#### **Railway**
1. Go to: https://railway.app/
2. Sign up and create MySQL database
3. Get connection string

## 📝 Update Environment Variables

Edit `Backend/.env`:

```env
# For Local MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=micronote
DB_USER=root
DB_PASSWORD=your_mysql_password

# For Cloud MySQL (PlanetScale/Railway)
# DB_HOST=your_cloud_host
# DB_PORT=3306
# DB_NAME=your_db_name
# DB_USER=your_username
# DB_PASSWORD=your_password
```

## 🚀 Start the Application

### **Option A: Use Startup Script**
```bash
# Double-click or run:
start-micronote.bat
```

### **Option B: Manual Start**
```bash
# Terminal 1 - Backend
cd Backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🔍 Test Everything

Once running, check:
- ✅ Frontend: http://localhost:5173
- ✅ Backend: http://localhost:5000/api/health
- ✅ Database: Should show "MySQL connected successfully"

## 🛠️ Troubleshooting

### **MySQL Connection Failed**
```bash
# Check if MySQL is running
net start MySQL80

# Test connection
mysql -u root -p

# Check port
netstat -an | findstr :3306
```

### **Access Denied Error**
- Check username/password in `.env`
- Make sure MySQL user has proper permissions

### **Database Not Found**
- Run the setup script: `mysql -u root -p < DB/setup.sql`
- Or create manually: `CREATE DATABASE micronote;`

## 📊 Database Schema

The following tables will be created automatically:

### **users**
- id (PRIMARY KEY)
- name
- email (UNIQUE)
- username (UNIQUE)
- password (hashed)
- created_at, updated_at

### **notes**
- id (PRIMARY KEY)
- title
- text
- user_id (FOREIGN KEY)
- tags (JSON)
- is_pinned
- is_archived
- created_at, updated_at

### **todos**
- id (PRIMARY KEY)
- text
- completed
- user_id (FOREIGN KEY)
- priority (enum)
- due_date
- category
- completed_at
- created_at, updated_at

## 🎉 You're Ready!

Your MicroNote app now uses MySQL instead of MongoDB. All the features work exactly the same:
- User authentication
- Notes management
- Todos tracking
- Real-time updates