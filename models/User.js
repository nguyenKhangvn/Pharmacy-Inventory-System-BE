const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { // Tên đăng nhập
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  fullName: { // Họ và tên
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: { // Email
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  phone: { // Số điện thoại
    type: String,
    trim: true,
    match: [
      /^[0-9]{10,11}$/,
      'Phone number must be 10-11 digits'
    ]
  },
  password: { // Mật khẩu
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: { // Vai trò
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
    required: [true, 'Role is required']
  },
  status: { // Trạng thái
    type: String,
    enum: {
      values: ['active', 'locked'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  lastLogin: { // Đăng nhập cuối
    type: Date,
    default: null
  },
  createdBy: { // Người tạo
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: { // Người cập nhật
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// Index để tối ưu tìm kiếm
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ fullName: 'text' }); // Text search cho tìm kiếm theo tên
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });

// Hash password trước khi lưu
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// So sánh password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Loại bỏ password khi trả về JSON
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Virtual field để hiển thị status với màu sắc
UserSchema.virtual('statusDisplay').get(function() {
  return {
    text: this.status,
    color: this.status === 'active' ? 'green' : 'red',
    badge: this.status === 'active' ? 'success' : 'danger'
  };
});

// Static method để tìm kiếm user
UserSchema.statics.searchUsers = function(searchTerm, options = {}) {
  const {
    page = 1,
    limit = 25,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    role
  } = options;

  const query = {};

  // Tìm kiếm theo tên
  if (searchTerm) {
    query.$or = [
      { fullName: { $regex: searchTerm, $options: 'i' } },
      { username: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } }
    ];
  }

  // Filter theo status
  if (status) {
    query.status = status;
  }

  // Filter theo role
  if (role) {
    query.role = role;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return this.find(query)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'username fullName')
    .populate('updatedBy', 'username fullName');
};

// Static method để đếm số lượng user
UserSchema.statics.countUsers = function(searchTerm, status, role) {
  const query = {};

  if (searchTerm) {
    query.$or = [
      { fullName: { $regex: searchTerm, $options: 'i' } },
      { username: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } }
    ];
  }

  if (status) {
    query.status = status;
  }

  if (role) {
    query.role = role;
  }

  return this.countDocuments(query);
};

module.exports = mongoose.model('User', UserSchema);