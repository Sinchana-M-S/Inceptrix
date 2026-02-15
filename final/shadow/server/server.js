require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const {
  authRoutes,
  activityRoutes,
  testimonyRoutes,
  vcsRoutes,
  lenderRoutes,
  adminRoutes,
  aiRoutes,
  advancedRoutes
} = require('./routes');

// Initialize express
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/testimonies', testimonyRoutes);
app.use('/api/vcs', vcsRoutes);
app.use('/api/lender', lenderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/advanced', advancedRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Shadow-Labor Ledger API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Shadow-Labor Ledger API',
    version: '1.0.0',
    description: 'Alternative Credit Scoring Platform for Unpaid Caregivers',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login',
        'GET /api/auth/me': 'Get current user'
      },
      activities: {
        'POST /api/activities': 'Log new activity',
        'GET /api/activities': 'Get my activities',
        'GET /api/activities/stats': 'Get activity statistics'
      },
      testimonies: {
        'POST /api/testimonies': 'Submit testimony',
        'GET /api/testimonies/pending': 'Get pending verifications',
        'GET /api/testimonies/received': 'Get received testimonies'
      },
      vcs: {
        'GET /api/vcs/score': 'Get my VCS score',
        'GET /api/vcs/breakdown': 'Get score breakdown',
        'GET /api/vcs/history': 'Get score history',
        'POST /api/vcs/calculate': 'Trigger recalculation'
      },
      lender: {
        'GET /api/lender/vcs-score/:id': 'Get caregiver VCS',
        'GET /api/lender/score-breakdown/:id': 'Get detailed breakdown',
        'GET /api/lender/risk-bands': 'Get risk band definitions',
        'GET /api/lender/credit-limit/:id': 'Get suggested credit limit'
      },
      admin: {
        'GET /api/admin/bias-audit': 'Get bias audit report',
        'GET /api/admin/fraud-alerts': 'Get fraud alerts',
        'GET /api/admin/model-drift': 'Monitor model drift'
      },
      ai: {
        'POST /api/ai/classify-activity': 'AI activity classification',
        'GET /api/ai/loan-prediction': 'ML loan prediction',
        'GET /api/ai/loan-prediction/:caregiverId': 'Loan prediction for specific caregiver',
        'POST /api/ai/fraud-analysis': 'AI fraud detection',
        'GET /api/ai/risk-assessment/:userId': 'Comprehensive risk assessment',
        'GET /api/ai/score-explanation': 'AI score explanation',
        'GET /api/ai/status': 'AI service status'
      }
    }
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   🌟 Shadow-Labor Ledger API Server                        ║
  ║   Alternative Credit Scoring for Unpaid Caregivers         ║
  ║                                                            ║
  ║   Server running on port ${PORT}                             ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
  ║                                                            ║
  ║   Endpoints: /api                                          ║
  ║   Health: /api/health                                      ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
