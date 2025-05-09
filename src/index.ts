import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './config/logger';
import { authMiddleware } from './middleware/auth';

// Routes imports
import applicationRoutes from './routes/applicationRoutes';
import leaseRoutes from './routes/leaseRoutes';
import managerRoutes from './routes/managerRoutes';
import propertyRoutes from './routes/propertyRoutes';
import tenantRoutes from './routes/tenantRoutes';

dotenv.config();
const app = express();

// Security headers
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.disable('x-powered-by');

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging setup based on environment
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
      skip: (req) => req.url === '/health',
    }),
  );
}

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
  preflightContinue: false,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  maxAge: 86400, // CORS preflight cache for 24 hours
};

app.use(cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use('/applications', applicationRoutes);
app.use('/tenants', authMiddleware(['tenant']), tenantRoutes);
app.use('/leases', leaseRoutes);
app.use('/managers', authMiddleware(['manager']), managerRoutes);
app.use('/properties', propertyRoutes);

// Global error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error('Unhandled error:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(500).json({
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Internal server error',
    });
  },
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  app.listen().close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

const PORT = Number(process.env.PORT) || 3002;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});
