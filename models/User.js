const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { // Username
    type: String,
    required: [true],
    unique: true,
    trim: true
  },
  fullName: { // Full name
    type: String,
    required: [true]
  },
  email: { // Email
    type: String,
    required: [true],
    unique: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
    ]
  },
  phone: { // Phone
    type: String,
  },
  password: { // Password
    type: String,
    required: [true],
    minlength: [6]
  },
  role: { // Role
    type: String,
    enum: ['admin', 'user'],
    default: 'Pharmacist'
  },
  status: { // Status
    type: String,
    enum: ['Active', 'Locked'],
    default: 'Active'
  },
  lastLogin: { // Last login
    type: Date
  }
}, {
  timestamps: true // Automatically add createdAt and updatedAt
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);