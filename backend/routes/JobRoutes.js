const express = require('express');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Helper to check job ownership
const checkJobOwnership = (job, user) => {
  if (!job || !user) return false;
  if (user.role === 'Admin') return true;
  return job.userid && job.userid.toString() === user.id.toString();
};

// POST: Create a new job (Authenticated)
router.post('/', auth, async (req, res) => {
  const { 
    title, 
    categories,
    area,
    description,
    minBudget,
    maxBudget,
    biddingStartTime, 
    biddingEndTime,
    milestones
  } = req.body;

  try {
    const newJob = new Job({
      userid: req.user.id,
      username: req.user.username || 'User',
      title,
      categories,
      area,
      description,
      minBudget,
      maxBudget,
      biddingStartTime: biddingStartTime || new Date(),
      biddingEndTime,
      milestones: milestones || []
    });

    await newJob.save();
    res.status(201).json({ message: 'Job created successfully', job: newJob });
  } catch (err) {
    console.error('Error creating job:', err.message);
    res.status(500).json({ error: 'Error creating job' });
  }
});

// GET: Fetch all jobs with user info (Public read)
router.get('/', async (req, res) => {
  try {
    const { userid } = req.query;
    const query = userid ? { userid } : {};
    const jobs = await Job.find(query);
    
    const jobsWithUserInfo = await Promise.all(jobs.map(async (job) => {
      const jobObj = job.toObject();
      if (!jobObj.username && jobObj.userid) {
        try {
          const user = await User.findById(jobObj.userid);
          jobObj.username = user ? user.username : 'Unknown User';
        } catch (error) {
          jobObj.username = 'Unknown User';
        }
      }
      return jobObj;
    }));
    
    res.status(200).json(jobsWithUserInfo);
  } catch (err) {
    console.error('Error fetching jobs:', err.message);
    res.status(500).json({ error: 'Error fetching jobs' });
  }
});

// GET: Fetch a specific job by ID (Public read)
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const jobData = job.toObject();
    if (!jobData.username && jobData.userid) {
      try {
        const user = await User.findById(jobData.userid);
        if (user) jobData.username = user.username;
      } catch (userErr) {
        // ignore error
      }
    }
    
    res.status(200).json(jobData);
  } catch (err) {
    console.error('Error fetching job details:', err.message);
    res.status(500).json({ error: 'Error fetching job details' });
  }
});

// V04: Put auction status with ownership check
router.put('/:id/auction-status', auth, async (req, res) => {
  const { status } = req.body;
  
  if (!['Active', 'Pending', 'Closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!checkJobOwnership(job, req.user)) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this job' });
    }
    
    if (status === 'Active' && job.status !== 'Active') {
      job.biddingStartTime = new Date();
    }
    if (status === 'Closed' && job.status === 'Active') {
      job.biddingEndTime = new Date();
    }
    
    job.status = status;
    await job.save();
    
    res.status(200).json({ 
      message: 'Auction status updated successfully', 
      job: job.toObject()
    });
  } catch (err) {
    console.error('Error updating auction status:', err.message);
    res.status(500).json({ error: 'Error updating auction status' });
  }
});

// V04: Delete job with ownership check
router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (!checkJobOwnership(job, req.user)) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this job' });
    }
    
    await Job.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Error deleting job:', err.message);
    res.status(500).json({ error: 'Error deleting job' });
  }
});

// V04: Accept bid with ownership check
router.put('/:id/accept-bid', auth, async (req, res) => {
  try {
    const { bidId, acceptedBidAmount, milestones } = req.body;
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!checkJobOwnership(job, req.user)) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this job' });
    }
    
    job.acceptedBid = bidId;
    job.acceptedBidAmount = acceptedBidAmount;
    job.milestones = milestones;
    job.status = 'Closed';
    
    await job.save();
    
    res.status(200).json({ 
      message: 'Bid accepted and milestones saved successfully',
      job
    });
  } catch (err) {
    console.error('Error accepting bid:', err.message);
    res.status(500).json({ error: 'Error accepting bid' });
  }
});

// V04: Update job details with ownership check
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      title, 
      categories,
      area,
      description,
      minBudget,
      maxBudget,
      biddingStartTime, 
      biddingEndTime,
      milestones
    } = req.body;

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!checkJobOwnership(job, req.user)) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this job' });
    }
    
    job.title = title || job.title;
    job.categories = categories || job.categories;
    job.area = area || job.area;
    job.description = description || job.description;
    job.minBudget = minBudget || job.minBudget;
    job.maxBudget = maxBudget || job.maxBudget;
    job.biddingStartTime = biddingStartTime || job.biddingStartTime;
    job.biddingEndTime = biddingEndTime || job.biddingEndTime;
    
    if (milestones) {
      job.milestones = milestones;
    }
    
    await job.save();
    res.status(200).json({ message: 'Job updated successfully', job });
  } catch (err) {
    console.error('Error updating job:', err.message);
    res.status(500).json({ error: 'Error updating job' });
  }
});

// Update all auction statuses
router.get('/update-all-auction-statuses', async (req, res) => {
  try {
    const pendingJobs = await Job.find({ status: 'Pending' });
    const activeJobs = await Job.find({ status: 'Active' });
    let updatedCount = 0;
    
    const now = new Date();
    for (const job of pendingJobs) {
      if (now >= new Date(job.biddingStartTime)) {
        job.status = 'Active';
        await job.save();
        updatedCount++;
      }
    }
    
    for (const job of activeJobs) {
      if (now >= new Date(job.biddingEndTime)) {
        job.status = 'Closed';
        await job.save();
        updatedCount++;
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: `Updated ${updatedCount} jobs` 
    });
  } catch (error) {
    console.error('Error updating auction statuses:', error.message);
    res.status(500).json({ error: 'Failed to update auction statuses' });
  }
});

// V04: Restart closed job with ownership check
router.put('/:id/restart', auth, async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!checkJobOwnership(job, req.user)) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this job' });
    }
    
    if (job.status !== 'Closed') {
      return res.status(400).json({ error: 'Only closed jobs can be restarted' });
    }
    
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + 7);
    
    const { biddingEndTime } = req.body;
    job.status = 'Active';
    job.biddingStartTime = now;
    job.biddingEndTime = biddingEndTime || endDate;
    job.wasReopened = true;
    
    await job.save();
    
    res.status(200).json({ 
      message: 'Job restarted successfully', 
      job 
    });
  } catch (err) {
    console.error('Error restarting job:', err.message);
    res.status(500).json({ error: 'Error restarting job' });
  }
});

module.exports = router;
