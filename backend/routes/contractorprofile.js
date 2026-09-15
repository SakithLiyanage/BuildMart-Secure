const express = require('express');
const router = express.Router();
const Contractor = require('../models/Contractor');
const OngoingWork = require('../models/Ongoingworkmodel');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); 
const auth = require('../middleware/auth'); 

router.post('/', async (req, res) => {
  try {
    // Check if contractor profile already exists for this user
    const existingContractor = await Contractor.findOne({ userId: req.body.userId });
    if (existingContractor) {
      return res.status(400).json({ error: 'Contractor profile already exists for this user' });
    }

    // Create new contractor profile
    const contractorData = {
      userId: req.body.userId, 
      phone: req.body.phone,
      address: req.body.address,
      companyName: req.body.companyName,
      specialization: req.body.specialization,
      experienceYears: req.body.experienceYears,
      completedProjects: req.body.completedProjects,
      bio: req.body.bio
    };

    const contractor = new Contractor(contractorData);
    await contractor.save();

    res.status(201).json(contractor);
  } catch (error) {
    console.error('Error creating contractor profile:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const contractors = await Contractor.find()
      .populate('userId', 'username email profilePic');
    res.json(contractors);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === 'profile') {
    
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const authUserId = decoded.id || decoded.userId;
        
        const contractor = await Contractor.findOne({ userId: authUserId });
        
        if (!contractor) {
          return res.status(404).json({ error: 'Contractor profile not found' });
        }
        
        return res.json(contractor);
      } catch (err) {
        return res.status(401).json({ error: 'Token is not valid' });
      }
    }
    
    const contractor = await Contractor.findOne({ userId });
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    
    res.json(contractor);
  } catch (error) {
    console.error('Error fetching contractor:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/user/:userId', async (req, res) => {
  try {
    const contractor = await Contractor.findOne({ userId: req.params.userId })
      .populate('userId', 'username email profilePic');
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    
    const manualCount = contractor.manualCompletedProjects || contractor.completedProjects || 0;
    
    try {
      const completedWorks = await OngoingWork.countDocuments({
        contractorId: req.params.userId,
        jobStatus: 'Completed'
      });
      
      contractor._doc.systemCompletedProjects = completedWorks;
      contractor._doc.manualCompletedProjects = manualCount;
      contractor._doc.totalCompletedProjects = manualCount + completedWorks;
      
      if (contractor.completedProjects !== manualCount + completedWorks) {
        contractor.completedProjects = manualCount + completedWorks;
        
        contractor.manualCompletedProjects = manualCount;
        
        await contractor.save();
      }
      
    } catch (syncError) {
      console.error('Error syncing completed projects count:', syncError);
    }
    
    res.json(contractor);
  } catch (error) {
    console.error('Error fetching contractor by user ID:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Invalid user ID format' });
    }
    
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === 'profile') {

      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const authUserId = decoded.id || decoded.userId;
        
        const contractor = await Contractor.findOne({ userId: authUserId });
        
        if (!contractor) {
          return res.status(404).json({ error: 'Contractor profile not found' });
        }
        
        return res.json(contractor);
      } catch (err) {
        return res.status(401).json({ error: 'Token is not valid' });
      }
    }

    const contractor = await Contractor.findOne({ userId });
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    
    const manualCount = contractor.manualCompletedProjects || contractor.completedProjects || 0;
    
    try {
      const completedWorks = await OngoingWork.countDocuments({
        contractorId: userId,
        jobStatus: 'Completed'
      });
      
      contractor._doc.systemCompletedProjects = completedWorks;
      contractor._doc.manualCompletedProjects = manualCount;
      contractor._doc.totalCompletedProjects = manualCount + completedWorks;
      
      if (contractor.completedProjects !== manualCount + completedWorks) {
        contractor.completedProjects = manualCount + completedWorks;
        
        contractor.manualCompletedProjects = manualCount;
        
        await contractor.save();
      }
    } catch (syncError) {
      console.error('Error syncing completed projects count:', syncError);
    }
    
    res.json(contractor);
  } catch (error) {
    console.error('Error fetching contractor:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    let contractor = await Contractor.findById(req.params.id);
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // V10: IDOR ownership verification
    if (contractor.userId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to modify this contractor profile' });
    }
    
    const updateData = {};
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.address) updateData.address = req.body.address;
    if (req.body.companyName !== undefined) updateData.companyName = req.body.companyName; // Allow null
    if (req.body.specialization) updateData.specialization = req.body.specialization;
    if (req.body.experienceYears) updateData.experienceYears = req.body.experienceYears;
    
    if (req.body.completedProjects !== undefined) {
      updateData.manualCompletedProjects = parseInt(req.body.completedProjects);
      
      const completedWorks = await OngoingWork.countDocuments({
        contractorId: contractor.userId,
        jobStatus: 'Completed'
      });
      
      updateData.completedProjects = updateData.manualCompletedProjects + completedWorks;
      
      console.log(`Updating contractor ${contractor._id} projects: manual=${updateData.manualCompletedProjects}, system=${completedWorks}, total=${updateData.completedProjects}`);
    }
    
    if (req.body.bio) updateData.bio = req.body.bio;
    
    const updatedContractor = await Contractor.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    
    res.json(updatedContractor);
  } catch (error) {
    console.error('Error updating contractor profile:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/refresh-completed-projects/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Refreshing completed projects for contractor with userId: ${userId}`);
    
    // Find the contractor
    let contractor = await Contractor.findOne({ userId });
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    
    // Get manual count from stored value or from query parameter
    const manualCount = req.query.manualCount !== undefined ? 
                        parseInt(req.query.manualCount) : 
                        contractor.manualCompletedProjects || 0;
    
    console.log(`Manual count from ${req.query.manualCount !== undefined ? 'query' : 'database'}: ${manualCount}`);
    
    // Count completed works for this contractor
    const completedWorks = await OngoingWork.countDocuments({ 
      contractorId: userId, 
      jobStatus: 'Completed' 
    });
    
    console.log(`System completed works count: ${completedWorks}`);
    
    // Store manual count separately
    contractor.manualCompletedProjects = manualCount;
    
    // Set total as sum of manual + system
    contractor.completedProjects = manualCount + completedWorks;
    
    await contractor.save();
    
    console.log(`Updated completed projects to ${contractor.completedProjects} (${manualCount} manual + ${completedWorks} system)`);
    
    res.status(200).json({
      message: 'Completed projects count refreshed successfully',
      manualCount,
      systemCount: completedWorks,
      totalCount: contractor.completedProjects,
      contractor: {
        ...contractor._doc,
        manualCompletedProjects: manualCount,
        systemCompletedProjects: completedWorks,
        totalCompletedProjects: contractor.completedProjects
      }
    });
  } catch (error) {
    console.error('Error refreshing completed projects:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/fix-project-counts/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { resetManualTo } = req.body;

    if (userId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to modify project metrics' });
    }
    
    console.log(`Fixing completed projects counts for contractor: ${userId}`);
    console.log(`Request to set manual count to: ${resetManualTo !== undefined ? resetManualTo : '(not specified)'}`);
    
    // Find the contractor
    const contractor = await Contractor.findOne({ userId });
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    
    // Get the actual count from the system
    const systemCompletedCount = await OngoingWork.countDocuments({
      contractorId: userId,
      jobStatus: 'Completed'
    });
    
    console.log(`Current values - manual: ${contractor.manualCompletedProjects}, total: ${contractor.completedProjects}, system actual: ${systemCompletedCount}`);
    
    // Set manual count to provided value or keep existing
    const manualCount = resetManualTo !== undefined ? 
                       parseInt(resetManualTo) : 
                       contractor.manualCompletedProjects || 0;
    
    // Fix the counts
    contractor.manualCompletedProjects = manualCount;
    contractor.completedProjects = manualCount + systemCompletedCount;
    
    await contractor.save();
    
    console.log(`Fixed completed projects for ${userId}: manual=${manualCount}, system=${systemCompletedCount}, total=${contractor.completedProjects}`);
    
    res.status(200).json({
      message: 'Project counts fixed successfully',
      before: {
        storedManualCount: contractor.manualCompletedProjects !== manualCount ? contractor.manualCompletedProjects : manualCount,
        storedTotal: contractor.completedProjects !== (manualCount + systemCompletedCount) ? contractor.completedProjects : (manualCount + systemCompletedCount)
      },
      after: {
        manualCount,
        systemCount: systemCompletedCount,
        totalCount: manualCount + systemCompletedCount
      },
      contractor
    });
  } catch (error) {
    console.error('Error fixing project counts:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Search and filter contractors
router.get('/search/filters', async (req, res) => {
  try {
    const { specialization, location, verified } = req.query;
    
    // Build search query
    const searchQuery = {};
    
    if (specialization) {
      searchQuery['specialization.0'] = { $in: [specialization] };
    }
    
    if (location) {
      searchQuery.address = { $regex: location, $options: 'i' };
    }
    
    if (verified === 'true') {
      searchQuery.verified = true;
    }
    
    const contractors = await Contractor.find(searchQuery)
      .populate('userId', 'username email profilePic');
    
    res.json(contractors);
  } catch (error) {
    console.error('Error searching contractors:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;