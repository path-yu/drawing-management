import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: path.resolve(__dirname, '../../', process.env.DB_PATH || './data/vessel_drawings.db'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
