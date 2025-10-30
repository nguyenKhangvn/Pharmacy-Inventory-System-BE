const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/checkRole');

// @route   POST /api/users
// @desc    Add new user
// @access  Private/Admin only
router.post('/', verifyToken, checkAdmin, userController.addUser);

module.exports = router;