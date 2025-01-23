import express from 'express';
import './config'; // Load environment variables
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { nftsRouter } from './routes/nfts';
import { searchRouter } from './routes/search';
import { statsRouter } from './routes/stats';
import { tokensRouter } from './routes/tokens';
import { validatorsRouter } from './routes/validators';

const app = express();

// Middleware
app.use(express.json());
app.use(apiLimiter);

// Routes
app.use('/api/nfts', nftsRouter);
app.use('/api/search', searchRouter);
app.use('/api/stats', statsRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/validators', validatorsRouter);

// Error handling
app.use(errorHandler);

export { app }; 