// src/index.ts
import express from 'express';
import cors from 'cors';
import router from './routes';
import { log } from './logger';

const app = express();
const port = Number(process.env.PORT) || 3000;

// Trust proxy headers
app.set('trust proxy', true);

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for now
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Authorization', 'x-authorization', 'Authorization', 'authorization'],
    exposedHeaders: ['X-Authorization', 'x-authorization', 'Authorization', 'authorization'],
    credentials: true
}));
app.use(express.json());

// Mount router
app.use('/', router);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    log.info(`Server running on port ${port}`);
});

export { cli } from './cli';  // Keep CLI functionality available