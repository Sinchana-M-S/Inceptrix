# Where to Get Each .env Value

Use this as a checklist: where each variable in `.env` comes from and what to put in it.

---

## Required (core app)

### `MONGODB_URI`

**What it is:** Connection string for your MongoDB database.

**Where to get it:**

- **Local MongoDB:**  
  If MongoDB is installed on your machine and running:  
  `mongodb://localhost:27017/apexbank`  
  (You can change `apexbank` to any database name.)
- **MongoDB Atlas (cloud):**
  1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in or create an account.
  2. Create a free cluster.
  3. Database Access → Add user (username + password).
  4. Network Access → Add IP (e.g. `0.0.0.0` for “allow from anywhere” in dev).
  5. Clusters → Connect → “Connect your application” → copy the connection string.
  6. Replace `<password>` in that string with your DB user password.  
     Example: `mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/apexbank?retryWrites=true&w=majority`

**Example:**  
`MONGODB_URI=mongodb://localhost:27017/apexbank`

---

### `JWT_SECRET`

**What it is:** A secret string used to sign and verify JWT tokens (login sessions). Not stored anywhere else—you invent it.

**Where to get it:**

- Create a long, random string (e.g. 32+ characters).
- You can use:
  - A password generator, or
  - In terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Use a different value in production than in development.

**Example:**  
`JWT_SECRET=a1b2c3d4e5f6...your-long-random-string`

---

### `PORT`

**What it is:** Port the backend server listens on.

**Where to get it:**

- You choose it. Default for this project: `5000`.
- Use another number only if 5000 is already in use (e.g. `5001`).

**Example:**  
`PORT=5000`

---

## Frontend (Vite)

### `VITE_API_URL`

**What it is:** Base URL the frontend uses to call the backend API.

**Where to get it:**

- **Local dev:** Your backend URL + `/api`.  
  If backend runs on `http://localhost:5000`, use:  
  `http://localhost:5000/api`
- **Production:** Your deployed backend URL, e.g.  
  `https://api.yourdomain.com/api`

**Example:**  
`VITE_API_URL=http://localhost:5000/api`

---

## CORS & redirects

### `FRONTEND_URL`

**What it is:** Full URL of your frontend app. Used for CORS and links in emails (verify email, magic link, etc.).

**Where to get it:**

- **Local dev:** `http://localhost:3000` (or the port Vite uses).
- **Production:** `https://yourdomain.com`

**Example:**  
`FRONTEND_URL=http://localhost:3000`

---

## Optional: Email (verification, magic link, password reset)

### `SMTP_HOST`

**What it is:** SMTP server hostname for sending email.

**Where to get it:**  
Depends on provider (see table below). Often in their “SMTP settings” or “Server settings” docs.

### `SMTP_PORT`

**What it is:** SMTP port (usually 587 for TLS, sometimes 465 for SSL).

**Where to get it:**  
Same provider docs (typically 587).

### `SMTP_USER`

**What it is:** SMTP login (usually your email or a special username).

**Where to get it:**

- Gmail: your Gmail address.
- SendGrid: literal `apikey`.
- Others: provider’s SMTP username.

### `SMTP_PASSWORD`

**What it is:** SMTP password or app password.

**Where to get it:**

- **Gmail:**
  1. [Google Account](https://myaccount.google.com/) → Security.
  2. Turn on 2-Step Verification if needed.
  3. Security → 2-Step Verification → App passwords.
  4. Create an app password for “Mail” and copy the 16-character password.
- **Outlook/Hotmail:** Your account password (or app password if you use 2FA).
- **SendGrid:** [SendGrid](https://sendgrid.com/) → Settings → API Keys → create key, copy.
- **Mailgun:** [Mailgun](https://www.mailgun.com/) → Sending → Domain → SMTP credentials.

**Examples:**

| Provider | SMTP_HOST             | SMTP_PORT | SMTP_USER        | SMTP_PASSWORD    |
| -------- | --------------------- | --------- | ---------------- | ---------------- |
| Gmail    | smtp.gmail.com        | 587       | your@gmail.com   | App password     |
| Outlook  | smtp-mail.outlook.com | 587       | your@outlook.com | Your password    |
| SendGrid | smtp.sendgrid.net     | 587       | apikey           | API key          |
| Mailgun  | smtp.mailgun.org      | 587       | Mailgun username | Mailgun password |

---

## Optional: Google OAuth (“Login with Google”)

### `GOOGLE_CLIENT_ID`

### `GOOGLE_CLIENT_SECRET`

**What they are:** OAuth 2.0 client credentials for “Sign in with Google”.

**Where to get them:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. **APIs & Services** → **Credentials**.
4. **Create Credentials** → **OAuth client ID**.
5. If asked, set “OAuth consent screen” (e.g. External, app name, your email).
6. Application type: **Web application**.
7. **Authorized redirect URIs:** add  
   `http://localhost:5000/api/auth/google/callback`  
   (and your production callback URL when you deploy).
8. Create; copy **Client ID** and **Client Secret**.

**Example:**  
`GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com`  
`GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx`

---

### `GOOGLE_CALLBACK_URL`

**What it is:** URL Google redirects to after the user signs in. Must match exactly what you added in Google Cloud Console.

**Where to get it:**

- You set it. For local backend on port 5000 it should be:  
  `http://localhost:5000/api/auth/google/callback`
- For production, use your backend URL, e.g.  
  `https://api.yourdomain.com/api/auth/google/callback`  
  and add this same URL in Google Cloud Console redirect URIs.

**Example:**  
`GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback`

---

## Optional: Session secret

### `SESSION_SECRET`

**What it is:** Secret used to sign session cookies (OAuth flow). If not set, the app falls back to `JWT_SECRET`.

**Where to get it:**

- Same idea as `JWT_SECRET`: a long random string you generate.
- Can leave empty to use `JWT_SECRET`, or set a different value for sessions.

**Example:**  
`SESSION_SECRET=another-long-random-string`

---

## Optional: Other API keys

### `GEMINI_API_KEY`

**What it is:** API key for Google’s Gemini API (only if you use Gemini somewhere in this project).

**Where to get it:**

1. Go to [Google AI Studio](https://aistudio.google.com/) or [Google Cloud Console](https://console.cloud.google.com/) (Vertex AI).
2. Create / get an API key for Gemini.
3. Copy the key into `.env`.

**Example:**  
`GEMINI_API_KEY=AIza...`

---

## Quick reference table

| Variable             | Where you get it                                                       |
| -------------------- | ---------------------------------------------------------------------- |
| MONGODB_URI          | Local: `mongodb://localhost:27017/apexbank` or Atlas connection string |
| JWT_SECRET           | You generate a long random string                                      |
| PORT                 | You choose (default 5000)                                              |
| VITE_API_URL         | Your backend URL + `/api` (e.g. http://localhost:5000/api)             |
| FRONTEND_URL         | Your frontend URL (e.g. http://localhost:3000)                         |
| SMTP\_\*             | Your email provider’s SMTP settings / app password                     |
| GOOGLE_CLIENT_ID     | Google Cloud Console → Credentials → OAuth client ID                   |
| GOOGLE_CLIENT_SECRET | Google Cloud Console → same OAuth client                               |
| GOOGLE_CALLBACK_URL  | You set it; must match redirect URI in Google Console                  |
| SESSION_SECRET       | You generate (optional; else JWT_SECRET is used)                       |
| GEMINI_API_KEY       | Google AI Studio / Cloud (only if you use Gemini)                      |

After you have the values, paste them into `apexbank-landing-page (1)/.env` (and keep that file out of version control).
