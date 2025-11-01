const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// GET /api/users
router.get(
  '/',
  verifyToken,
  checkRole(['admin']),
  getUsers
);

module.exports = router;
