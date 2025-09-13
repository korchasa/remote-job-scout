import process from 'node:process';
export const errorHandler = (error, _req, res, _next) => {
    const statusCode = error.statusCode ?? 500;
    const message = error.message ?? 'Internal Server Error';
    console.error(`❌ Error ${statusCode}: ${message}`);
    console.error(error.stack);
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(isDevelopment && { stack: error.stack }),
            ...(isDevelopment && { details: error }),
        },
        timestamp: new Date().toISOString(),
    });
};
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.method} ${req.path} not found`,
        },
        timestamp: new Date().toISOString(),
    });
};
