import cors from 'cors';
import process from 'node:process';
export const corsMiddleware = cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.FRONTEND_URL ?? false)
        : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
