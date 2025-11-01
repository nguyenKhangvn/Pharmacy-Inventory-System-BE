const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    // Query params
    const {
      q = '',
      page = 1,
      limit = 25,
      sortBy = 'createdAt',   // username|createdAt|lastLogin|role|status
      sortOrder = 'desc',     // asc|desc
      status,                 // optional filter
      role                    // optional filter
    } = req.query;

    // Chuẩn hoá phân trang theo AC (25/50/100)
    const allowed = [25, 50, 100];
    const pageSize = allowed.includes(+limit) ? +limit : 25;
    const pageNum  = Math.max(parseInt(page, 10) || 1, 1);

    // Lọc & tìm kiếm
    const query = {};
    if (q && q.trim()) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      query.$or = [
        { username: regex },
        { fullName: regex },
        { email: regex },
        { phone: regex }
      ];
    }
    if (status) query.status = status;
    if (role)   query.role   = role;

    // Chỉ lấy các cột UI cần (bám AC)
    const projection =
      'username fullName email phone role status lastLogin createdAt';

    // Sắp xếp an toàn
    const sortMap = {
      username: 'username',
      createdAt: 'createdAt',
      lastLogin: 'lastLogin',
      role: 'role',
      status: 'status'
    };
    const sortField = sortMap[sortBy] || 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    // Truy vấn
    const [items, total] = await Promise.all([
      User.find(query, projection)
        .sort(sort)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(query)
    ]);

    // Chuẩn hoá output
    const data = items.map(u => ({
      id: String(u._id),
      username: u.username,
      fullName: u.fullName || '',
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: u.status,               // 'active' / 'locked'
      lastLogin: u.lastLogin || null  // hiển thị cột "Đăng nhập cuối"
    }));

    return res.json({
      success: true,
      data: {
        items: data,
        page: pageNum,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('GET /api/users error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
