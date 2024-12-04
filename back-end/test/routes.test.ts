import request from 'supertest';
import express, { Application } from 'express';
import router from '../src/routes';
import { packageController } from '../src/controllers/packageController';
import { authMiddleware, AuthController } from '../src/middleware/auth';
import { Server } from 'http';

jest.mock('../src/controllers/packageController', () => ({
    packageController: {
        getPackageById: jest.fn().mockImplementation((req, res) => {
            res.json({ success: true });
        }),
        createPackage: jest.fn().mockImplementation((req, res) => {
            res.json({ success: true });
        })
    }
}));

jest.mock('../src/middleware/auth', () => ({
    authMiddleware: jest.fn().mockImplementation((req, res, next) => {
        next();
    }),
    AuthController: {
        authenticate: jest.fn().mockImplementation((req, res) => {
            res.json({ token: 'test-token' });
        })
    }
}));

jest.mock('../src/logger');

describe('Routes', () => {
    let app: Application;
    let server: Server;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/', router);
        server = app.listen(0, () => {});
    });

    afterAll((done) => {
        if (server && server.listening) {
            server.close(() => {
                server.unref();
                done();
            });
        } else {
            done();
        }
    });

    describe('Package Operations', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('GET /package/:id should call packageController.getPackageById', async () => {
            const response = await request(server)
                .get('/package/123')
                .set('X-Authorization', 'test-token');
            
            expect(packageController.getPackageById).toHaveBeenCalled();
            expect(response.status).toBe(200);
        });

        test('POST /package should call packageController.createPackage with URL', async () => {
            const response = await request(server)
                .post('/package')
                .set('X-Authorization', 'test-token')
                .send({
                    URL: 'https://example.com/package.zip',
                    metadata: {
                        Name: 'test-package',
                        Version: '1.0.0'
                    }
                });
            
            expect(packageController.createPackage).toHaveBeenCalled();
            expect(response.status).toBe(200);
        });

        test('POST /package should call packageController.createPackage with Content', async () => {
            const response = await request(server)
                .post('/package')
                .set('X-Authorization', 'test-token')
                .send({
                    Content: 'base64-encoded-content',
                    metadata: {
                        Name: 'test-package',
                        Version: '1.0.0'
                    }
                });
            
            expect(packageController.createPackage).toHaveBeenCalled();
            expect(response.status).toBe(200);
        });
    });
});