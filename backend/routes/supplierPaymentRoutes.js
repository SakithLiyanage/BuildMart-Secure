const express = require('express');
const router = express.Router();
const SupplierPayment = require('../models/SupplierPayment');
const RestockRequest = require('../models/RestockRequest');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

// V03: Protect all supplier payment routes with authentication and role check

// Get all supplier payments (Admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const payments = await SupplierPayment.find();
    res.json(payments);
  } catch (error) {
    console.error('Error fetching supplier payments:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new supplier payment (Admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { supplierId, supplierName, amount, requestId, items } = req.body;
    
    if (!supplierName || !amount) {
      return res.status(400).json({ message: 'Supplier name and amount are required' });
    }

    const payment = new SupplierPayment({
      supplierId,
      supplierName,
      amount: parseFloat(amount),
      requestId,
      items,
      status: 'pending',
      createdBy: req.user.id
    });

    const savedPayment = await payment.save();

    if (requestId) {
      await RestockRequest.findByIdAndUpdate(
        requestId,
        {
          paymentStatus: 'pending payment',
          paymentDetails: {
            method: 'Direct Payment',
            amount: parseFloat(amount),
            transactionId: savedPayment._id,
            paidDate: new Date()
          }
        },
        { new: true }
      );
    }

    res.status(201).json(savedPayment);
  } catch (error) {
    console.error('Error creating supplier payment:', error.message);
    res.status(400).json({ message: 'Invalid payment parameters' });
  }
});

// Get a specific payment (Admin only)
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const payment = await SupplierPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (error) {
    console.error('Error fetching supplier payment:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status (Admin only)
router.patch('/:id/status', auth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'paid', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const payment = await SupplierPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    payment.status = status;
    
    if (status === 'paid') {
      payment.paymentDate = new Date();
      if (payment.requestId) {
        await RestockRequest.findByIdAndUpdate(
          payment.requestId,
          {
            paymentStatus: 'paid',
            'paymentDetails.paidDate': new Date()
          }
        );
      }
    }
    
    const updatedPayment = await payment.save();
    res.json(updatedPayment);
  } catch (error) {
    console.error('Error updating supplier payment status:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;