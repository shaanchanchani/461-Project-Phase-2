// src/index.ts
import express from 'express';
import cors from 'cors';
import router from './routes';
import { log } from './logger';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Vite's default port
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Authorization'],
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
app.listen(port, () => {
    log.info(`Server running on port ${port}`);
});

export { cli } from './cli';  // Keep CLI functionality available