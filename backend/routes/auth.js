const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');
const profileUpload = require('../middleware/profileUpload');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// Rate limiter for authentication endpoints (V18)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

// Helper to generate consistent JWT token (V20)
const generateAuthToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not defined');
  }
  return jwt.sign(
    {
      id: user._id.toString(),
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic || null
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ==========================================
// 1. SIGNUP & REGISTRATION (V07 Mass Assignment & V18 Rate Limit)
// ==========================================
router.post('/signup', authLimiter, profileUpload.single('profilePic'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid field types' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // V07: Prevent privilege escalation via role mass assignment.
    // Public self-registration only allows 'Client' or 'Service Provider'. Never 'Admin'.
    const ALLOWED_SIGNUP_ROLES = ['Client', 'Service Provider'];
    const assignedRole = ALLOWED_SIGNUP_ROLES.includes(role) ? role : 'Client';

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: username.trim() }]
    });

    if (userExists) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const profilePic = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    const newUser = new User({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
      profilePic
    });

    await newUser.save();
    const token = generateAuthToken(newUser);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profilePic: newUser.profilePic
      }
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Alias for /register with identical security rules
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid field types' });
    }

    const ALLOWED_SIGNUP_ROLES = ['Client', 'Service Provider'];
    const assignedRole = ALLOWED_SIGNUP_ROLES.includes(role) ? role : 'Client';
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: username.trim() }]
    });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole
    });

    await newUser.save();
    const token = generateAuthToken(newUser);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// ==========================================
