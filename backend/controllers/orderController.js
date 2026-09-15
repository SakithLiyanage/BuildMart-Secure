const Order = require('../models/Order');
const Product = require('../models/Product');

// V08: Enforce ownership checks on order creation and queries

exports.createOrder = async (req, res) => {
  try {
    const { items, totalAmount, paymentDetails, customer, shippingAddress } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain items' });
    }

    // Associate order strictly with authenticated user
    const customerData = {
      name: customer?.name || req.user.username,
      email: req.user.email,
      userId: req.user.id
    };

    const newOrder = new Order({
      items,
      totalAmount: parseFloat(totalAmount),
      paymentDetails,
      customer: customerData,
      shippingAddress,
      orderDate: new Date()
    });
    
    const savedOrder = await newOrder.save();
    
    for (const item of items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    // Non-admin users can only view their own orders
    const filter = {};
    if (req.user.role !== 'Admin') {
      filter['customer.userId'] = req.user.id;
    }

    const orders = await Order.find(filter).sort({ orderDate: -1 });
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

exports.getOrders = async (req, res) => {
  return exports.getUserOrders(req, res);
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // IDOR Check: Ensure user owns this order or is admin
    const orderUserId = order.customer?.userId?.toString();
    if (orderUserId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not have permission to view this order'
      });
    }
    
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error fetching order:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderUserId = order.customer?.userId?.toString();
    // Regular users can only cancel their own orders; other status changes require Admin
    if (status === 'cancelled') {
      if (orderUserId !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to cancel this order'
        });
      }
    } else if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required to change fulfillment status'
      });
    }
    
    order.orderStatus = status;
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};