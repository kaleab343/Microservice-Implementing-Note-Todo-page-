# MongoDB Installation Guide

## Option 1: Download from Official Website

1. **Go to**: https://www.mongodb.com/try/download/community
2. **Select**: Windows, Current version
3. **Download** the MSI installer
4. **Run installer** and follow setup wizard
5. **Choose**: "Install MongoDB as a Service"

## Option 2: Using PowerShell (Admin Required)

Open PowerShell as Administrator and run:
```powershell
# Install using winget
winget install MongoDB.Server

# Or using Chocolatey
choco install mongodb
```

## Option 3: MongoDB Atlas (Cloud - Free)

1. Visit: https://www.mongodb.com/atlas
2. Sign up for free account
3. Create a new cluster (M0 Sandbox - Free)
4. Create database user
5. Whitelist your IP address
6. Get connection string

## After Installation (Local MongoDB)

### Start MongoDB Service:
```powershell
# Start MongoDB service
net start MongoDB

# Or start manually
mongod --dbpath "C:\data\db"
```

### Create data directory:
```powershell
mkdir C:\data\db
```

### Test MongoDB:
```powershell
# Connect to MongoDB shell
mongosh
# or
mongo
```

## Update Environment Variables

For **Local MongoDB**:
```env
MONGODB_URI=mongodb://localhost:27017/micronote
```

For **MongoDB Atlas**:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/micronote?retryWrites=true&w=majority
```