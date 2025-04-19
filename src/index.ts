import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { authMiddleware } from './middleware/auth';

// Routes imports
import managerRoutes from './routes/managerRoutes';
import tenantRoutes from './routes/tenantRoutes';

//config
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Define allowed origins
const allowedOrigins = ['http://localhost:3000'];

// Configure CORS options
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Explicitly list allowed methods if needed
};
// Apply custom CORS middleware with configured options
app.use(cors(corsOptions));

// Routes
app.get('/', (req, res) => {
  res.send('This is home page');
});

// Auth routes
app.use('/tenants', authMiddleware(['tenant']), tenantRoutes);
app.use('/managers', authMiddleware(['manager']), managerRoutes);

// Server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
