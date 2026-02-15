# Quick Setup Guide

## Step-by-Step Setup

### 1. Install MongoDB

**Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer
3. MongoDB will start automatically as a Windows service

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Or use MongoDB Atlas (Cloud - Free):**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a free cluster
4. Get your connection string

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/apexbank
JWT_SECRET=your-secret-key-change-this
PORT=5000
VITE_API_URL=http://localhost:5000/api
```

### 4. Start the Application

**Terminal 1 - Start Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## Testing the Login System

### Test Customer Registration
1. Go to http://localhost:3000
2. Click "Open Account"
3. Select "Customer" tab
4. Fill in:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Password: password123
5. Click "Create Account"

### Test Employee Registration
1. Go to signup page
2. Select "Employee/Manager" tab
3. Fill in:
   - First Name: Jane
   - Last Name: Smith
   - Email: jane@apexbank.com
   - Employee ID: EMP001
   - Role: Manager
   - Password: password123
6. Click "Create Account"

### Test Login
1. Go to login page
2. Select user type (Customer or Employee/Manager)
3. Enter email and password
4. Click "Sign In"

## Verify MongoDB Connection

You can verify data is being saved by connecting to MongoDB:

```bash
mongosh
use apexbank
db.customers.find()
db.employees.find()
```

## Common Issues

**"Cannot connect to MongoDB"**
- Make sure MongoDB is running
- Check connection string in `.env`
- For Atlas: Check IP whitelist and credentials

**"Port already in use"**
- Change PORT in `.env` to a different number
- Or stop the process using port 5000

**"Module not found"**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`

## Policy Change Feature (Regulatory Sentinel)

The **Policy Change** feature integrates the Regulatory Sentinel compliance dashboard. It is available in the navbar when logged in as an employee.

### To run Policy Change:

1. Ensure Python 3.11+ is installed
2. From the **project root** (parent of apexbank-landing-page), install Regulatory Sentinel dependencies:
   ```bash
   cd "final/policy change/regulatory-sentinel"
   pip install -r requirements.txt
   ```
3. Start the Regulatory Sentinel backend (in a separate terminal):
   ```bash
   cd "final/policy change/regulatory-sentinel"
   python run.py
   ```
4. The Regulatory Sentinel dashboard will be available at http://localhost:8000/dashboard
5. From the ApexBank website, log in as an employee and click **Policy Change** in the navbar (or use the **Policy Change** button in the Employee Dashboard sidebar)
