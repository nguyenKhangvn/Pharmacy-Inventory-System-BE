// Unit test cho authController.login (Jest)
// - Mock User model và jsonwebtoken

process.env.JWT_SECRET = process.env.JWT_SECRET;
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE;

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'fake.jwt.token')
}));

jest.mock('../../models/User', () => ({
  findOne: jest.fn()
}));

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { login } = require('../../controllers/authController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const mockReq = (body = {}) => ({ body });

describe('authController.login (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('400 - Missing username or password', async () => {
    const req = mockReq({ username: 'admin' }); // thiếu password
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(typeof payload.message).toBe('string');
  });

  it('401 - User not found', async () => {
    User.findOne.mockResolvedValue(null);

    const req = mockReq({ username: 'admin', password: 'admin123' });
    const res = mockRes();

    await login(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ username: 'admin' });
    expect(res.status).toHaveBeenCalledWith(401);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toMatch(/Invalid username or password/i);
  });

  it('403 - Account is locked (status = locked)', async () => {
    User.findOne.mockResolvedValue({
      status: 'locked'
    });

    const req = mockReq({ username: 'admin', password: 'admin123' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toMatch(/locked/i);
  });

  it('401 - Invalid password', async () => {
    User.findOne.mockResolvedValue({
      status: 'active',
      comparePassword: jest.fn().mockResolvedValue(false)
    });

    const req = mockReq({ username: 'admin', password: 'wrong' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toMatch(/Invalid username or password/i);
  });

  it('200 - Login successful & return token', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'admin',
      email: 'admin@pis.local',
      role: 'Pharmacist',
      status: 'active',
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    };

    User.findOne.mockResolvedValue(mockUser);

    const req = mockReq({ username: 'admin', password: 'admin123' });
    const res = mockRes();

    await login(req, res);

    // Đã cập nhật lastLogin và gọi save
    expect(mockUser.save).toHaveBeenCalledTimes(1);

    // Ký JWT đúng payload & options
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: mockUser._id, username: 'admin', role: 'Pharmacist' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Phản hồi 200 với token và user
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveProperty('token', 'fake.jwt.token');
    expect(payload.data).toHaveProperty('user.username', 'admin');
    expect(payload.data).toHaveProperty('user.email', 'admin@pis.local');
  });

  it('500 - Internal Server Error', async () => {
    User.findOne.mockRejectedValue(new Error('DB down'));
    const req = mockReq({ username: 'admin', password: 'admin123' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toMatch(/server error/i);
  });
});
