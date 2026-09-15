const express = require('express');
const router = express.Router();
const Inquiry = require('../models/inquiryModel');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

// V09: Protect inquiry routes against IDOR & unauthorized tampering

// Get all inquiries (Admin sees all, user sees own)
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'Admin') {
      filter.userId = req.user.id;
    }
    const inquiries = await Inquiry.find(filter).sort({ submittedAt: -1 });
    res.json(inquiries);
  } catch (error) {
    console.error('Error fetching inquiries:', error.message);
    res.status(500).json({ message: 'Server error while fetching inquiries' });
  }
});

// Get a specific inquiry by ID (Owner or Admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    if (inquiry.userId && inquiry.userId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized to view this inquiry' });
    }

    res.json(inquiry);
  } catch (error) {
    console.error('Error fetching inquiry:', error.message);
    res.status(500).json({ message: 'Server error while fetching inquiry' });
  }
});

// Create a new inquiry (Authenticated)
router.post('/', auth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      priority, 
      projectId, 
      projectName
    } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const inquiry = new Inquiry({
      title,
      description,
      category: category || 'technical',
      priority: priority || 'medium',
      projectId,
      projectName,
      userId: req.user.id,
      username: req.user.username, 
      userRole: req.user.role,
      status: 'pending',
      submittedAt: new Date()
    });
    
    const savedInquiry = await inquiry.save();
    res.status(201).json(savedInquiry);
  } catch (error) {
    console.error('Error creating inquiry:', error.message);
    res.status(500).json({ message: 'Server error while creating inquiry' });
  }
});

// Update inquiry status (Admin only or Owner resolving)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    if (inquiry.userId && inquiry.userId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized to update this inquiry' });
    }
    
    inquiry.status = status;
    if (status === 'resolved') {
      inquiry.resolvedAt = new Date();
    }
    
    await inquiry.save();
    res.json(inquiry);
  } catch (error) {
    console.error('Error updating inquiry status:', error.message);
    res.status(500).json({ message: 'Server error while updating status' });
  }
});

// Delete an inquiry (Owner or Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    if (inquiry.userId && inquiry.userId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this inquiry' });
    }
    
    await Inquiry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Error deleting inquiry:', error.message);
    res.status(500).json({ message: 'Server error while deleting inquiry' });
  }
});

// Get inquiries by project ID (Participant or Admin)
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ projectId: req.params.projectId });
    res.json(inquiries);
  } catch (error) {
    console.error('Error fetching project inquiries:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
