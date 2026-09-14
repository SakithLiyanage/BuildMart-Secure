const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('FATAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ msg: 'Server authentication configuration error' });
    }

    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token without fallback secrets (V19)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Standardize user ID field across entire application (V20)
    const userId = decoded.id || decoded.userId || decoded._id;
    if (!userId) {
      return res.status(401).json({ msg: 'Malformed authentication token' });
    }
    
    req.user = {
      id: userId.toString(),
      _id: userId.toString(),
      userId: userId.toString(),
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expired, please log in again' });
    }
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ msg: 'Access denied: Admin privileges required' });
  }
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ msg: `Access denied: Requires one of [${roles.join(', ')}]` });
    }
    next();
  };
};

authMiddleware.auth = authMiddleware;
authMiddleware.requireAdmin = requireAdmin;
authMiddleware.requireRole = requireRole;

module.exports = authMiddleware;
