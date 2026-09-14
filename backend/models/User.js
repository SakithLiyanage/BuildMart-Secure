const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['Client', 'Service Provider', 'Admin'],
    default: 'Client',
  },
  profilePic: {
    type: String,
  },
  // Add salary information
  salary: {
    amount: {
      type: Number,
      default: 0
    },
    epf: {
      employee: {
        type: Number,
        default: 0
      },
      employer: {
        type: Number,
        default: 0
      }
    },
    etf: {
      type: Number,
      default: 0
    },
    lastPaid: {
      type: Date
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending'],
      default: 'Pending'
    }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
