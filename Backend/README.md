# MicroNote Backend API

A RESTful API backend for the MicroNote application built with Node.js, Express, and MongoDB.

## Features

- **Authentication**: User registration, login, and JWT-based authentication
- **Notes Management**: CRUD operations for notes with tagging, pinning, and archiving
- **Todos Management**: Task management with priorities, categories, and completion tracking
- **Data Validation**: Input validation using express-validator
- **Security**: Password hashing with bcrypt, JWT tokens
- **Database**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Environment Variables**: dotenv
- **CORS**: cors middleware

## Installation

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Install dependencies**:
   ```bash
   cd Backend
   npm install
   ```

2. **Environment Configuration**:
   Copy the `.env` file and update the values:
   ```bash
   # Update MongoDB URI if needed
   MONGODB_URI=mongodb://localhost:27017/micronote
   
   # Change JWT secret in production
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   ```

3. **Start MongoDB**:
   Make sure MongoDB is running on your system.

4. **Setup Database** (Optional):
   ```bash
   # Run the database setup script
   mongosh < ../DB/setup.js
   ```

5. **Start the server**:
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/demo` - Demo login

### Notes Routes (`/api/notes`)

- `GET /api/notes` - Get all notes (with pagination, search, filters)
- `GET /api/notes/:id` - Get specific note
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `PATCH /api/notes/:id/pin` - Toggle pin status

### Todos Routes (`/api/todos`)

- `GET /api/todos` - Get all todos (with filters)
- `GET /api/todos/:id` - Get specific todo
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `PATCH /api/todos/:id/toggle` - Toggle completion status
- `GET /api/todos/stats/summary` - Get todo statistics

### Health Check

- `GET /api/health` - API health check

## Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123"
}
```

### Create Note
```bash
POST /api/notes
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "My First Note",
  "text": "This is the content of my note",
  "tags": ["important", "work"],
  "isPinned": false
}
```

### Create Todo
```bash
POST /api/todos
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "text": "Complete the project",
  "priority": "high",
  "category": "work",
  "dueDate": "2024-12-31T23:59:59Z"
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (placeholder)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/micronote |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Token expiration time | 7d |
| `NODE_ENV` | Environment mode | development |

## Database Schema

### User
- `name`: String (required, max 50 chars)
- `email`: String (required, unique, valid email)
- `username`: String (required, unique, 3-20 chars)
- `password`: String (required, min 6 chars, hashed)

### Note
- `title`: String (required, max 100 chars)
- `text`: String (required, max 5000 chars)
- `user`: ObjectId (required, ref to User)
- `tags`: Array of strings (max 20 chars each)
- `isPinned`: Boolean (default false)
- `isArchived`: Boolean (default false)

### Todo
- `text`: String (required, max 200 chars)
- `user`: ObjectId (required, ref to User)
- `completed`: Boolean (default false)
- `priority`: String (enum: low, medium, high)
- `category`: String (max 30 chars)
- `dueDate`: Date
- `completedAt`: Date (auto-set when completed)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

ISC License