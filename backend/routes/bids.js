const express = require('express');
const rateLimit = require('express-rate-limit');
const Bid = require('../models/bidModel');
const Job = require('../models/Job');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiter for bidding operations (V18)
const bidLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many bid requests, please slow down.' }
});

// ==========================================
// 1. SUBMIT BID (V05 Missing Auth & V17 Contractor Spoofing)
// ==========================================
router.post('/submit', auth, bidLimiter, async (req, res) => {
  try {
    const { 
      projectId, 
      price, 
      timeline, 
      qualifications, 
      rating, 
      completedProjects,
      costBreakdown,
      timelineBreakdown,
      specialRequests
    } = req.body;

    // V17: Derive contractor identity strictly from authenticated JWT token
    const contractorId = req.user.id;
    const contractorname = req.user.username || 'Contractor';

    // Input validation
    if (!projectId || !price || !timeline) {
      return res.status(400).json({ error: 'Missing required bid fields' });
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'Invalid bid price' });
    }

    // Check if contractor already bid
    const existingBid = await Bid.findOne({ 
      projectId,
      contractorId
    });
    
    if (existingBid) {
      return res.status(400).json({ 
        error: 'Duplicate bid',
        message: 'You have already submitted a bid for this project'
      });
    }

    // Find current lowest bid for this project
    const lowestBid = await Bid.findOne({ projectId })
      .sort({ price: 1 })
      .limit(1);
      
    if (lowestBid) {
      let minDecrement;
      const currentMinPrice = lowestBid.price;
      
      if (currentMinPrice <= 15000) {
        minDecrement = 200;
      } else if (currentMinPrice <= 100000) {
        minDecrement = 1000;
      } else {
        minDecrement = 2000;
      }
      
      const requiredPrice = currentMinPrice - minDecrement;
      
      if (numPrice > requiredPrice) {
        return res.status(400).json({
          error: 'insufficient_decrement',
          message: `Your bid must be at least LKR ${minDecrement.toLocaleString()} less than current lowest bid`,
          currentLowestBid: currentMinPrice,
          requiredBid: requiredPrice,
          minDecrement
        });
      }
    }

    // Check if bid is below project minimum budget
    const job = await Job.findById(projectId);
    if (job && job.minBudget && numPrice < job.minBudget) {
      return res.status(400).json({
        error: 'below Min Budget',
        message: `Your bid cannot be lower than project minimum budget of LKR ${job.minBudget.toLocaleString()}`,
        minBudget: job.minBudget
      });
    }

    // Check for duplicate price
    const duplicatePriceBid = await Bid.findOne({
      projectId,
      price: numPrice
    });

    if (duplicatePriceBid) {
      return res.status(400).json({
        error: 'Duplicate price',
        message: 'Another bid with this exact price already exists. Please adjust price.'
      });
    }

    const newBid = new Bid({
      projectId,
      contractorId,
      contractorname,
      price: numPrice,
      timeline,
      qualifications,
      rating: rating || 0,
      completedProjects: completedProjects || 0,
      ...(costBreakdown && { costBreakdown }),
      ...(timelineBreakdown && { timelineBreakdown }),
      ...(specialRequests && { specialRequests })
    });
    
    await newBid.save();
    
    res.status(201).json({
      message: 'Bid submitted successfully',
      bid: newBid
    });
  } catch (error) {
    console.error('Bid submission error:', error.message);
    res.status(500).json({ error: 'Internal server error submitting bid' });
  }
});

// GET all bids (Public read)
router.get('/', async (req, res) => {
  try {
    const bids = await Bid.find();
    res.json(bids);
  } catch (error) {
    console.error('Error fetching bids:', error.message);
    res.status(500).json({ error: 'Error fetching bids' });
  }
});

// GET bids by project (Public read)
router.get('/project/:projectId', async (req, res) => {
  try {
    const bids = await Bid.find({ projectId: req.params.projectId });
    res.json(bids);
  } catch (error) {
    console.error('Error fetching project bids:', error.message);
    res.status(500).json({ error: 'Error fetching project bids' });
  }
});

// ==========================================
// 2. BID STATUS (V05 Project Owner Authorization)
// ==========================================
router.put('/:bidId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const bid = await Bid.findById(req.params.bidId);
    if (!bid) return res.status(404).json({ error: 'Bid not found' });

    // Verify caller owns the project or is admin
    const job = await Job.findById(bid.projectId);
    if (!job) return res.status(404).json({ error: 'Associated project not found' });

    if (job.userid && job.userid.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized: Only project owner can accept/reject bids' });
    }

    bid.status = status;
    await bid.save();

    if (status === 'accepted') {
      await Bid.updateMany(
        { 
          projectId: bid.projectId, 
          _id: { $ne: bid._id },
          status: 'pending'
        },
        { status: 'rejected' }
      );
    }

    res.json({ message: `Bid ${status} successfully`, bid });
  } catch (error) {
    console.error('Error updating bid status:', error.message);
    res.status(500).json({ error: 'Error updating bid status' });
  }
});

