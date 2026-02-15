# MongoDB Setup Guide

## Quick Start

### Step 1: Start MongoDB
Open a terminal and run:
```bash
cd "apexbank-landing-page (1)"
start-db.bat
```
Keep this terminal open. MongoDB will use the `database_data` folder in the project.

### Step 2: Start Backend
Open another terminal and run:
```bash
cd "apexbank-landing-page (1)\backend"
node index.js
```

## MongoDB Compass Connection

**Connection URI:** `mongodb://localhost:27017/apexbank`

1. Open MongoDB Compass
2. Click "New Connection"
3. Paste the URI above
4. Click "Connect"

**Database:** `apexbank`  
**Collections:** `customers` (login/registration), `employees` (employee login)

## Environment

MongoDB URI is set in `.env`:
```
MONGODB_URI=mongodb://localhost:27017/apexbank
```
