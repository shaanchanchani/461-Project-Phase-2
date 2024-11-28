import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthController, AuthenticatedRequest } from '../src/middleware/auth';

jest.mock('jsonwebtoken');
jest.mock('../src/logger');

describe('Auth Middleware', () => {
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {
            header: jest.fn()
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    test('should pass valid token', () => {
        const mockUser = { name: 'test', isAdmin: false };
        (mockReq.header as jest.Mock).mockReturnValue('valid-token');
        (jwt.verify as jest.Mock).mockReturnValue(mockUser);

        authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual(mockUser);
        expect(mockNext).toHaveBeenCalled();
    });

    test('should handle missing token', () => {
        (mockReq.header as jest.Mock).mockReturnValue(undefined);

        authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Authentication failed due to invalid or missing AuthenticationToken'
        });
    });

    test('should handle invalid token', () => {
        (mockReq.header as jest.Mock).mockReturnValue('invalid-token');
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Invalid authentication token'
        });
    });
});

describe('AuthController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockReq = {
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should authenticate valid credentials', async () => {
        process.env.ADMIN_PW = 'test-password';
        mockReq.body = {
            User: { name: 'admin', isAdmin: true },
            Secret: { password: 'test-password' }
        };

        await AuthController.authenticate(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.stringMatching(/^bearer /));
    });

    test('should reject invalid request body', async () => {
        mockReq.body = {};

        await AuthController.authenticate(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
    });
});