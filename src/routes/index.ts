import { Express } from 'express';
import { statsRouter } from './stats';
import { searchRouter } from './search';
import { validatorsRouter } from './validators';

export const setupRoutes = (app: Express): void => {
  app.use('/v1/stats', statsRouter);
  app.use('/v1/search', searchRouter);
  app.use('/v1/validators', validatorsRouter);
}; 