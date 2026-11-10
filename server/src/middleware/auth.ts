import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'STUDENT' | 'FOUNDER';
    verificationStatus: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  };
}

export const getJwtSecret = (): string => process.env.JWT_SECRET || 'e22b4a5bd31ff5a0c3cee1383632df94c5297c42b80b765b62d6b76eb059d4ce';

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authentication required. No session token.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string };

    const stmt = db.prepare('SELECT id, email, role, verification_status, is_deleted FROM users WHERE id = ?');
    const user = stmt.get(decoded.id) as {
      id: string;
      email: string;
      role: 'STUDENT' | 'FOUNDER';
      verification_status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
      is_deleted: number;
    } | undefined;

    if (!user || user.is_deleted === 1) {
      res.status(401).json({ success: false, error: 'User account not found or deactivated.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      verificationStatus: user.verification_status,
    };

    next();
  } catch (error: any) {
    console.error('requireAuth error:', error?.message);
    res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
  }
};

/**
 * Ensures user is approved by the founder (or is founder) before accessing discovery, likes, or messaging
 */
export const requireApproved = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  if (req.user.role === 'FOUNDER' || req.user.verificationStatus === 'APPROVED') {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    code: 'VERIFICATION_REQUIRED',
    error: 'Your student account is pending verification by the founder.',
    status: req.user.verificationStatus
  });
};

/**
 * Ensures user is Founder Super Admin
 */
export const requireFounder = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'FOUNDER') {
    res.status(403).json({ success: false, error: 'Access denied. Founder Super Admin privileges required.' });
    return;
  }
  next();
};
