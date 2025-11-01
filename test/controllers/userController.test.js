// Unit test cho userController.getUsers (Jest) — không đụng DB thật
// Mock User model (find + countDocuments)
let captured = {};
jest.mock('../../models/User', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

const User = require('../../models/User');
const { getUsers } = require('../../controllers/userController');

// Mock User model
jest.mock('../../models/User', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const mockReq = (query = {}, user = null) => ({
  query,
  user
});

describe('userController.getUsers', () => {
  let findMock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup chain methods for User.find()
    findMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn()
    };
    
    User.find.mockReturnValue(findMock);
  });

  describe('Basic functionality', () => {
    it('should return users list with default pagination (page=1, limit=25)', async () => {
      const mockUsers = [
        {
          _id: '507f1f77bcf86cd799439011',
          username: 'admin',
          fullName: 'Administrator',
          email: 'admin@example.com',
          phone: '0123456789',
          role: 'admin',
          status: 'active',
          lastLogin: new Date('2025-01-01'),
          createdAt: new Date('2024-01-01')
        },
        {
          _id: '507f1f77bcf86cd799439012',
          username: 'user1',
          fullName: 'User One',
          email: 'user1@example.com',
          phone: '0987654321',
          role: 'pharmacist',
          status: 'active',
          lastLogin: new Date('2025-01-02'),
          createdAt: new Date('2024-01-02')
        }
      ];

      findMock.lean.mockResolvedValue(mockUsers);
      User.countDocuments.mockResolvedValue(2);

      const req = mockReq({});
      const res = mockRes();

      await getUsers(req, res);

      expect(User.find).toHaveBeenCalledWith(
        {},
        'username fullName email phone role status lastLogin createdAt'
      );
      expect(findMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(findMock.skip).toHaveBeenCalledWith(0);
      expect(findMock.limit).toHaveBeenCalledWith(25);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items: [
            {
              id: '507f1f77bcf86cd799439011',
              username: 'admin',
              fullName: 'Administrator',
              email: 'admin@example.com',
              phone: '0123456789',
              role: 'admin',
              status: 'active',
              lastLogin: mockUsers[0].lastLogin
            },
            {
              id: '507f1f77bcf86cd799439012',
              username: 'user1',
              fullName: 'User One',
              email: 'user1@example.com',
              phone: '0987654321',
              role: 'pharmacist',
              status: 'active',
              lastLogin: mockUsers[1].lastLogin
            }
          ],
          page: 1,
          pageSize: 25,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('should return empty array when no users found', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({});
      const res = mockRes();

      await getUsers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items: [],
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0
        }
      });
    });
  });

  describe('Pagination', () => {
    it('should handle page=2 correctly', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(50);

      const req = mockReq({ page: '2', limit: '25' });
      const res = mockRes();

      await getUsers(req, res);

      expect(findMock.skip).toHaveBeenCalledWith(25); // (2-1) * 25
      expect(findMock.limit).toHaveBeenCalledWith(25);
      
      expect(res.json.mock.calls[0][0].data).toMatchObject({
        page: 2,
        pageSize: 25,
        total: 50,
        totalPages: 2
      });
    });

    it('should validate limit to allowed values (25/50/100)', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      // Test with limit=50 (valid)
      const req1 = mockReq({ limit: '50' });
      const res1 = mockRes();
      await getUsers(req1, res1);
      expect(findMock.limit).toHaveBeenCalledWith(50);

      // Test with limit=30 (invalid, default to 25)
      jest.clearAllMocks();
      User.find.mockReturnValue(findMock);
      const req2 = mockReq({ limit: '30' });
      const res2 = mockRes();
      await getUsers(req2, res2);
      expect(findMock.limit).toHaveBeenCalledWith(25);
    });

    it('should handle invalid page number (default to 1)', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ page: '-5' });
      const res = mockRes();

      await getUsers(req, res);

      expect(findMock.skip).toHaveBeenCalledWith(0); // page 1
      expect(res.json.mock.calls[0][0].data.page).toBe(1);
    });
  });

  describe('Search functionality', () => {
    it('should search by username', async () => {
      const mockUsers = [
        {
          _id: '507f1f77bcf86cd799439011',
          username: 'admin',
          fullName: 'Administrator',
          email: 'admin@example.com',
          phone: '0123456789',
          role: 'admin',
          status: 'active',
          lastLogin: null,
          createdAt: new Date()
        }
      ];

      findMock.lean.mockResolvedValue(mockUsers);
      User.countDocuments.mockResolvedValue(1);

      const req = mockReq({ q: 'admin' });
      const res = mockRes();

      await getUsers(req, res);

      expect(User.find).toHaveBeenCalledWith(
        {
          $or: [
            { username: expect.any(RegExp) },
            { fullName: expect.any(RegExp) },
            { email: expect.any(RegExp) },
            { phone: expect.any(RegExp) }
          ]
        },
        expect.any(String)
      );

      expect(res.json.mock.calls[0][0].data.items).toHaveLength(1);
      expect(res.json.mock.calls[0][0].data.items[0].username).toBe('admin');
    });

    it('should escape special regex characters in search query', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ q: 'test.*' });
      const res = mockRes();

      await getUsers(req, res);

      const searchQuery = User.find.mock.calls[0][0];
      expect(searchQuery.$or).toBeDefined();
      // Verify that special characters are escaped
      expect(searchQuery.$or[0].username.source).toContain('\\.');
    });

    it('should ignore empty search query', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ q: '   ' });
      const res = mockRes();

      await getUsers(req, res);

      expect(User.find).toHaveBeenCalledWith({}, expect.any(String));
    });
  });

  describe('Filtering', () => {
    it('should filter by status', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ status: 'locked' });
      const res = mockRes();

      await getUsers(req, res);

      expect(User.find).toHaveBeenCalledWith(
        { status: 'locked' },
        expect.any(String)
      );
    });

    it('should filter by role', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ role: 'admin' });
      const res = mockRes();

      await getUsers(req, res);

      expect(User.find).toHaveBeenCalledWith(
        { role: 'admin' },
        expect.any(String)
      );
    });

    it('should combine search, status and role filters', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ q: 'nguyen', status: 'active', role: 'pharmacist' });
      const res = mockRes();

      await getUsers(req, res);

      const searchQuery = User.find.mock.calls[0][0];
      expect(searchQuery.$or).toBeDefined();
      expect(searchQuery.status).toBe('active');
      expect(searchQuery.role).toBe('pharmacist');
    });
  });

  describe('Sorting', () => {
    it('should sort by username ascending', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ sortBy: 'username', sortOrder: 'asc' });
      const res = mockRes();

      await getUsers(req, res);

      expect(findMock.sort).toHaveBeenCalledWith({ username: 1 });
    });

    it('should sort by lastLogin descending', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ sortBy: 'lastLogin', sortOrder: 'desc' });
      const res = mockRes();

      await getUsers(req, res);

      expect(findMock.sort).toHaveBeenCalledWith({ lastLogin: -1 });
    });

    it('should default to createdAt desc for invalid sortBy', async () => {
      findMock.lean.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      const req = mockReq({ sortBy: 'invalid' });
      const res = mockRes();

      await getUsers(req, res);

      expect(findMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should handle all valid sort fields', async () => {
      const validSortFields = ['username', 'createdAt', 'lastLogin', 'role', 'status'];
      
      for (const field of validSortFields) {
        jest.clearAllMocks();
        User.find.mockReturnValue(findMock);
        findMock.lean.mockResolvedValue([]);
        User.countDocuments.mockResolvedValue(0);

        const req = mockReq({ sortBy: field, sortOrder: 'asc' });
        const res = mockRes();

        await getUsers(req, res);

        expect(findMock.sort).toHaveBeenCalledWith({ [field]: 1 });
      }
    });
  });

  describe('Data normalization', () => {
    it('should handle missing optional fields (fullName, phone, lastLogin)', async () => {
      const mockUsers = [
        {
          _id: '507f1f77bcf86cd799439011',
          username: 'user1',
          email: 'user1@example.com',
          role: 'pharmacist',
          status: 'active',
          createdAt: new Date()
        }
      ];

      findMock.lean.mockResolvedValue(mockUsers);
      User.countDocuments.mockResolvedValue(1);

      const req = mockReq({});
      const res = mockRes();

      await getUsers(req, res);

      expect(res.json.mock.calls[0][0].data.items[0]).toMatchObject({
        id: '507f1f77bcf86cd799439011',
        username: 'user1',
        fullName: '',
        email: 'user1@example.com',
        phone: '',
        role: 'pharmacist',
        status: 'active',
        lastLogin: null
      });
    });

    it('should convert _id to string in response', async () => {
      const mockUsers = [
        {
          _id: '507f1f77bcf86cd799439011',
          username: 'user1',
          fullName: 'User One',
          email: 'user1@example.com',
          phone: '0123456789',
          role: 'pharmacist',
          status: 'active',
          lastLogin: null,
          createdAt: new Date()
        }
      ];

      findMock.lean.mockResolvedValue(mockUsers);
      User.countDocuments.mockResolvedValue(1);

      const req = mockReq({});
      const res = mockRes();

      await getUsers(req, res);

      const item = res.json.mock.calls[0][0].data.items[0];
      expect(typeof item.id).toBe('string');
      expect(item._id).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      const dbError = new Error('Database connection failed');
      User.find.mockImplementation(() => {
        throw dbError;
      });

      const req = mockReq({});
      const res = mockRes();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await getUsers(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'GET /api/users error:',
        dbError
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error'
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed');
      findMock.lean.mockRejectedValue(queryError);

      const req = mockReq({});
      const res = mockRes();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error'
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle all query parameters combined', async () => {
      const mockUsers = [
        {
          _id: '507f1f77bcf86cd799439011',
          username: 'pharmacist1',
          fullName: 'Nguyen Van A',
          email: 'nguyen@example.com',
          phone: '0123456789',
          role: 'pharmacist',
          status: 'active',
          lastLogin: new Date('2025-01-01'),
          createdAt: new Date('2024-01-01')
        }
      ];

      findMock.lean.mockResolvedValue(mockUsers);
      User.countDocuments.mockResolvedValue(15);

      const req = mockReq({
        q: 'nguyen',
        page: '2',
        limit: '50',
        sortBy: 'username',
        sortOrder: 'asc',
        status: 'active',
        role: 'pharmacist'
      });
      const res = mockRes();

      await getUsers(req, res);

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          role: 'pharmacist',
          $or: expect.any(Array)
        }),
        expect.any(String)
      );
      expect(findMock.sort).toHaveBeenCalledWith({ username: 1 });
      expect(findMock.skip).toHaveBeenCalledWith(50); // (2-1) * 50
      expect(findMock.limit).toHaveBeenCalledWith(50);

      expect(res.json.mock.calls[0][0].data).toMatchObject({
        page: 2,
        pageSize: 50,
        total: 15,
        totalPages: 1
      });
    });
  });
});
