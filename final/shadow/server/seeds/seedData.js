/**
 * Seed Data Script
 * 
 * Creates demo data for the Shadow-Labor Ledger platform:
 * - 5 Caregivers
 * - 3 Verifiers
 * - 1 Lender
 * - 1 Admin
 * - 30 days of activity logs
 * - 15 testimonies
 * - VCS scores for all caregivers
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, ActivityLog, Testimony, VCSScore, RegionalBenchmark } = require('../models');
const vcsEngine = require('../services/vcsEngine');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shadow-labor-ledger');
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};

// Sample data
const caregivers = [
  {
    name: 'Lakshmi Devi',
    phone: '9876543210',
    password: 'password123',
    role: 'caregiver',
    region: 'Jaipur Rural',
    regionType: 'rural',
    ageGroup: '36-45',
    simTenure: 48,
    locationStability: 0.9,
    landVerified: true,
    utilityPaymentRatio: 0.85,
    paymentStreaks: 8,
    behaviorConsistency: 0.8,
    incomeSignal: 0.4,
    coopScore: 0.7,
    consentGiven: true
  },
  {
    name: 'Meera Bai',
    phone: '9876543211',
    password: 'password123',
    role: 'caregiver',
    region: 'Delhi Urban',
    regionType: 'urban',
    ageGroup: '26-35',
    simTenure: 36,
    locationStability: 0.7,
    landVerified: false,
    utilityPaymentRatio: 0.9,
    paymentStreaks: 12,
    behaviorConsistency: 0.85,
    incomeSignal: 0.6,
    coopScore: 0.5,
    consentGiven: true
  },
  {
    name: 'Kamala Sundari',
    phone: '9876543212',
    password: 'password123',
    role: 'caregiver',
    region: 'Bihar Rural',
    regionType: 'rural',
    ageGroup: '46-55',
    simTenure: 60,
    locationStability: 0.95,
    landVerified: true,
    utilityPaymentRatio: 0.7,
    paymentStreaks: 6,
    behaviorConsistency: 0.75,
    incomeSignal: 0.3,
    coopScore: 0.8,
    consentGiven: true
  },
  {
    name: 'Radha Kumari',
    phone: '9876543213',
    password: 'password123',
    role: 'caregiver',
    region: 'Mumbai Urban',
    regionType: 'urban',
    ageGroup: '18-25',
    simTenure: 12,
    locationStability: 0.5,
    landVerified: false,
    utilityPaymentRatio: 0.6,
    paymentStreaks: 3,
    behaviorConsistency: 0.6,
    incomeSignal: 0.5,
    coopScore: 0.3,
    consentGiven: true
  },
  {
    name: 'Savitri Amma',
    phone: '9876543214',
    password: 'password123',
    role: 'caregiver',
    region: 'Chennai Semi-Urban',
    regionType: 'semiUrban',
    ageGroup: '56-65',
    simTenure: 72,
    locationStability: 0.98,
    landVerified: true,
    utilityPaymentRatio: 0.95,
    paymentStreaks: 15,
    behaviorConsistency: 0.9,
    incomeSignal: 0.35,
    coopScore: 0.9,
    consentGiven: true
  }
];

const verifiers = [
  {
    name: 'NGO Worker - Amit Kumar',
    phone: '9876543220',
    password: 'password123',
    role: 'verifier',
    region: 'Jaipur Rural',
    regionType: 'rural',
    ageGroup: '36-45',
    verifierMetadata: {
      organization: 'Rural Development Trust',
      verifierType: 'ngo',
      trustLevel: 1.0,
      totalVerifications: 0
    },
    consentGiven: true
  },
  {
    name: 'Teacher - Priya Sharma',
    phone: '9876543221',
    password: 'password123',
    role: 'verifier',
    region: 'Delhi Urban',
    regionType: 'urban',
    ageGroup: '26-35',
    verifierMetadata: {
      organization: 'Government Primary School',
      verifierType: 'teacher',
      trustLevel: 0.9,
      totalVerifications: 0
    },
    consentGiven: true
  },
  {
    name: 'Community Leader - Ramesh Patel',
    phone: '9876543222',
    password: 'password123',
    role: 'verifier',
    region: 'Bihar Rural',
    regionType: 'rural',
    ageGroup: '46-55',
    verifierMetadata: {
      organization: 'Village Panchayat',
      verifierType: 'communityLeader',
      trustLevel: 0.8,
      totalVerifications: 0
    },
    consentGiven: true
  }
];

const lender = {
  name: 'MicroFinance Bank Officer',
  phone: '9876543230',
  password: 'password123',
  role: 'lender',
  region: 'National',
  regionType: 'urban',
  ageGroup: '36-45',
  lenderMetadata: {
    institution: 'Rural MicroFinance Bank',
    licenseNumber: 'MFI-2024-001',
    maxLoanCapacity: 10000000
  },
  consentGiven: true
};

const admin = {
  name: 'System Admin',
  phone: '9876543240',
  password: 'admin123',
  role: 'admin',
  region: 'National',
  regionType: 'urban',
  ageGroup: '36-45',
  consentGiven: true
};

// Activity log templates
const activityTemplates = [
  { type: 'eldercare', texts: [
    'Took care of mother-in-law today. Helped her bathe, gave medicines, and prepared lunch.',
    'Spent the morning with grandmother. She has difficulty walking so I helped her with exercises.',
    'Full day caring for elderly father. Changed bedding, gave medicines, and kept him company.',
    'Helped elderly neighbor with groceries and cooking. She lives alone and needs assistance.'
  ]},
  { type: 'childcare', texts: [
    'Looked after the children today. Helped with homework, prepared meals, and put them to bed.',
    'Full day with the kids - school drop off, pick up, cooking, and bedtime stories.',
    'Babysitting neighbors kids while they went to the hospital. Fed them lunch and played games.',
    'Helping daughter with newborn baby. Feeding, changing diapers, and letting her rest.'
  ]},
  { type: 'housework', texts: [
    'Deep cleaning the house today. Swept, mopped, washed clothes, and organized kitchen.',
    'Regular housework - cooking three meals, washing dishes, cleaning rooms.',
    'Preparing house for festival. Extra cleaning, washing curtains, decorating.'
  ]},
  { type: 'community', texts: [
    'Helped organize community health camp. Assisted with registrations and distribution.',
    'Participated in village cleanliness drive. Cleaned common areas for 4 hours.',
    'Attended SHG meeting and helped new members understand the process.'
  ]},
  { type: 'healthcare', texts: [
    'Took mother to doctor for checkup. Waited 3 hours at hospital, got medicines.',
    'Giving daily injections to diabetic father. Also monitoring blood sugar levels.',
    'Dressing wounds for neighbor who had an accident. Visiting twice daily.'
  ]}
];

// Seed functions
async function seedRegionalBenchmarks() {
  console.log('📍 Seeding regional benchmarks...');
  
  const benchmarks = [
    { region: 'Delhi Urban', state: 'Delhi', regionType: 'urban', wageBenchmarks: { minWage: 60, avgWage: 80, careWage: 100 }},
    { region: 'Mumbai Urban', state: 'Maharashtra', regionType: 'urban', wageBenchmarks: { minWage: 65, avgWage: 85, careWage: 110 }},
    { region: 'Jaipur Rural', state: 'Rajasthan', regionType: 'rural', wageBenchmarks: { minWage: 35, avgWage: 45, careWage: 55 }},
    { region: 'Bihar Rural', state: 'Bihar', regionType: 'rural', wageBenchmarks: { minWage: 30, avgWage: 40, careWage: 50 }},
    { region: 'Chennai Semi-Urban', state: 'Tamil Nadu', regionType: 'semiUrban', wageBenchmarks: { minWage: 45, avgWage: 60, careWage: 75 }}
  ];

  await RegionalBenchmark.deleteMany({});
  await RegionalBenchmark.insertMany(benchmarks);
  console.log(`   Created ${benchmarks.length} regional benchmarks`);
}

async function seedUsers() {
  console.log('👥 Seeding users...');
  
  await User.deleteMany({});
  
  // Create caregivers
  const createdCaregivers = [];
  for (const caregiver of caregivers) {
    const user = await User.create(caregiver);
    createdCaregivers.push(user);
  }
  console.log(`   Created ${createdCaregivers.length} caregivers`);
  
  // Create verifiers
  const createdVerifiers = [];
  for (const verifier of verifiers) {
    const user = await User.create(verifier);
    createdVerifiers.push(user);
  }
  console.log(`   Created ${createdVerifiers.length} verifiers`);
  
  // Create lender
  const createdLender = await User.create(lender);
  console.log('   Created 1 lender');
  
  // Create admin
  const createdAdmin = await User.create(admin);
  console.log('   Created 1 admin');
  
  return { caregivers: createdCaregivers, verifiers: createdVerifiers, lender: createdLender };
}

async function seedActivities(caregivers) {
  console.log('📝 Seeding activities...');
  
  await ActivityLog.deleteMany({});
  
  let totalActivities = 0;
  
  for (const caregiver of caregivers) {
    // Generate 15-25 activities per caregiver over 30 days
    const numActivities = Math.floor(Math.random() * 11) + 15;
    
    for (let i = 0; i < numActivities; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const activityDate = new Date();
      activityDate.setDate(activityDate.getDate() - daysAgo);
      
      // Pick random activity type and text
      const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
      const rawText = template.texts[Math.floor(Math.random() * template.texts.length)];
      
      const hours = Math.floor(Math.random() * 6) + 2; // 2-8 hours
      
      await ActivityLog.create({
        caregiverId: caregiver._id,
        rawText,
        parsedActivity: {
          keywords: rawText.split(' ').slice(0, 5),
          processingConfidence: 0.7 + Math.random() * 0.25
        },
        activityType: template.type,
        estimatedHours: hours,
        careMultiplier: template.type === 'eldercare' ? 1.3 : 
                        template.type === 'childcare' ? 1.2 : 1.0,
        geoLocation: {
          regionType: caregiver.regionType
        },
        verificationStatus: Math.random() > 0.3 ? 'verified' : 'pending',
        activityDate
      });
      
      totalActivities++;
    }
  }
  
  console.log(`   Created ${totalActivities} activities`);
}

async function seedTestimonies(caregivers, verifiers) {
  console.log('✅ Seeding testimonies...');
  
  await Testimony.deleteMany({});
  
  let totalTestimonies = 0;
  
  // Each verifier validates 2-3 caregivers
  for (const verifier of verifiers) {
    const numValidations = Math.floor(Math.random() * 2) + 2;
    const selectedCaregivers = caregivers.slice(0, numValidations);
    
    for (const caregiver of selectedCaregivers) {
      await Testimony.create({
        caregiverId: caregiver._id,
        verifierId: verifier._id,
        structuredRating: {
          reliability: Math.floor(Math.random() * 2) + 4, // 4-5
          consistency: Math.floor(Math.random() * 2) + 4,
          quality: Math.floor(Math.random() * 2) + 4,
          communityImpact: Math.floor(Math.random() * 2) + 4
        },
        freeText: `I have known ${caregiver.name} for several years. She is hardworking and dedicated to her family and community.`,
        verifierTrustLevel: verifier.verifierMetadata.trustLevel,
        relationshipToCaregiver: 'community_member',
        knownDuration: Math.floor(Math.random() * 36) + 12,
        validationConfidence: 0.7 + Math.random() * 0.25,
        authenticityScore: 0.85 + Math.random() * 0.15,
        status: 'verified'
      });
      
      totalTestimonies++;
      
      // Update verifier stats
      await User.findByIdAndUpdate(verifier._id, {
        $inc: { 'verifierMetadata.totalVerifications': 1 }
      });
    }
  }
  
  console.log(`   Created ${totalTestimonies} testimonies`);
}

async function calculateVCSScores(caregivers) {
  console.log('🧮 Calculating VCS scores...');
  
  await VCSScore.deleteMany({});
  
  for (const caregiver of caregivers) {
    try {
      const user = await User.findById(caregiver._id);
      const vcsResult = await vcsEngine.calculateVCS(user);
      await vcsEngine.saveScore(vcsResult);
      console.log(`   ${caregiver.name}: VCS = ${vcsResult.totalVCS} (${vcsResult.riskBandLabel})`);
    } catch (err) {
      console.error(`   Error calculating VCS for ${caregiver.name}:`, err.message);
    }
  }
}

// Main seed function
async function seedDatabase() {
  console.log('\n🌱 Starting Shadow-Labor Ledger seed process...\n');
  
  await connectDB();
  
  await seedRegionalBenchmarks();
  const { caregivers: createdCaregivers, verifiers: createdVerifiers } = await seedUsers();
  await seedActivities(createdCaregivers);
  await seedTestimonies(createdCaregivers, createdVerifiers);
  await calculateVCSScores(createdCaregivers);
  
  console.log('\n✨ Seed process complete!\n');
  console.log('Demo accounts:');
  console.log('  Caregiver: 9876543210 / password123');
  console.log('  Verifier: 9876543220 / password123');
  console.log('  Lender: 9876543230 / password123');
  console.log('  Admin: 9876543240 / admin123');
  
  process.exit(0);
}

// Run seed
seedDatabase().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