// 2. LOGIN (V12 NoSQL Injection & V18 Rate Limit)
// ==========================================
router.post('/login', authLimiter, async (req, res) => {
  const { emailUsername, password } = req.body;

  try {
    // V12: Strictly validate input types to neutralize NoSQL query selector injection ($ne, $gt, etc.)
    if (!emailUsername || !password || typeof emailUsername !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    const sanitizedIdentifier = emailUsername.trim();
    const user = await User.findOne({
      $or: [
        { email: sanitizedIdentifier.toLowerCase() },
        { username: sanitizedIdentifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Please log in with Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateAuthToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// ==========================================
// 3. GOOGLE OAUTH 2.0 / OPENID CONNECT (Assignment Requirement)
// ==========================================
router.post('/google', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return profileUpload.single('profilePic')(req, res, (err) => {
      if (err) {
        console.error('Profile upload error in /auth/google:', err.message);
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      next();
    });
  }
  next();
}, async (req, res) => {
  try {
    const { credential, idToken, role, username, password } = req.body;
    const tokenToVerify = credential || idToken;

    if (!tokenToVerify || typeof tokenToVerify !== 'string') {
      return res.status(400).json({ error: 'Google credential / ID token is required' });
    }

    let payload = null;

    // First attempt: Verify using official google-auth-library
    if (process.env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: tokenToVerify,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
      } catch (clientErr) {
        console.warn('Google client verification failed, attempting tokeninfo fallback:', clientErr.message);
      }
    }

    // Fallback: Verify directly against Google's public OpenID Connect tokeninfo endpoint
    if (!payload) {
      try {
        const oidcResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`, {
          timeout: 5000
        });
        payload = oidcResponse.data;
      } catch (oidcErr) {
        console.error('Google OIDC tokeninfo verification failed:', oidcErr.message);
        return res.status(401).json({ error: 'Invalid or expired Google authentication token' });
      }
    }

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Failed to extract authenticated identity from Google token' });
    }

    const googleEmail = payload.email.toLowerCase();
    const googleSub = payload.sub;
    const googleName = payload.name || payload.given_name || googleEmail.split('@')[0];
    const googlePicture = payload.picture || null;

    const ALLOWED_SIGNUP_ROLES = ['Client', 'Service Provider'];
    const assignedRole = role && ALLOWED_SIGNUP_ROLES.includes(role) ? role : 'Client';

    const uploadedProfilePic = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    // Optional password support for Google signups
    let hashedPassword = null;
    if (password && typeof password === 'string' && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password.trim(), salt);
    }

    // Check if user already exists with this googleId or email
    let user = await User.findOne({
      $or: [{ googleId: googleSub }, { email: googleEmail }]
    });

    if (user) {
      let modified = false;
      if (!user.googleId) {
        user.googleId = googleSub;
        modified = true;
      }
      if (uploadedProfilePic) {
        user.profilePic = uploadedProfilePic;
        modified = true;
      } else if (!user.profilePic && googlePicture) {
        user.profilePic = googlePicture;
        modified = true;
      }
      if (hashedPassword && !user.password) {
        user.password = hashedPassword;
        modified = true;
      }
      // If user is selecting a role during sign up and is not admin, update role
      if (role && ALLOWED_SIGNUP_ROLES.includes(role) && user.role !== 'Admin') {
        user.role = assignedRole;
        modified = true;
      }
      // If user provided a specific username during signup, update if available
      if (username && typeof username === 'string' && username.trim().length >= 3) {
        const cleanDesired = username.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        if (cleanDesired.toLowerCase() !== user.username.toLowerCase()) {
          const nameTaken = await User.findOne({ 
            username: { $regex: new RegExp(`^${cleanDesired}$`, 'i') },
            _id: { $ne: user._id }
          });
          if (!nameTaken) {
            user.username = cleanDesired;
            modified = true;
          }
        }
      }
      if (modified) {
        await user.save();
      }
    } else {
      // User requested custom username or derive from Google name (preserve chosen casing)
      let baseUsername = (username && typeof username === 'string' && username.trim().length >= 3)
        ? username.trim().replace(/[^a-zA-Z0-9_]/g, '_')
        : googleName.replace(/[^a-zA-Z0-9_]/g, '_');

      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: { $regex: new RegExp(`^${uniqueUsername}$`, 'i') } })) {
        uniqueUsername = `${baseUsername}_${counter}`;
        counter++;
      }

      user = new User({
        username: uniqueUsername,
        email: googleEmail,
        googleId: googleSub,
        role: assignedRole,
        profilePic: uploadedProfilePic || googlePicture,
        password: hashedPassword || undefined
      });

      await user.save();
    }

    const appToken = generateAuthToken(user);

    res.json({
      message: 'Google authentication successful',
      token: appToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Google OAuth error:', error.message);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

// ==========================================
// 4. ADMIN SALARY & ROSTER ROUTES (V01 Broken Access Control)
// Protected by auth and requireAdmin middleware
// ==========================================
router.get('/admins', auth, requireAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'Admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error.message);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

router.patch('/admins/:id/salary', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { salary } = req.body;

    if (!salary || typeof salary !== 'number' || salary <= 0) {
      return res.status(400).json({ error: 'Invalid salary amount' });
    }

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (admin.role !== 'Admin') {
      return res.status(400).json({ error: 'Target user is not an administrator' });
    }

    admin.salary = admin.salary || {};
    admin.salary.amount = salary;
    admin.salary.epf = {
      employee: salary * 0.08,
      employer: salary * 0.12
    };
    admin.salary.etf = salary * 0.03;
    admin.salary.paymentStatus = 'Pending';

    await admin.save();

    res.json({
      message: 'Salary updated successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        salary: admin.salary.amount,
        status: admin.salary.paymentStatus,
        lastPaid: admin.salary.lastPaid
      }
    });
  } catch (error) {
    console.error('Error updating admin salary:', error.message);
    res.status(500).json({ error: 'Internal server error updating salary' });
  }
});

router.post('/admins/pay-salary', auth, requireAdmin, async (req, res) => {
  try {
    const { adminId, paymentDate, salary } = req.body;

    if (!adminId || !paymentDate || !salary) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    if (admin.role !== 'Admin') {
      return res.status(400).json({ error: 'Target user is not an admin' });
    }

    admin.salary = admin.salary || {};
    admin.salary.amount = salary.basicSalary || admin.salary.amount;
    admin.salary.paymentStatus = 'Paid';
    admin.salary.lastPaid = paymentDate;

    await admin.save();

    res.status(200).json({
      message: 'Salary payment processed successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        salary: admin.salary.amount,
        status: admin.salary.paymentStatus,
        lastPaid: admin.salary.lastPaid
      }
    });
  } catch (error) {
    console.error('Error processing salary payment:', error.message);
    res.status(500).json({ error: 'Internal server error processing salary payment' });
  }
});

// ==========================================
// 5. USER MANAGEMENT & PROFILE ROUTES (IDOR Protection)
// ==========================================
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetId = (userId === 'me' || userId === 'profile') ? req.user.id : userId;
    if (req.user.id !== targetId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to view this profile' });
    }

    const user = await User.findById(targetId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-only user directory lookup
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user details (Ownership enforcement)
router.patch('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to modify this profile' });
    }

    const { name, email } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name && typeof name === 'string') user.username = name.trim();
    if (email && typeof email === 'string') user.email = email.toLowerCase().trim();

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Internal server error updating user' });
  }
});

// Update password and profile (Ownership enforcement)
router.put('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to modify this profile' });
    }

    const { name, email, currentPassword, newPassword, profilePic } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name && typeof name === 'string') user.username = name.trim();
    if (email && typeof email === 'string') user.email = email.toLowerCase().trim();
    if (profilePic) user.profilePic = profilePic;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set new password' });
      }
      if (!user.password) {
        return res.status(400).json({ error: 'OAuth account cannot set a password via this method' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password incorrect' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account (Admin or self only)
router.delete('/users/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'Service Provider') {
      try {
        const Qualification = require('../models/Qualification');
        await Qualification.deleteMany({ userId: userId.toString() });
        const Contractor = require('../models/Contractor');
        await Contractor.findOneAndDelete({ userId });
      } catch (cascadeErr) {
        console.warn('Cascade delete warning:', cascadeErr.message);
      }
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({ error: 'Internal server error deleting user' });
  }
});

// Profile image upload endpoint (Protected with auth)
router.post('/upload/profile', auth, profileUpload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No profile image uploaded or invalid file format' });
    }

    const filePath = `/uploads/profiles/${req.file.filename}`;
    res.json({
      message: 'Profile image uploaded successfully',
      filePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading profile image:', error.message);
    res.status(500).json({ error: 'Server error during file upload' });
  }
});

module.exports = router;