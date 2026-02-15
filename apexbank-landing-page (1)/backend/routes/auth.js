import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import Customer from '../models/Customer.js';
import Employee from '../models/Employee.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import nodemailer from 'nodemailer';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Customer Registration
router.post('/customer/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer with this email already exists' 
      });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Create new customer
    const customer = new Customer({
      firstName,
      lastName,
      email,
      password,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await customer.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken, firstName);

    // Generate token
    const token = generateToken(customer._id, 'customer');

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully. Please check your email to verify your account.',
      token,
      user: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        accountNumber: customer.accountNumber,
        emailVerified: customer.emailVerified,
        type: 'customer'
      }
    });
  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message 
    });
  }
});

// Customer Login
router.post('/customer/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find customer
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if account is active
    if (!customer.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Check email verification (required for login)
    if (!customer.emailVerified && !customer.oauthProvider) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        emailVerified: false
      });
    }

    // Check if user has password (not OAuth only)
    if (customer.password) {
      // Verify password
      const isPasswordValid = await customer.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login with Google' 
      });
    }

    // Generate token
    const token = generateToken(customer._id, 'customer');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        accountNumber: customer.accountNumber,
        balance: customer.balance,
        emailVerified: customer.emailVerified,
        type: 'customer'
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
});

// Email Verification
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const customer = await Customer.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    customer.emailVerified = true;
    customer.emailVerificationToken = null;
    customer.emailVerificationExpires = null;
    await customer.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification',
      error: error.message
    });
  }
});

// Email-based Login (Magic Link)
router.post('/email-login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a login link has been sent.'
      });
    }

    if (!customer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate magic link token
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExpires = new Date();
    magicTokenExpires.setHours(magicTokenExpires.getHours() + 1); // 1 hour expiry

    // Store token in customer record (we'll use emailVerificationToken field for magic link)
    customer.emailVerificationToken = magicToken;
    customer.emailVerificationExpires = magicTokenExpires;
    await customer.save();

    // Send magic link email
    const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/magic-link?token=${magicToken}`;
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"ApexBank" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your ApexBank Login Link',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0a192f; color: #c5a059; padding: 20px; text-align: center; }
            .content { background: #f8fafc; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background: #c5a059; color: #0a192f; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ApexBank</h1>
            </div>
            <div class="content">
              <h2>Hello ${customer.firstName}!</h2>
              <p>Click the button below to login to your ApexBank account:</p>
              <div style="text-align: center;">
                <a href="${magicLink}" class="button">Login to ApexBank</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #64748b;">${magicLink}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this login link, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 ApexBank. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    res.json({
      success: true,
      message: 'Login link sent to your email'
    });
  } catch (error) {
    console.error('Email login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Verify Magic Link Token
router.post('/verify-magic-link', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const customer = await Customer.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired login link'
      });
    }

    if (!customer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Clear the token
    customer.emailVerificationToken = null;
    customer.emailVerificationExpires = null;
    await customer.save();

    // Generate JWT token
    const jwtToken = generateToken(customer._id, 'customer');

    res.json({
      success: true,
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        accountNumber: customer.accountNumber,
        balance: customer.balance,
        emailVerified: customer.emailVerified,
        type: 'customer'
      }
    });
  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (customer.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    customer.emailVerificationToken = verificationToken;
    customer.emailVerificationExpires = verificationExpires;
    await customer.save();

    await sendVerificationEmail(email, verificationToken, customer.firstName);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Google OAuth Routes (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    async (req, res) => {
    try {
      const user = req.user;
      const token = generateToken(user._id, 'customer');

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&type=customer`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  });
} else {
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.'
    });
  });

  router.get('/google/callback', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured.'
    });
  });
}

// Employee/Manager Registration (for admin use)
router.post('/employee/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, employeeId, role, department } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password || !employeeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required fields must be provided' 
      });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ 
      $or: [{ email }, { employeeId }] 
    });
    if (existingEmployee) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee with this email or ID already exists' 
      });
    }

    // Create new employee
    const employee = new Employee({
      firstName,
      lastName,
      email,
      password,
      employeeId,
      role: role || 'employee',
      department
    });

    await employee.save();

    // Generate token
    const token = generateToken(employee._id, 'employee');

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      token,
      user: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeId: employee.employeeId,
        role: employee.role,
        department: employee.department,
        type: 'employee'
      }
    });
  } catch (error) {
    console.error('Employee registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message 
    });
  }
});

// Employee/Manager Login
router.post('/employee/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find employee
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if account is active
    if (!employee.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Verify password
    const isPasswordValid = await employee.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(employee._id, 'employee');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeId: employee.employeeId,
        role: employee.role,
        department: employee.department,
        type: 'employee'
      }
    });
  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
});

// Verify token middleware (for protected routes)
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

export default router;
