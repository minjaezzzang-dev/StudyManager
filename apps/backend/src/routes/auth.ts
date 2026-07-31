// =============================================================
// EasyKR Backend — Auth Routes (SQLite + JWT, no email OTP)
// =============================================================

import { Router, Request, Response } from 'express';

import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  linkAccountSchema,
} from '../routes/schemas';
import { validateBody } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { env } from '../config/env';
import { getDb } from '../db/sqlite';
import {
  createUser,
  findUserByEmail,
  findUserById,
  normalizeEmail,
  toPublicUser,
  verifyPassword,
} from '../services/users';
import {
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  signAccessToken,
} from '../services/authTokens';
import { oauthRouter } from './oauthRoutes';

const router = Router();

getDb();

router.use('/oauth', oauthRouter);

function sessionPayload(session: {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
  };
}

async function handleSignup(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, role, nativeLanguage } = req.body;
    const normalized = normalizeEmail(email);

    if (findUserByEmail(normalized)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const user = createUser({
      email: normalized,
      password,
      fullName: name,
      role,
      nativeLanguage,
    });

    const session = issueSession(
      { id: user.id, email: user.email, role: user.role },
      {
        jwtSecret: env.JWT_SECRET,
        accessExpiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      }
    );

    res.status(201).json({
      message: 'Registration successful',
      session: sessionPayload(session),
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

router.post('/signup', validateBody(signupSchema), handleSignup);
// Backward-compatible alias (previously OTP start)
router.post('/send-verification', validateBody(signupSchema), handleSignup);

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    const user = findUserByEmail(email);

    if (!user || !verifyPassword(user, password)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const session = issueSession(
      { id: user.id, email: user.email, role: user.role },
      {
        jwtSecret: env.JWT_SECRET,
        accessExpiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      }
    );

    res.json({
      message: 'Login successful',
      session: sessionPayload(session),
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.body?.refresh_token;
    if (refreshToken) {
      revokeRefreshToken(refreshToken);
    } else if (req.user) {
      revokeAllRefreshTokensForUser(req.user.id);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.post('/forgot-password', validateBody(forgotPasswordSchema), async (_req, res) => {
  res.status(501).json({ error: 'Password reset is not available with local auth yet' });
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (_req, res) => {
  res.status(501).json({ error: 'Password reset is not available with local auth yet' });
});

router.post('/link-account', authenticateToken, validateBody(linkAccountSchema), async (_req, res) => {
  res.status(501).json({ error: 'Account linking is not available yet' });
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const user = findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.body.refresh_token;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const rotated = rotateRefreshToken(refreshToken, env.JWT_REFRESH_EXPIRES_IN);
    if (!rotated) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = findUserById(rotated.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const access_token = signAccessToken(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN
    );

    res.json({
      session: {
        access_token,
        refresh_token: rotated.token,
        accessToken: access_token,
        refreshToken: rotated.token,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export { router as authRouter };
