import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateProfile } from '../db/queries.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  profile?: {
    id: number;
    uid: string;
    email: string;
    username: string;
    avatarUrl: string | null;
    preferredLanguage: string;
    role: string;
    xp: number;
    accountStatus: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const profile = await getOrCreateProfile(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || decodedToken.email?.split('@')[0] || 'Player',
      decodedToken.picture || ''
    );
    req.profile = profile;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Session expired or invalid login. Please sign in again.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const profile = await getOrCreateProfile(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || decodedToken.email?.split('@')[0] || 'Player',
      decodedToken.picture || ''
    );
    req.profile = profile;
  } catch {
    // Ignore invalid optional token
  }
  next();
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, () => {
    if (!req.profile || req.profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Unauthorized admin access: Only verified administrators may access this resource.',
      });
    }
    next();
  });
};
