const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const OngoingWork = require('../models/Ongoingworkmodel');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

// ==========================================
// 1. PROCESS PAYMENT (V16 Server Price Validation & V19 Secret Check)
// ==========================================
router.post('/process-payment', auth, async (req, res) => {
  try {
    const {
      name: cardholderName,
      cardNumber,
      expiry,
      amount,
      activeCard,
      originalAmount,
      commissionAmount,
      commissionRate,
      context,
      order,
      workId,
      milestoneId
    } = req.body;

    // Basic validation
    if (!cardholderName || !cardNumber || !expiry || amount === undefined || !activeCard) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields'
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be a positive number'
      });
    }

    // V16: Server-side price recalculation/verification to prevent client-side price tampering
    let verifiedAmount = parsedAmount;
    if (order && Array.isArray(order.items) && order.items.length > 0) {
      let computedTotal = 0;
      for (const item of order.items) {
        if (item.productId || item._id) {
          const productDoc = await Product.findById(item.productId || item._id);
          if (productDoc && productDoc.price) {
            computedTotal += productDoc.price * (item.quantity || 1);
          } else if (item.price) {
            computedTotal += parseFloat(item.price) * (item.quantity || 1);
          }
        } else if (item.price) {
          computedTotal += parseFloat(item.price) * (item.quantity || 1);
        }
      }
      if (computedTotal > 0) {
        // If client submitted tampered amount (e.g. $0.01 instead of computed catalog total)
        if (Math.abs(parsedAmount - computedTotal) > 0.05) {
          return res.status(400).json({
            success: false,
            message: 'Price tampering detected: amount does not match authoritative catalog calculation'
          });
        }
        verifiedAmount = computedTotal;
      }
    }

    // Validate context type
    const validPaymentTypes = ['other', 'milestone', 'inventory', 'agreement_fee', 'customer'];
    const paymentType = validPaymentTypes.includes(context) ? context : 'other';

    // Validate card number length
    const cleanCardNumber = cardNumber.toString().replace(/\s+/g, '');
    if (cleanCardNumber.length < 12 || cleanCardNumber.length > 19) {
      return res.status(400).json({
        success: false,
        message: 'Invalid card number'
      });
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry date format (MM/YY)'
      });
    }

    const lastFourDigits = cleanCardNumber.slice(-4);

    // Derived strictly from authenticated JWT session (V17 / Identity Spoofing prevention)
    const userObject = {
      userId: req.user.id,
      email: req.user.email,
      name: cardholderName,
      role: req.user.role
    };

    const payment = new Payment({
      cardholderName,
      cardType: typeof activeCard === 'string' ? activeCard.toLowerCase() : 'visa',
      lastFourDigits,
      expiryDate: expiry,
      amount: verifiedAmount,
      originalAmount: originalAmount ? parseFloat(originalAmount) : verifiedAmount,
      commissionAmount: commissionAmount ? parseFloat(commissionAmount) : 0,
      commissionRate: commissionRate || 0,
      status: 'completed',
      paymentType,
      user: userObject,
      workId: workId || null,
      milestoneId: milestoneId || null,
      order: order ? {
        orderId: order.orderId || `ORDER-${Date.now()}`,
        items: order.items || [],
        shippingDetails: order.shippingDetails || {}
      } : null
    });

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        originalAmount: payment.originalAmount,
        commissionAmount: payment.commissionAmount,
        commissionRate: payment.commissionRate,
        status: payment.status,
        context,
        cardType: payment.cardType,
        lastFourDigits,
        cardholderName,
        user: userObject,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Payment processing error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
});

// ==========================================
// 2. FETCH PAYMENTS (V02 Broken Access Control & V13 NoSQL Injection)
// ==========================================
router.get('/', auth, async (req, res) => {
  try {
    const { status, cardType, dateFrom, dateTo, sort = 'createdAt', order = 'desc' } = req.query;

    const filter = {};

    // IDOR / Access Control: Regular users can only see their own transactions, Admin sees all
    if (req.user.role !== 'Admin') {
      filter['user.userId'] = req.user.id;
    }

    // V13: Whitelist filter parameters to prevent NoSQL query operator injection
    const ALLOWED_STATUSES = ['pending', 'completed', 'failed'];
    if (status && ALLOWED_STATUSES.includes(status)) {
      filter.status = status;
    }

    const ALLOWED_CARD_TYPES = ['visa', 'mastercard', 'amex', 'discover'];
    if (cardType && typeof cardType === 'string' && ALLOWED_CARD_TYPES.includes(cardType.toLowerCase())) {
      filter.cardType = cardType.toLowerCase();
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom && !isNaN(Date.parse(dateFrom))) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo && !isNaN(Date.parse(dateTo))) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    const ALLOWED_SORTS = ['createdAt', 'amount', 'status'];
    const sortField = ALLOWED_SORTS.includes(sort) ? sort : 'createdAt';
    const sortObj = { [sortField]: order === 'asc' ? 1 : -1 };

    const payments = await Payment.find(filter).sort(sortObj).exec();
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// ==========================================
// 3. UPDATE PAYMENT STATUS (V02 Admin Access Control)
// ==========================================
router.patch('/:id/status', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ALLOWED_STATUSES = ['pending', 'completed', 'failed'];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status value'
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      payment
    });
  } catch (error) {
    console.error('Error updating payment status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
});

// ==========================================
// 4. MILESTONE PAYMENTS (Auth required)
// ==========================================
router.post('/milestone-payment', auth, async (req, res) => {
  try {
    const { workId, milestoneId, amount, paymentDetails } = req.body;

    if (!workId || !milestoneId || !amount || !paymentDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required milestone payment details'
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone amount'
      });
    }

    const payment = new Payment({
      ...paymentDetails,
      amount: parsedAmount,
      status: 'completed',
      paymentType: 'milestone',
      workId,
      milestoneId,
      user: {
        userId: req.user.id,
        email: req.user.email,
        name: paymentDetails.cardholderName || req.user.username,
        role: req.user.role
      }
    });

    await payment.save();

    if (OngoingWork) {
      await OngoingWork.findOneAndUpdate(
        { _id: workId, 'milestones._id': milestoneId },
        {
          $set: {
            'milestones.$.status': 'completed',
            'milestones.$.actualAmountPaid': parsedAmount,
            'milestones.$.completedAt': new Date(),
            'milestones.$.paymentId': payment._id
          }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Milestone payment processed successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status
      }
    });
  } catch (error) {
    console.error('Milestone payment error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
});

module.exports = router;
