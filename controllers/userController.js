const User = require('../models/User');

/**
 * @desc    Add new user
 * @route   POST /api/users
 * @access  Private/Admin
 */
exports.addUser = async (req, res) => {
  const { username, fullName, email, phone, password, role } = req.body;

  try {
    // 1. Check for duplicate username/email
    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) {
      if (user.username === username) {
        return res.status(400).json({ success: false, message: 'Username already exists.' });
      }
      if (user.email === email) {
        return res.status(400).json({ success: false, message: 'Email already exists.' });
      }
    }

    // 2. Create new user
    user = await User.create({
      username,
      fullName,
      email,
      phone,
      password,
      role: role || 'Pharmacist' // Default to Pharmacist if not provided
    });

    // 3. Return success message
    res.status(201).json({
      success: true,
      message: 'User added successfully'
    });

  } catch (error) {
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};