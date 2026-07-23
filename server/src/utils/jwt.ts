import jwt from 'jsonwebtoken';
import { config } from '../config';
import { SafeUser } from '../types';

export function generateToken(user: SafeUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role_code: user.role_code,
      permissions: user.permissions,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}
