<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ApexBank Landing Page with MongoDB Authentication

A modern banking landing page with dual authentication system for customers and bank employees/managers, powered by MongoDB.

## Features

- 🏦 **Dual Login System**: Separate authentication for customers and bank employees/managers
- 🔐 **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- 💾 **MongoDB Database**: Persistent data storage for users
- 🎨 **Modern UI**: Beautiful, responsive landing page design
- ⚡ **Fast Development**: Vite + React for lightning-fast development

## Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)

## Setup Instructions

### 1. Install MongoDB

#### Option A: Local MongoDB Installation
- Download and install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
- Start MongoDB service:
  - **Windows**: MongoDB should start automatically as a service
  - **macOS**: `brew services start mongodb-community`
  - **Linux**: `sudo systemctl start mongod`

#### Option B: MongoDB Atlas (Cloud)
- Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a cluster and get your connection string
- Use the connection string in your `.env` file

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# MongoDB Connection
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/apexbank
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/apexbank

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=5000

# Frontend API URL
VITE_API_URL=http://localhost:5000/api
```

### 4. Install Dependencies

Install dependencies for both frontend and backend:

```bash
# Install root dependencies (includes concurrently for running both servers)
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

Or use the convenience script:
```bash
npm run install:all
```

### 5. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
MONGODB_URI=mongodb://localhost:27017/apexbank
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Create a `.env` file in the `frontend/` directory (optional):

```env
VITE_API_URL=http://localhost:5000/api
```

### 6. Run the Application

You have two options:

#### Option A: Run Both Servers Together (Recommended)
From the root directory:
```bash
npm run dev
```
This runs both frontend and backend concurrently.

#### Option B: Run Servers Separately

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
The server will run on `http://localhost:5000`

**Terminal 2 - Frontend Development Server:**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:3000`

## Usage

### Customer Registration & Login
1. Navigate to the landing page
2. Click "Open Account" or "Login"
3. Select "Customer" tab
4. Fill in registration/login form
5. Customers get an auto-generated account number

### Employee/Manager Registration & Login
1. Navigate to login/signup page
2. Select "Employee/Manager" tab
3. Fill in the form (Employee ID is required)
4. Choose role: Employee or Manager
5. Optionally add department

## API Endpoints

### Customer Endpoints
- `POST /api/auth/customer/register` - Register a new customer
- `POST /api/auth/customer/login` - Customer login

### Employee Endpoints
- `POST /api/auth/employee/register` - Register a new employee/manager
- `POST /api/auth/employee/login` - Employee/manager login

### Health Check
- `GET /api/health` - Server health check

## Database Models

### Customer Model
- firstName, lastName, email, password
- accountNumber (auto-generated)
- balance (default: 0)
- createdAt, isActive

### Employee Model
- firstName, lastName, email, password
- employeeId (required, unique)
- role (employee/manager)
- department (optional)
- createdAt, isActive

## Project Structure

```
apexbank-landing-page/
├── frontend/              # React frontend application
│   ├── components/       # React components
│   │   └── Icons.tsx
│   ├── utils/           # Utility functions
│   │   └── api.ts       # API client
│   ├── App.tsx          # Main React component
│   ├── index.tsx        # React entry point
│   ├── index.html       # HTML template
│   ├── vite.config.ts   # Vite configuration
│   ├── tsconfig.json    # TypeScript config
│   └── package.json     # Frontend dependencies
│
├── backend/              # Express backend server
│   ├── models/          # MongoDB models
│   │   ├── Customer.js
│   │   └── Employee.js
│   ├── routes/          # API routes
│   │   └── auth.js
│   ├── index.js         # Express server entry point
│   ├── .env.example     # Environment variables template
│   └── package.json     # Backend dependencies
│
└── package.json          # Root package.json with convenience scripts
```

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT token-based authentication
- Email validation
- Password minimum length enforcement
- Secure token storage in localStorage

## Development

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: JWT + bcryptjs

## Production Deployment

Before deploying to production:
1. Change `JWT_SECRET` to a strong, random string
2. Use MongoDB Atlas or a secure MongoDB instance
3. Set up proper environment variables
4. Enable HTTPS
5. Configure CORS properly
6. Add rate limiting
7. Set up proper error logging

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongosh` or check service status
- Verify connection string in `backend/.env`
- Check firewall settings if using MongoDB Atlas
- Check backend console for connection status messages

### Backend Server Not Starting
- Check if port 5000 is available
- Verify all dependencies are installed: `cd backend && npm install`
- Check `backend/.env` file exists and has correct values
- Ensure MongoDB is running before starting the backend

### Frontend Can't Connect to Backend
- Ensure backend server is running on port 5000
- Check `VITE_API_URL` in `frontend/.env` matches backend URL (default: `http://localhost:5000/api`)
- Verify CORS is enabled in backend (check `backend/index.js`)
- Check browser console for CORS errors

### Installation Issues
- Delete `node_modules` folders and `package-lock.json` files
- Run `npm install` in root, frontend, and backend directories separately
- Ensure Node.js version is 18 or higher

## License

MIT
