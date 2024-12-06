import request from 'supertest';
import express, { Application } from 'express';
import router from '../src/routes';
import { downloadController } from '../src/controllers/downloadController';
import { uploadController } from '../src/controllers/uploadController';
import { authMiddleware, AuthController } from '../src/middleware/auth';
import { Server } from 'http';

jest.mock('../src/controllers/downloadController', () => ({
    downloadController: {
        getPackageById: jest.fn().mockImplementation((req, res) => {
            res.json({ success: true });
        })
    }
}));

jest.mock('../src/controllers/uploadController', () => ({
    uploadController: {
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

        test('GET /package/:id should call downloadController.getPackageById', async () => {
            const response = await request(server)
                .get('/package/123')
                .set('X-Authorization', 'test-token');
            
            expect(downloadController.getPackageById).toHaveBeenCalled();
            expect(response.status).toBe(200);
        });

        test('POST /package should call uploadController.createPackage with URL', async () => {
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
            
            expect(uploadController.createPackage).toHaveBeenCalled();
            expect(response.status).toBe(200);
        });

        test('POST /package should call uploadController.createPackage with Content', async () => {
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
            
            expect(uploadController.createPackage).toHaveBeenCalled();
            expect(response.status).toBe(200);
        });
    });
});