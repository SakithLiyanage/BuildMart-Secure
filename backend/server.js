const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();
const bidRoutes = require('./routes/bids');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const qualifyRoutes = require('./routes/Qualify');
const ongoingWorksRoutes = require('./routes/ongoingworks');
const paymentRoutes = require('./routes/PaymentRoutes'); // Add this line
const productRoutes = require('./routes/productRoutes');
const path = require('path'); // Add this line
const supplierRoutes = require('./routes/supplierRoutes'); // Add this line
const orderRoutes = require('./routes/orderRoutes'); // Add this line
const shippingRoutes = require('./routes/shippingRoutes'); // Add this line
const app = express();
const restockRoutes = require('./routes/restockRoutes'); // Add this line
const inquiriesRoutes = require('./routes/inquiries');
const reviewsRoutes = require('./routes/reviews');
const supplierPaymentRoutes = require('./routes/supplierPaymentRoutes'); // Add this line

// Security headers with Helmet (V22)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://*.googleapis.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:*", "https://accounts.google.com", "https://oauth2.googleapis.com"]
    }
  }
}));

// Strict CORS Configuration (V21)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// General API Rate Limiter (V18)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: '1mb' }));

app.use('/bids', bidRoutes);
app.use('/auth', authRoutes);
app.use('/protected', protectedRoutes);
app.use('/qualify', qualifyRoutes);
app.use('/product', productRoutes);
const jobRoutes = require('./routes/JobRoutes');
app.use('/api/jobs', jobRoutes);
app.use('/api/contractors', require('./routes/contractorprofile'));
app.use('/api/email', require('./routes/email'));
app.use('/api/orders', orderRoutes); // Add this line
app.use('/api/reviews', reviewsRoutes); 
app.use('/api/supplierPayments', supplierPaymentRoutes); // Original camelCase route
app.use('/api/supplier-payments', supplierPaymentRoutes); // New dash-case route to fix the 404 error

// Register the contractors routes
app.use('/api/contractors', require('./routes/contractors'));

// Use routes
app.use('/api/ongoingworks', ongoingWorksRoutes);
app.use('/api/payments', paymentRoutes); // Add this line
app.use('/api/suppliers', supplierRoutes); // Add this line
app.use('/api/restock', restockRoutes); // Add this line
app.use('/api/shipping', shippingRoutes); // Add this line
app.use('/api/inquiries', inquiriesRoutes);

// Serve static files with security headers (V15)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
  }
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('Hello from the server');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});