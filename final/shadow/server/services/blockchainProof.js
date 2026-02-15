/**
 * Blockchain Proof-of-Care Service
 * 
 * Creates tamper-proof records of care activities using cryptographic hashing.
 * Can be extended to write to actual blockchain (Polygon, Ethereum, etc.)
 */

const crypto = require('crypto');

class BlockchainProofService {
  constructor() {
    this.chain = [];
    this.pendingActivities = [];
    this.difficulty = 2; // Number of leading zeros required
    
    // Create genesis block
    this.createGenesisBlock();
    
    console.log('✓ Blockchain Proof-of-Care Service initialized');
  }

  /**
   * Create the first block
   */
  createGenesisBlock() {
    const genesisBlock = {
      index: 0,
      timestamp: new Date('2024-01-01').toISOString(),
      activities: [],
      previousHash: '0',
      hash: '0',
      nonce: 0
    };
    genesisBlock.hash = this.calculateHash(genesisBlock);
    this.chain.push(genesisBlock);
  }

  /**
   * Create proof for a care activity
   */
  createActivityProof(activity) {
    const proof = {
      activityId: activity._id || activity.id || crypto.randomUUID(),
      caregiverId: activity.caregiver,
      activityType: activity.activityType,
      hours: activity.hours,
      date: activity.activityDate || new Date().toISOString(),
      description: activity.description?.substring(0, 100),
      verifications: activity.verifications || [],
      createdAt: new Date().toISOString()
    };

    // Create cryptographic hash
    proof.hash = this.hashActivity(proof);
    
    // Create signature
    proof.signature = this.signProof(proof);

    // Add to pending activities for next block
    this.pendingActivities.push(proof);

    return {
      success: true,
      proof,
      blockNumber: this.chain.length,
      chainLength: this.chain.length,
      verificationUrl: `https://shadow-ledger.io/verify/${proof.hash}`
    };
  }

  /**
   * Hash an activity
   */
  hashActivity(activity) {
    const data = JSON.stringify({
      caregiverId: activity.caregiverId,
      activityType: activity.activityType,
      hours: activity.hours,
      date: activity.date,
      createdAt: activity.createdAt
    });
    
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Sign a proof (simulated - in production use private key)
   */
  signProof(proof) {
    const data = proof.hash + proof.createdAt;
    return crypto
      .createHash('sha256')
      .update(data + 'shadow-ledger-secret')
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Calculate block hash
   */
  calculateHash(block) {
    const data = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      activities: block.activities,
      previousHash: block.previousHash,
      nonce: block.nonce
    });
    
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Mine a new block (simplified proof-of-work)
   */
  mineBlock() {
    if (this.pendingActivities.length === 0) {
      return null;
    }

    const previousBlock = this.chain[this.chain.length - 1];
    
    const newBlock = {
      index: this.chain.length,
      timestamp: new Date().toISOString(),
      activities: [...this.pendingActivities],
      previousHash: previousBlock.hash,
      nonce: 0
    };

    // Simple proof of work
    const target = '0'.repeat(this.difficulty);
    while (!newBlock.hash?.startsWith(target)) {
      newBlock.nonce++;
      newBlock.hash = this.calculateHash(newBlock);
    }

    this.chain.push(newBlock);
    this.pendingActivities = [];

    return {
      blockNumber: newBlock.index,
      hash: newBlock.hash,
      activitiesIncluded: newBlock.activities.length,
      timestamp: newBlock.timestamp
    };
  }

  /**
   * Verify a proof
   */
  verifyProof(proofHash) {
    for (const block of this.chain) {
      for (const activity of block.activities) {
        if (activity.hash === proofHash) {
          return {
            verified: true,
            blockNumber: block.index,
            blockHash: block.hash,
            blockTimestamp: block.timestamp,
            activity: activity,
            chainValid: this.isChainValid()
          };
        }
      }
    }

    // Check pending activities
    const pending = this.pendingActivities.find(a => a.hash === proofHash);
    if (pending) {
      return {
        verified: true,
        status: 'pending',
        message: 'Activity is pending inclusion in next block',
        activity: pending
      };
    }

    return {
      verified: false,
      message: 'Proof not found in chain'
    };
  }

  /**
   * Validate the chain
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify hash
      if (currentBlock.hash !== this.calculateHash(currentBlock)) {
        return false;
      }

      // Verify chain linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get caregiver's activity history from chain
   */
  getCaregiverHistory(caregiverId) {
    const activities = [];
    
    for (const block of this.chain) {
      for (const activity of block.activities) {
        if (activity.caregiverId === caregiverId) {
          activities.push({
            ...activity,
            blockNumber: block.index,
            blockHash: block.hash.substring(0, 16)
          });
        }
      }
    }

    return {
      caregiverId,
      totalActivities: activities.length,
      activities,
      chainValid: this.isChainValid()
    };
  }

  /**
   * Get chain statistics
   */
  getChainStats() {
    let totalActivities = 0;
    let totalHours = 0;
    const caregivers = new Set();

    for (const block of this.chain) {
      totalActivities += block.activities.length;
      for (const activity of block.activities) {
        totalHours += activity.hours || 0;
        if (activity.caregiverId) {
          caregivers.add(activity.caregiverId);
        }
      }
    }

    return {
      blockCount: this.chain.length,
      totalActivities,
      totalHours,
      uniqueCaregivers: caregivers.size,
      pendingActivities: this.pendingActivities.length,
      chainValid: this.isChainValid(),
      difficulty: this.difficulty,
      latestBlockHash: this.chain[this.chain.length - 1].hash.substring(0, 16)
    };
  }

  /**
   * Generate verification certificate
   */
  generateCertificate(proofHash) {
    const verification = this.verifyProof(proofHash);
    
    if (!verification.verified) {
      return null;
    }

    return {
      certificateId: `CERT-${proofHash.substring(0, 8).toUpperCase()}`,
      type: 'Care Activity Verification',
      activity: verification.activity,
      blockNumber: verification.blockNumber,
      blockHash: verification.blockHash,
      issueDate: new Date().toISOString(),
      issuer: 'Shadow-Labor Ledger',
      verificationUrl: `https://shadow-ledger.io/verify/${proofHash}`,
      qrCode: `data:image/svg+xml,<svg>...</svg>`, // Would generate real QR
      valid: true
    };
  }
}

module.exports = new BlockchainProofService();
