# OAuth and Email Verification Setup Guide

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (development)
     - Your production callback URL (production)
   - Copy the Client ID and Client Secret

### 2. Configure Backend

Add to `backend/.env`:
```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## Email Verification Setup

### 1. Gmail Setup (Recommended for Development)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security > 2-Step Verification > App passwords
   - Generate a password for "Mail"
   - Copy the generated password

### 2. Other Email Providers

#### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Mailgun:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
```

### 3. Configure Backend

Add to `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Testing

### Test OAuth:
1. Start the backend server
2. Go to login page
3. Click "Continue with Google"
4. Complete Google authentication
5. You should be redirected back and logged in

### Test Email Verification:
1. Register a new customer account
2. Check your email for verification link
3. Click the link or copy the token
4. Email should be verified

## Troubleshooting

### OAuth Issues:
- **"redirect_uri_mismatch"**: Check that the callback URL in Google Console matches exactly
- **"invalid_client"**: Verify Client ID and Secret are correct
- **CORS errors**: Ensure FRONTEND_URL is set correctly in backend/.env

### Email Issues:
- **"Authentication failed"**: 
  - For Gmail: Use App Password, not regular password
  - Check SMTP credentials are correct
- **Emails not sending**:
  - Check SMTP_HOST and SMTP_PORT
  - Verify firewall allows outbound SMTP
  - Check spam folder

### Production Considerations:
- Use environment-specific OAuth credentials
- Use a professional email service (SendGrid, Mailgun, AWS SES)
- Set up proper email templates
- Implement rate limiting for email sending
- Use HTTPS for all OAuth callbacks
