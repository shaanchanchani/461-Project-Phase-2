// src/middleware/auth.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticationRequest, User } from '../types';
import jwt from 'jsonwebtoken';
import { log } from '../logger';
import dotenv from 'dotenv';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends Request {
    user?: User;
}

export const authMiddleware: RequestHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.header('X-Authorization');
        
        if (!token) {
            res.status(403).json({ 
                error: 'Authentication failed due to invalid or missing AuthenticationToken' 
            });
            return;
        }

        // Remove 'bearer ' prefix if it exists
        const tokenString = token.startsWith('bearer ') ? token.slice(7) : token;

        try {
            const decoded = jwt.verify(tokenString, JWT_SECRET) as User;
            req.user = decoded;
            next();
        } catch (error) {
            log.error('Invalid token:', error);
            res.status(403).json({ error: 'Invalid authentication token' });
        }
    } catch (error) {
        log.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export class AuthController {
    static async authenticate(req: Request, res: Response): Promise<void> {
        try {
            const authRequest: AuthenticationRequest = req.body;

            // Validate request
            if (!authRequest.User?.name || !authRequest.Secret?.password) {
                res.status(400).json({ error: 'Missing required authentication fields' });
                return;
            }

            // Validate credentials
            const isDefaultAdmin = authRequest.User.name === 'ece30861defaultadminuser' && 
                                 authRequest.Secret.password === 'correcthorsebatterystaple123(!__+@**(A;DROP TABLE packages';
            
            const isEnvAdmin = authRequest.User.name === 'admin' && 
                             authRequest.Secret.password === process.env.ADMIN_PW;

            if (isDefaultAdmin || isEnvAdmin) {
                // Create JWT token
                const token = jwt.sign(
                    { 
                        name: authRequest.User.name, 
                        isAdmin: true 
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.status(200).json(`bearer ${token}`);
                return;
            }

            res.status(401).json({ error: 'Invalid credentials' });
        } catch (error) {
            log.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    }
}