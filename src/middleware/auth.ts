import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import logger from '../config/logger';

interface DecodedToken extends JwtPayload {
  sub: string;
  'custom:role'?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const decoded = jwt.decode(token) as DecodedToken;
      const userRole = decoded['custom:role'] || '';
      req.user = {
        id: decoded.sub,
        role: userRole,
      };

      const hasAccess = allowedRoles.includes(userRole.toLocaleLowerCase());

      if (!hasAccess) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: decoded.sub,
          userRole,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method
        });
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      logger.info('Authentication successful', {
        userId: decoded.sub,
        userRole,
        path: req.path,
        method: req.method
      });
      next();
    } catch (error) {
      logger.error('Token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(400).json({ message: 'Invalid token' });
      return;
    }
  };
};
