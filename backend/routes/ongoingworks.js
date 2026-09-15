const express = require('express');
const router = express.Router();
const OngoingWork = require('../models/Ongoingworkmodel');
const Job = require('../models/Job');
const Contractor = require('../models/Contractor');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

const COMMISSION_RATE = 0.10; 

// Helper function to increment contractor's completed projects
const incrementCompletedProjects = async (contractorId) => {
  try {
    const contractor = await Contractor.findOne({ userId: contractorId });
    if (!contractor) return false;
    
    const completedWorks = await OngoingWork.countDocuments({
      contractorId: contractorId,
      jobStatus: 'Completed'
    });
    
    const manualCount = contractor.manualCompletedProjects || 0;
    contractor.completedProjects = manualCount + completedWorks;
    await contractor.save();
    return true;
  } catch (error) {
    console.error('Error incrementing completed projects:', error.message);
    return false;
  }
};

const isAuthorizedParticipant = (work, user) => {
  if (!work || !user) return false;
  if (user.role === 'Admin') return true;
  const cId = work.clientId?.toString();
  const contId = work.contractorId?.toString();
  return cId === user.id.toString() || contId === user.id.toString();
};

// V06: Get all ongoing works (Admin only)
router.get('/admin/all', auth, requireAdmin, async (req, res) => {
  try {
    const ongoingWorks = await OngoingWork.find().populate('jobId');
    res.status(200).json(ongoingWorks);
  } catch (error) {
    console.error('Error fetching ongoing works:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// V06: Get ongoing works for a specific client (Client self or Admin)
router.get('/client/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (req.user.id !== clientId && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized access to client projects' });
    }

    let ongoingWorks = await OngoingWork.find({ clientId }).populate('jobId');
    if (ongoingWorks.length === 0 && clientId.match(/^[0-9a-fA-F]{24}$/)) {
      const objectIdClientId = new mongoose.Types.ObjectId(clientId);
      const objectIdWorks = await OngoingWork.find({ clientId: objectIdClientId }).populate('jobId');
      if (objectIdWorks.length > 0) ongoingWorks = objectIdWorks;
    }

    res.status(200).json(ongoingWorks);
  } catch (error) {
    console.error('Error fetching client ongoing works:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// V06: Get ongoing works for a specific contractor (Contractor self or Admin)
router.get('/contractor/:contractorId', auth, async (req, res) => {
  try {
    const { contractorId } = req.params;
    if (req.user.id !== contractorId && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized access to contractor projects' });
    }

    const ongoingWorks = await OngoingWork.find({ contractorId }).populate('jobId');
    res.status(200).json(ongoingWorks);
  } catch (error) {
    console.error('Error fetching contractor ongoing works:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific ongoing work by ID (Participant or Admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const ongoingWork = await OngoingWork.findById(req.params.id).populate('jobId');
    if (!ongoingWork) {
      return res.status(404).json({ message: 'Ongoing work not found' });
    }

    if (!isAuthorizedParticipant(ongoingWork, req.user)) {
      return res.status(403).json({ message: 'Unauthorized to view this ongoing work' });
    }

    res.status(200).json(ongoingWork);
  } catch (error) {
    console.error('Error fetching ongoing work details:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get ongoing work by job ID (Participant or Admin)
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const ongoingWork = await OngoingWork.findOne({ jobId: req.params.jobId });
    if (!ongoingWork) {
      return res.status(404).json({ message: 'Ongoing work not found for this job' });
    }

    if (!isAuthorizedParticipant(ongoingWork, req.user)) {
      return res.status(403).json({ message: 'Unauthorized to view this work' });
    }

    res.status(200).json(ongoingWork);
  } catch (error) {
    console.error('Error fetching ongoing work by job ID:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new ongoing work (Authenticated)
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, clientId, contractorId, milestones, totalPrice, timeline } = req.body;
    
    if (!jobId || !clientId || !contractorId || totalPrice === undefined) {
      return res.status(400).json({ message: 'Missing required fields for ongoing work creation' });
    }

    if (req.user.id !== clientId.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized: Only client or admin can initiate ongoing work' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    const existingWork = await OngoingWork.findOne({ jobId });
    if (existingWork) {
      return res.status(409).json({ 
        message: 'An ongoing work for this job already exists',
        existingWorkId: existingWork._id
      });
    }
    
    const parsedTimeline = parseInt(timeline) || 30;
    
    let totalAmountPending = 0;
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      totalAmountPending = milestones.reduce((sum, milestone) => {
        return sum + (parseInt(milestone.amount) || 0);
      }, 0);
    }
    
    const newOngoingWork = new OngoingWork({
      jobId,
      clientId: clientId.toString(),
      contractorId: contractorId.toString(),
      milestones: milestones || [],
      totalAmountPending,
      totalPrice: Number(totalPrice),
      workProgress: 0,
      timeline: parsedTimeline,
      jobStatus: 'In Progress'
    });
    
    const savedWork = await newOngoingWork.save();
    await Job.findByIdAndUpdate(jobId, { status: 'Active' });
    
    res.status(201).json(savedWork);
  } catch (error) {
    console.error('Error creating ongoing work:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ongoing work details (Participant or Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const { workProgress, jobStatus, milestones, totalPrice } = req.body;
    const ongoingWorkId = req.params.id;
    
    const ongoingWork = await OngoingWork.findById(ongoingWorkId);
    if (!ongoingWork) {
      return res.status(404).json({ message: 'Ongoing work not found' });
    }

    if (!isAuthorizedParticipant(ongoingWork, req.user)) {
      return res.status(403).json({ message: 'Unauthorized to update this ongoing work' });
    }
    
    const becomingCompleted = jobStatus === 'Completed' && ongoingWork.jobStatus !== 'Completed';
    
    if (workProgress !== undefined) ongoingWork.workProgress = workProgress;
    if (jobStatus) ongoingWork.jobStatus = jobStatus;
    if (milestones) ongoingWork.milestones = milestones;
    if (totalPrice !== undefined) ongoingWork.totalPrice = Number(totalPrice);
    
    if (milestones) {
      let totalAmountPending = 0;
      let totalAmountPaid = 0;
      
      milestones.forEach(milestone => {
        const amount = parseInt(milestone.amount) || 0;
        if (milestone.status === 'Completed' && milestone.actualAmountPaid) {
          totalAmountPaid += milestone.actualAmountPaid;
        } else {
          totalAmountPending += amount;
        }
      });
      
      ongoingWork.totalAmountPaid = totalAmountPaid;
      ongoingWork.totalAmountPending = totalAmountPending;
    }
    
    if (becomingCompleted) {
      await Job.findByIdAndUpdate(ongoingWork.jobId, { status: 'Closed' });
      await incrementCompletedProjects(ongoingWork.contractorId);
    }
    
    await ongoingWork.save();
    res.status(200).json(ongoingWork);
  } catch (error) {
    console.error('Error updating ongoing work:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update milestone status (Participant or Admin)
router.patch('/:id/milestone/:milestoneIndex', auth, async (req, res) => {
  try {
    const { status, actualAmountPaid, completedAt, notes } = req.body;
    const { id, milestoneIndex } = req.params;
    
    const ongoingWork = await OngoingWork.findById(id);
    if (!ongoingWork) {
      return res.status(404).json({ message: 'Ongoing work not found' });
    }

    if (!isAuthorizedParticipant(ongoingWork, req.user)) {
      return res.status(403).json({ message: 'Unauthorized to update milestone' });
    }
    
    const milestoneIdx = parseInt(milestoneIndex);
    if (milestoneIdx < 0 || milestoneIdx >= ongoingWork.milestones.length) {
      return res.status(400).json({ message: 'Invalid milestone index' });
    }
    
    if (status) {
      const validStatuses = ['Pending', 'In Progress', 'Pending Verification', 'Ready For Payment', 'Completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      
      ongoingWork.milestones[milestoneIdx].status = status;
      
      if (status === 'Pending Verification' && !ongoingWork.milestones[milestoneIdx].completedAt) {
        ongoingWork.milestones[milestoneIdx].completedAt = completedAt || new Date();
      }
      
      if (status === 'Completed' && actualAmountPaid) {
        ongoingWork.milestones[milestoneIdx].actualAmountPaid = actualAmountPaid;
        ongoingWork.lastPaymentDate = new Date();
        
        const originalAmount = parseFloat(ongoingWork.milestones[milestoneIdx].amount || 0);
        const commission = originalAmount * COMMISSION_RATE;
        
        ongoingWork.milestones[milestoneIdx].commission = commission;
        ongoingWork.milestones[milestoneIdx].originalAmount = originalAmount;
        ongoingWork.totalCommission = (ongoingWork.totalCommission || 0) + commission;
      }
    }
    
    if (notes) {
      ongoingWork.milestones[milestoneIdx].notes = notes;
    }
    
    let completedCount = 0;
    let totalAmountPaid = 0;
    let totalAmountPending = 0;
    
    ongoingWork.milestones.forEach(milestone => {
      const amount = parseFloat(milestone.amount || 0);
      if (milestone.status === 'Completed') {
        totalAmountPaid += milestone.actualAmountPaid || amount;
        completedCount++;
      } else {
        totalAmountPending += amount;
      }
      
      if (milestone.status === 'Pending Verification' || milestone.status === 'Ready For Payment') {
        completedCount += 0.5; 
      }
    });
    
    ongoingWork.totalAmountPaid = totalAmountPaid;
    ongoingWork.totalAmountPending = totalAmountPending;
    ongoingWork.workProgress = Math.round((completedCount / ongoingWork.milestones.length) * 100);
    
    const allCompleted = ongoingWork.milestones.every(m => m.status === 'Completed');
    if (allCompleted) {
      const wasAlreadyCompleted = ongoingWork.jobStatus === 'Completed';
      ongoingWork.jobStatus = 'Completed';
      ongoingWork.workProgress = 100;
      await Job.findByIdAndUpdate(ongoingWork.jobId, { status: 'Closed' });
      
      if (!wasAlreadyCompleted) {
        await incrementCompletedProjects(ongoingWork.contractorId);
      }
    }
    
    await ongoingWork.save();
    res.status(200).json(ongoingWork);
  } catch (error) {
    console.error('Error updating milestone:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint to get completed project counts for a contractor
router.get('/completed-count/:contractorId', async (req, res) => {
  try {
    const { contractorId } = req.params;
    
    const systemCompletedCount = await OngoingWork.countDocuments({ 
      contractorId, 
      jobStatus: 'Completed' 
    });
    
    const contractor = await Contractor.findOne({ userId: contractorId });
    if (!contractor) {
      return res.status(404).json({ 
        message: 'Contractor not found',
        systemCount: systemCompletedCount,
        manualCount: 0,
        totalCount: systemCompletedCount
      });
    }
    
    const manualCompletedCount = contractor.manualCompletedProjects || 0;
    res.status(200).json({
      message: 'Completed projects counts retrieved successfully',
      systemCount: systemCompletedCount,
      manualCount: manualCompletedCount,
      totalCount: systemCompletedCount + manualCompletedCount
    });
  } catch (error) {
    console.error('Error fetching completed projects count:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
