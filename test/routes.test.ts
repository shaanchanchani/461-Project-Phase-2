import request from 'supertest';
import express, { Application } from 'express';
import router from '../src/routes';
import { packageController } from '../src/controllers/packageController';
import { SearchController } from '../src/controllers/searchController';
import { RatingController } from '../src/controllers/ratingController';
import { AuthController, authMiddleware } from '../src/middleware/auth';
import { Server } from 'http';

jest.mock('../src/controllers/packageController');
jest.mock('../src/controllers/searchController');
jest.mock('../src/controllers/ratingController');
jest.mock('../src/middleware/auth');
jest.mock('../src/logger');

describe('Routes', () => {
    let app: Application;
    let server: Server;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/', router);
        server = app.listen(0); // Use port 0 for random available port
    });

    afterEach((done) => {
        server.close(done);
    });

    describe('Authentication', () => {
        test('PUT /authenticate should call AuthController.authenticate', async () => {
            const response = await request(server)
                .put('/authenticate')
                .send({ User: { name: 'test' }, Secret: { password: 'test' } });
            
            expect(AuthController.authenticate).toHaveBeenCalled();
        });
    });

    describe('Protected Routes', () => {
        beforeEach(() => {
            // Mock successful authentication for protected routes
            (authMiddleware as jest.Mock).mockImplementation(
                (req: any, res: any, next: any) => next()
            );
        });

        test('POST /packages should call SearchController.listPackages', async () => {
            const response = await request(server)
                .post('/packages')
                .set('X-Authorization', 'test-token');
            
            expect(SearchController.listPackages).toHaveBeenCalled();
        });

        test('POST /package/byRegEx should call SearchController.searchByRegEx', async () => {
            const response = await request(server)
                .post('/package/byRegEx')
                .set('X-Authorization', 'test-token');
            
            expect(SearchController.searchByRegEx).toHaveBeenCalled();
        });

        test('GET /package/:id should call packageController.getPackage', async () => {
            const response = await request(server)
                .get('/package/123')
                .set('X-Authorization', 'test-token');
            
            expect(packageController.getPackage).toHaveBeenCalled();
        });

        test('DELETE /reset should require admin privileges', async () => {
            const response = await request(server)
                .delete('/reset')
                .set('X-Authorization', 'test-token');
            
            expect(response.status).toBe(401);
        });
    });
});