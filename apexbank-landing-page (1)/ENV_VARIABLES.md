# Environment Variables (.env)

This project uses **one** `.env` file at the **project root** (`apexbank-landing-page (1)/.env`).  
Both the backend and the frontend (Vite) load from this file.  
You can override values locally with `.env.local` in the project root.

---

## 1. Backend (loads from root `.env`)

**Location:** `apexbank-landing-page (1)/.env`  
The backend is configured to load `.env` from the project root.

### Required (core app)

| Variable      | Description                    | Example                              |
| ------------- | ------------------------------ | ------------------------------------ |
| `MONGODB_URI` | MongoDB connection string      | `mongodb://localhost:27017/apexbank` |
| `JWT_SECRET`  | Secret for signing JWT tokens  | `your-secret-key-change-this`        |
| `PORT`        | Backend server port (optional) | `5000`                               |

### Optional (frontend URL & CORS)

| Variable       | Description                      | Example                 |
| -------------- | -------------------------------- | ----------------------- |
| `FRONTEND_URL` | Frontend origin for CORS & links | `http://localhost:3000` |

### Optional (email – verification, magic link, password reset)

| Variable        | Description              | Example                |
| --------------- | ------------------------ | ---------------------- |
| `SMTP_HOST`     | SMTP server              | `smtp.gmail.com`       |
| `SMTP_PORT`     | SMTP port                | `587`                  |
| `SMTP_USER`     | SMTP login (email)       | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP password / app pass | `your-app-password`    |

Without these, registration and magic-link emails will not be sent (backend still runs).

### Optional (Google OAuth – customer “Login with Google”)

| Variable               | Description            | Example                                          |
| ---------------------- | ---------------------- | ------------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID | From Google Cloud Console                        |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret    | From Google Cloud Console                        |
| `GOOGLE_CALLBACK_URL`  | OAuth callback URL     | `http://localhost:5000/api/auth/google/callback` |

Without these, Google login is disabled (other auth still works).

### Optional (sessions)

| Variable         | Description                | Example    |
| ---------------- | -------------------------- | ---------- |
| `SESSION_SECRET` | Secret for session cookies | Any string |

Falls back to `JWT_SECRET` if not set.

---

## 2. Frontend (loads from root `.env`)

**Location:** Same root `.env` file.  
Vite loads from the project root; only variables starting with `VITE_` are exposed to the browser.

| Variable       | Description          | Example                     |
| -------------- | -------------------- | --------------------------- |
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `VITE_FORECLOSURE_APP_URL` | Revenue Leakage (RetainAI) app URL, embedded in employee dashboard | `http://localhost:5000` |

If omitted, the app uses `http://localhost:5000/api` by default. The Revenue Leakage module iframe uses `http://localhost:5000` unless `VITE_FORECLOSURE_APP_URL` is set (start the foreclosure backend from `final/foreclosure`: `python backend/app.py`).

---

## Example files

### `backend/.env` (minimal – local dev, no email/OAuth)

```env
MONGODB_URI=mongodb://localhost:27017/apexbank
JWT_SECRET=your-secret-key-change-this
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### `backend/.env` (with Gmail + Google OAuth)

```env
MONGODB_URI=mongodb://localhost:27017/apexbank
JWT_SECRET=your-secret-key-change-this
PORT=5000
FRONTEND_URL=http://localhost:3000

# Email (e.g. Gmail – use App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### `frontend/.env` or `frontend/.env.local` (optional)

```env
VITE_API_URL=http://localhost:5000/api
```

Use a different value (e.g. `https://api.yourdomain.com/api`) for production builds.

---

## Summary

| Where        | Required                    | Optional                                                       |
| ------------ | --------------------------- | -------------------------------------------------------------- |
| **Backend**  | `MONGODB_URI`, `JWT_SECRET` | `PORT`, `FRONTEND_URL`, `SMTP_*`, `GOOGLE_*`, `SESSION_SECRET` |
| **Frontend** | — (default API URL used)    | `VITE_API_URL`                                                 |

You do **not** need to run or configure the `policyguardian-suite` folder; PolicyGuardian is built into the ApexBank frontend and uses the same backend and env as the rest of the app.
