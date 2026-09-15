const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// V08: Guard all order routes with auth middleware and enforce ownership

// Route for getting orders (filtered by user session for regular users, all for admin)
router.get('/', auth, orderController.getUserOrders);

// Create a new order (authenticated)
router.post('/', auth, orderController.createOrder);

// Route for custom order number lookup and status update
router.patch('/byOrderNumber/:orderNumber/status', auth, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }
    
    let order;
    if (/^[0-9a-fA-F]{24}$/.test(orderNumber)) {
      order = await Order.findById(orderNumber);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber });
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderUserId = order.customer?.userId?.toString();
    if (status === 'cancelled') {
      if (orderUserId !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    order.orderStatus = status;
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order by number:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Get a specific order by ID
router.get('/:id', auth, orderController.getOrderById);

// Update order status by ID
router.patch('/:id/status', auth, orderController.updateOrderStatus);

module.exports = router;