// ==========================================
// 3. UPDATE BID (V11 Contractor IDOR Prevention)
// ==========================================
router.put('/update/:bidId', auth, async (req, res) => {
  try {
    const { bidId } = req.params;
    const { price, timeline, qualifications, costBreakdown, timelineBreakdown } = req.body;
    
    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }
    
    // V11 IDOR check: Verify caller is the authenticated creator of this bid
    if (bid.contractorId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized: You can only update your own bids' });
    }
    
    if (bid.status !== 'pending') {
      return res.status(400).json({ 
        error: `This bid can no longer be updated as it has been ${bid.status}` 
      });
    }
    
    if (bid.updateCount >= 3) {
      return res.status(400).json({ 
        error: 'Maximum number of updates (3) reached for this bid' 
      });
    }
    
    const numPrice = price ? parseFloat(price) : null;
    if (numPrice && numPrice !== bid.price) {
      const lowestBid = await Bid.findOne({ 
        projectId: bid.projectId,
        _id: { $ne: bidId } 
      }).sort({ price: 1 }).limit(1);
      
      if (lowestBid) {
        let minDecrement;
        const currentMinPrice = lowestBid.price;
        
        if (currentMinPrice <= 15000) {
          minDecrement = 200;
        } else if (currentMinPrice <= 100000) {
          minDecrement = 1000;
        } else {
          minDecrement = 2000;
        }
        
        const requiredPrice = currentMinPrice - minDecrement;
        if (numPrice > requiredPrice) {
          return res.status(400).json({
            error: 'insufficient_decrement',
            message: `Your updated bid must be at least LKR ${minDecrement.toLocaleString()} less than lowest bid`,
            currentLowestBid: currentMinPrice,
            requiredBid: requiredPrice,
            minDecrement
          });
        }
      }
      
      const job = await Job.findById(bid.projectId);
      if (job && job.minBudget && numPrice < job.minBudget) {
        return res.status(400).json({
          error: 'below_min_budget',
          message: `Your bid cannot be lower than project minimum budget of LKR ${job.minBudget.toLocaleString()}`,
          minBudget: job.minBudget
        });
      }
      
      const duplicatePriceBid = await Bid.findOne({
        projectId: bid.projectId,
        price: numPrice,
        _id: { $ne: bidId }
      });
      
      if (duplicatePriceBid) {
        return res.status(400).json({
          error: 'Duplicate price',
          message: 'Another bid with this exact price already exists. Please adjust price.',
          suggestedPrice: numPrice + 1 
        });
      }
    }
    
    const previousPrice = {
      price: bid.price,
      updatedAt: new Date()
    };
    
    bid.previousPrices = bid.previousPrices || [];
    bid.previousPrices.push(previousPrice);
    bid.updateCount += 1;
    if (numPrice) bid.price = numPrice;
    
    if (timeline) bid.timeline = timeline;
    if (qualifications) bid.qualifications = qualifications;
    if (costBreakdown) bid.costBreakdown = costBreakdown;
    if (timelineBreakdown) bid.timelineBreakdown = timelineBreakdown;
    
    await bid.save();
    
    res.json({ 
      message: 'Bid updated successfully', 
      bid,
      updatesRemaining: 3 - bid.updateCount
    });
  } catch (error) {
    console.error('Error updating bid:', error.message);
    res.status(500).json({ error: 'Internal server error updating bid' });
  }
});

// GET bids by contractor ID (IDOR Protected: User can only see own bids or Admin)
router.get('/contractor/:contractorId', auth, async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (req.user.id !== contractorId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to view bids for this contractor' });
    }
    
    const bids = await Bid.find({ contractorId });
    res.json(bids);
  } catch (error) {
    console.error('Error fetching contractor bids:', error.message);
    res.status(500).json({ error: 'Error fetching contractor bids' });
  }
});

// GET lowest bid
router.get('/project/:projectId/lowest', async (req, res) => {
  try {
    const lowestBid = await Bid.findOne({ projectId: req.params.projectId })
      .sort({ price: 1 })
      .limit(1);
    
    if (!lowestBid) {
      return res.json({ exists: false });
    }
    
    res.json({ 
      exists: true,
      price: lowestBid.price,
      minDecrement: lowestBid.price <= 15000 ? 200 : 
                   lowestBid.price <= 100000 ? 1000 : 2000
    });
  } catch (error) {
    console.error('Error fetching lowest bid:', error.message);
    res.status(500).json({ error: 'Error fetching lowest bid' });
  }
});

router.get('/auction/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const bids = await Bid.find({ projectId });
    res.json(bids);
  } catch (error) {
    console.error('Error fetching project bids:', error.message);
    res.status(500).json({ message: 'Error fetching project bids' });
  }
});

module.exports = router;
