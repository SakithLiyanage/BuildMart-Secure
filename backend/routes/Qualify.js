const express = require('express');
const router = express.Router();
const Qualification = require('../models/Qualification');
const qualificationUpload = require('../middleware/qualificationUpload');
const path = require('path');
const fs = require('fs');

// GET qualifications for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const qualifications = await Qualification.find({ userId });
    
    // Convert relative file paths to full URLs for frontend display
    const processedQualifications = qualifications.map(qual => {
      const qualObj = qual.toObject();
      
      // Check if documentImage exists and is a path (not a base64 string)
      if (qualObj.documentImage && !qualObj.documentImage.startsWith('data:')) {
        // Convert to full URL if it's a local path
        if (!qualObj.documentImage.startsWith('http')) {
          qualObj.documentImage = `http://localhost:5000${qualObj.documentImage}`;
        }
      }
      
      return qualObj;
    });
    
    res.json(processedQualifications);
  } catch (error) {
    console.error('Error fetching qualifications:', error);
    res.status(500).json({ error: 'Failed to fetch qualifications' });
  }
});

// GET a specific qualification
router.get('/:id', async (req, res) => {
  try {
    const qualification = await Qualification.findById(req.params.id);
    
    if (!qualification) {
      return res.status(404).json({ error: 'Qualification not found' });
    }
    
    // Convert to object to modify
    const qualObj = qualification.toObject();
    
    // Convert relative file path to full URL if needed
    if (qualObj.documentImage && !qualObj.documentImage.startsWith('data:')) {
      if (!qualObj.documentImage.startsWith('http')) {
        qualObj.documentImage = `http://localhost:5000${qualObj.documentImage}`;
      }
    }
    
    res.json(qualObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch qualification' });
  }
});

// V14 remediation note: qualificationUpload.single(...) is wrapped in a callback here
// rather than passed as plain middleware. Multer's fileFilter rejects a file by calling
// cb(new Error(...), false), which Express treats as next(err) - with no wrapper (and no
// global error-handling middleware in server.js), that error falls through to Express's
// default handler and returns a raw 500 with a stack trace instead of a clean 400. This
// mirrors the pattern already used correctly in routes/auth.js's /google route.
router.post('/', (req, res, next) => {
  qualificationUpload.single('documentImage')(req, res, (err) => {
    if (err) {
      console.error('Qualification upload error:', err.message);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { userId, type, name, issuer, year, expiry } = req.body;
    
    // Server-side validation
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Validate name and issuer for special characters
    const validationRegex = /^[a-zA-Z0-9\s\-.,()&]+$/;
    
    // Check if name is valid
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!validationRegex.test(name)) {
      return res.status(400).json({ error: 'Name contains invalid characters' });
    }
    
    // Check if issuer is valid
    if (!issuer || !issuer.trim()) {
      return res.status(400).json({ error: 'Issuer is required' });
    }
    if (!validationRegex.test(issuer)) {
      return res.status(400).json({ error: 'Issuer contains invalid characters' });
    }
    
    if (!year || !year.trim() || !/^\d{4}$/.test(year)) {
      return res.status(400).json({ error: 'Year must be a 4-digit number' });
    }
    
    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (yearNum > currentYear || yearNum < 1900) {
      return res.status(400).json({
        error: `Year must be between 1900 and ${currentYear}`
      });
    }
    
    const qualificationData = {
      userId,
      type,
      name: name.trim(),
      issuer: issuer.trim(),
      year,
      expiry: expiry && expiry.trim() ? expiry.trim() : 'N/A'
    };
    
    // If file was uploaded, save the file path
    if (req.file) {
      qualificationData.documentImage = `/uploads/qualifications/${req.file.filename}`;
    }
    
    const qualification = new Qualification(qualificationData);
    const savedQualification = await qualification.save();
    
    res.status(201).json(savedQualification);
  } catch (error) {
    console.error('Error creating qualification:', error);
    res.status(500).json({ error: 'Error creating qualification' });
  }
});

// PUT (update) qualification with file upload
router.put('/:id', (req, res, next) => {
  qualificationUpload.single('documentImage')(req, res, (err) => {
    if (err) {
      console.error('Qualification upload error:', err.message);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Find existing qualification first to get current data
    const existingQualification = await Qualification.findById(id);
    if (!existingQualification) {
      return res.status(404).json({ error: 'Qualification not found' });
    }
    
    // Server-side validation
    const validationRegex = /^[a-zA-Z0-9\s\-.,()&]+$/;
    
    // Check if name is valid
    if (updateData.name) {
      if (!updateData.name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      if (!validationRegex.test(updateData.name)) {
        return res.status(400).json({ error: 'Name contains invalid characters' });
      }
      updateData.name = updateData.name.trim();
    }
    
    // Check if issuer is valid
    if (updateData.issuer) {
      if (!updateData.issuer.trim()) {
        return res.status(400).json({ error: 'Issuer cannot be empty' });
      }
      if (!validationRegex.test(updateData.issuer)) {
        return res.status(400).json({ error: 'Issuer contains invalid characters' });
      }
      updateData.issuer = updateData.issuer.trim();
    }
    
    // Validate year format if provided
    if (updateData.year) {
      if (!updateData.year.trim() || !/^\d{4}$/.test(updateData.year)) {
        return res.status(400).json({ error: 'Year must be a 4-digit number' });
      }
      
      const yearNum = parseInt(updateData.year);
      const currentYear = new Date().getFullYear();
      if (yearNum > currentYear || yearNum < 1900) {
        return res.status(400).json({
          error: `Year must be between 1900 and ${currentYear}`
        });
      }
    }
    
    // If file was uploaded, save the file path and delete old file
    if (req.file) {
      updateData.documentImage = `/uploads/qualifications/${req.file.filename}`;

      if (existingQualification.documentImage &&
        !existingQualification.documentImage.startsWith('data:') &&
        !existingQualification.documentImage.startsWith('http')) {

        try {
          // Remove the leading slash and construct full file path
          const oldPath = existingQualification.documentImage.replace(/^\//, '');
          const filePath = path.join(__dirname, '..', oldPath);
          
          // Delete if file exists
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old file: ${filePath}`);
          }
        } catch (fileError) {
          console.error('Error deleting old file:', fileError);
          // Continue with update even if file deletion fails
        }
      }
    }
    
    // Update the qualification
    const updatedQualification = await Qualification.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    // Convert file path to full URL for frontend
    const responseObj = updatedQualification.toObject();
    if (responseObj.documentImage && !responseObj.documentImage.startsWith('data:')) {
      if (!responseObj.documentImage.startsWith('http')) {
        responseObj.documentImage = `http://localhost:5000${responseObj.documentImage}`;
      }
    }
    
    res.json(responseObj);
  } catch (error) {
    console.error('Error updating qualification:', error);
    res.status(500).json({ error: 'Error updating qualification', details: error.message });
  }
});

// DELETE qualification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the qualification to get the image path before deleting
    const qualification = await Qualification.findById(id);
    
    if (!qualification) {
      return res.status(404).json({ error: 'Qualification not found' });
    }
    
    // Delete the associated image file if it exists
    if (qualification.documentImage &&
      !qualification.documentImage.startsWith('data:') &&
      !qualification.documentImage.startsWith('http')) {

      try {
        // Remove the leading slash and construct full file path
        const imagePath = qualification.documentImage.replace(/^\//, '');
        const filePath = path.join(__dirname, '..', imagePath);
        
        // Delete if file exists
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with deletion even if file removal fails
      }
    }
    
    // Delete the qualification from the database
    await Qualification.findByIdAndDelete(id);
    
    res.json({ message: 'Qualification deleted successfully' });
  } catch (error) {
    console.error('Error deleting qualification:', error);
    res.status(500).json({ error: 'Error deleting qualification', details: error.message });
  }
});

module.exports = router;