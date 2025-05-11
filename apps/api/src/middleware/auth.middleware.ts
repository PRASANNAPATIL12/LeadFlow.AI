import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@agentic-sales-platform/utils'; // Adjusted import path

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId: string; // Added organizationId to the user object on Request
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication attempt without Bearer token');
      return res.status(401).json({
        success: false,
        message: 'No token provided or token is malformed'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-default-secret' // Ensure JWT_SECRET is in your .env
    ) as jwt.JwtPayload & { id: string; email: string; role: string; organizationId: string }; // Type assertion for payload
    
    // Add user info to request
    // Important: Validate that all expected fields are present in decoded token
    if (!decoded.id || !decoded.email || !decoded.role || !decoded.organizationId) {
        logger.error('Token verification succeeded but payload is missing required fields', decoded);
        return res.status(401).json({
            success: false,
            message: 'Invalid token payload'
        });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId
    };
    
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`, error);
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
          });
    } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
          });
    } else {
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
          });
    }
  }
};

// Role-based access control middleware
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) { // Check if user and role exist
      logger.warn('Role middleware called without authenticated user or user role.');
      return res.status(401).json({
        success: false,
        message: 'Not authenticated or user role missing'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`User role '${req.user.role}' not in allowed roles: [${allowedRoles.join(', ')}] for ${req.path}`);
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Insufficient role'
      });
    }
    
    next();
  };
};
