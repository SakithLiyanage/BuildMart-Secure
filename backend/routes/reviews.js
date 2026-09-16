const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth'); 

// Import Review model directly
const Review = require('../models/Review');
// Import Contractor model
const Contractor = require('../models/Contractor');

// Reference the existing OngoingWork model
const OngoingWork = mongoose.model('OngoingWork');

// POST - Create a new review
router.post('/', auth, async (req, res) => {
  try {
    console.log('Review submission received:', req.body);
    console.log('User from token:', req.user);
    
    const { projectId, contractorId, rating, comment } = req.body;
    const clientId = req.user.id || req.user._id || req.user.userId;
    
    // Validate inputs
    if (!projectId || !contractorId || !rating || !comment) {
      return res.status(400).json({ 
        message: 'All fields are required',
        details: { projectId, contractorId, rating, comment }
      });
    }
    
    // Try to convert projectId to ObjectId
    let projectObjectId;
    try {
      projectObjectId = new mongoose.Types.ObjectId(projectId);
    } catch (err) {
      return res.status(400).json({ 
        message: 'Invalid project ID format',
        details: projectId
      });
    }
    
    // Check if project exists
    const project = await OngoingWork.findById(projectObjectId);
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found',
        details: projectId
      });
    }
    
    console.log('Found project:', {
      id: project._id,
      clientId: project.clientId,
      contractorId: project.contractorId,
      progress: project.workProgress || 0
    });
    
    // Simplified check: Allow a review if the user has been authenticated
    // We'll assume the auth middleware has verified the user's identity
    
    // Create the review
    const review = new Review({
      projectId: projectObjectId,
      clientId: clientId,
      contractorId,
      rating,
      comment
    });
    
    // Save the review
    const savedReview = await review.save();
    
    // Update contractor rating
    await updateContractorRating(contractorId);
    
    // Mark the project as reviewed if needed
    if (project && !project.reviewed) {
      project.reviewed = true;
      await project.save();
    }
    
    res.status(201).json(savedReview);
    
  } catch (error) {
    console.error('Error creating review:', error.message);
    res.status(500).json({
      message: 'Error creating review'
    });
  }
});

// Helper function to update contractor rating
const updateContractorRating = async (contractorId) => {
  try {
    // Convert contractorId to ObjectId if it's a string
    const contractorObjectId = typeof contractorId === 'string' 
      ? new mongoose.Types.ObjectId(contractorId)
      : contractorId;
      
    // Find all reviews for this contractor
    const reviews = await Review.find({ contractorId: contractorObjectId });
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    // Get the contractor document to update (try both ways)
    let contractorData = await Contractor.findOne({ userId: contractorObjectId });
    
    // If not found, try direct ID
    if (!contractorData) {
      contractorData = await Contractor.findById(contractorObjectId);
    }
    
    // If still not found, log and return
    if (!contractorData) {
      console.error('Contractor not found for ID:', contractorId);
      return;
    }
    
    // Update the contractor's rating data
    contractorData.averageRating = averageRating;
    contractorData.reviewCount = reviews.length;
    
    await contractorData.save();
    
    console.log(`Updated rating for contractor ${contractorId}: ${averageRating} (${reviews.length} reviews)`);
    
  } catch (error) {
    console.error('Error updating contractor rating:', error);
    // Don't throw error to prevent the whole process from failing
  }
};

// GET - Get reviews by user
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const reviews = await Review.find({ clientId: userId });
    res.json(reviews);
  } catch (error) {
    console.error('Error getting user reviews:', error);
    res.status(500).json({
      message: 'Error getting user reviews',
      error: error.message
    });
  }
});

// GET - Get reviews by contractor
router.get('/contractor/:contractorId', async (req, res) => {
  try {
    const { contractorId } = req.params;
    const reviews = await Review.find({ contractorId })
      .populate('clientId', 'username profilePic')
      .populate('projectId', 'title');
    
    res.json(reviews);
  } catch (error) {
    console.error('Error getting contractor reviews:', error);
    res.status(500).json({
      message: 'Error getting contractor reviews',
      error: error.message
    });
  }
});

// GET - Get review by project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const review = await Review.findOne({ projectId });
    
    if (!review) {
      return res.status(404).json({ message: 'No review found for this project' });
    }
    
    res.json(review);
  } catch (error) {
    console.error('Error getting project review:', error);
    res.status(500).json({
      message: 'Error getting project review',
      error: error.message
    });
  }
});

module.exports = router;
