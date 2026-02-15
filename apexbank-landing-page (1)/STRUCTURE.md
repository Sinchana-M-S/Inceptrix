# Project Structure Guide

This document explains the separated frontend and backend structure of the ApexBank application.

## Directory Structure

```
apexbank-landing-page/
│
├── frontend/                    # React + TypeScript Frontend
│   ├── components/             # React components
│   │   └── Icons.tsx          # Icon components
│   ├── utils/                 # Utility functions
│   │   └── api.ts             # API client for backend communication
│   ├── App.tsx                # Main application component
│   ├── index.tsx              # React entry point
│   ├── index.html             # HTML template
│   ├── vite.config.ts         # Vite build configuration
│   ├── tsconfig.json          # TypeScript configuration
│   ├── types.ts               # TypeScript type definitions
│   ├── package.json           # Frontend dependencies
│   └── .env                   # Frontend environment variables (optional)
│
├── backend/                    # Node.js + Express Backend
│   ├── models/                # MongoDB Mongoose models
│   │   ├── Customer.js        # Customer database schema
│   │   └── Employee.js        # Employee/Manager database schema
│   ├── routes/                # Express API routes
│   │   └── auth.js            # Authentication routes
│   ├── index.js               # Express server entry point
│   ├── package.json           # Backend dependencies
│   └── .env                   # Backend environment variables (required)
│
├── package.json               # Root package.json with convenience scripts
├── README.md                   # Main documentation
├── SETUP.md                    # Quick setup guide
└── STRUCTURE.md                # This file
```

## Frontend (`frontend/`)

The frontend is a React application built with:
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (via CDN)

### Key Files:
- `App.tsx` - Main component with landing page, login, and signup
- `utils/api.ts` - API client that communicates with backend
- `components/Icons.tsx` - Reusable icon components

### Running Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Backend (`backend/`)

The backend is a Node.js Express server with:
- **Express** - Web framework
- **MongoDB + Mongoose** - Database and ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Key Files:
- `index.js` - Express server setup and MongoDB connection
- `models/Customer.js` - Customer database model
- `models/Employee.js` - Employee/Manager database model
- `routes/auth.js` - Authentication endpoints

### Running Backend:
```bash
cd backend
npm install
# Create .env file with MongoDB connection string
npm run dev
```

## Environment Variables

### Backend (`.env` in `backend/` directory):
```env
MONGODB_URI=mongodb://localhost:27017/apexbank
JWT_SECRET=your-secret-key
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (`.env` in `frontend/` directory - optional):
```env
VITE_API_URL=http://localhost:5000/api
```

## API Endpoints

All API endpoints are prefixed with `/api`:

- `POST /api/auth/customer/register` - Customer registration
- `POST /api/auth/customer/login` - Customer login
- `POST /api/auth/employee/register` - Employee registration
- `POST /api/auth/employee/login` - Employee login
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
- role ('employee' or 'manager')
- department (optional)
- createdAt, isActive

## Development Workflow

1. **Start MongoDB** (local or Atlas)
2. **Start Backend**: `cd backend && npm run dev`
3. **Start Frontend**: `cd frontend && npm run dev`
4. **Or use root script**: `npm run dev` (runs both)

## Production Build

### Frontend:
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Backend:
```bash
cd backend
npm start
# Uses production .env configuration
```

## Communication Flow

```
Frontend (React) 
    ↓ HTTP Requests
    ↓ (via utils/api.ts)
Backend (Express)
    ↓ Database Queries
    ↓ (via Mongoose)
MongoDB Database
```

## Benefits of Separation

1. **Independent Development** - Frontend and backend can be developed separately
2. **Different Technologies** - Each can use optimal tools
3. **Scalability** - Can deploy frontend and backend separately
4. **Team Collaboration** - Frontend and backend teams can work independently
5. **Clear Separation of Concerns** - UI logic vs. business logic
