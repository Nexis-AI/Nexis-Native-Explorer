import { app } from './app';
import { config } from './config';
import { prisma } from './services/prisma';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Connected to database');

    // Start server
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 