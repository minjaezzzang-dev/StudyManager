import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { env } from '../config/env';
import {
  buildDevOAuthProfile,
  exchangeOAuthCode,
  getAuthorizeUrl,
  isOAuthDevMode,
  type OAuthProvider,
} from '../services/oauth';
import { createOrLinkOAuthUser, toPublicUser } from '../services/users';
import { issueSession } from '../services/authTokens';

const router = Router();

const pendingStates = new Map<string, { provider: OAuthProvider; createdAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1000;

function pruneStates(): void {
  const now = Date.now();
  for (const [key, value] of pendingStates.entries()) {
    if (now - value.createdAt > STATE_TTL_MS) {
      pendingStates.delete(key);
    }
  }
}

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

function redirectWithSession(
  res: Response,
  session: ReturnType<typeof issueSession>,
  user: ReturnType<typeof toPublicUser>
): void {
  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    provider: String(user.oauth_provider || ''),
  });
  res.redirect(`${env.NEXT_PUBLIC_APP_URL}/auth/callback?${params.toString()}`);
}

function completeOAuthLogin(
  res: Response,
  profile: Awaited<ReturnType<typeof exchangeOAuthCode>>
): void {
  const user = createOrLinkOAuthUser({
    provider: profile.provider,
    subject: profile.subject,
    email: profile.email,
    fullName: profile.fullName,
  });

  const session = issueSession(
    { id: user.id, email: user.email, role: user.role },
    {
      jwtSecret: env.JWT_SECRET,
      accessExpiresIn: env.JWT_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
  );

  redirectWithSession(res, session, toPublicUser(user));
}

function parseProvider(value: string): OAuthProvider | null {
  if (value === 'google' || value === 'kakao') return value;
  return null;
}

// POST /api/auth/oauth/callback — JSON body variant (mobile/SPA)
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const provider = parseProvider(String(req.body.provider || ''));
    const code = String(req.body.code || '');
    if (!provider || !code) {
      res.status(400).json({ error: 'provider and code are required' });
      return;
    }

    if (isOAuthDevMode(env, provider)) {
      const profile = buildDevOAuthProfile(provider);
      const user = createOrLinkOAuthUser({
        provider: profile.provider,
        subject: profile.subject,
        email: profile.email,
        fullName: profile.fullName,
      });
      const session = issueSession(
        { id: user.id, email: user.email, role: user.role },
        {
          jwtSecret: env.JWT_SECRET,
          accessExpiresIn: env.JWT_EXPIRES_IN,
          refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
        }
      );
      res.json({ session: sessionPayload(session), user: toPublicUser(user) });
      return;
    }

    const profile = await exchangeOAuthCode(env, provider, code);
    const user = createOrLinkOAuthUser({
      provider: profile.provider,
      subject: profile.subject,
      email: profile.email,
      fullName: profile.fullName,
    });
    const session = issueSession(
      { id: user.id, email: user.email, role: user.role },
      {
        jwtSecret: env.JWT_SECRET,
        accessExpiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      }
    );
    res.json({ session: sessionPayload(session), user: toPublicUser(user) });
  } catch (error) {
    console.error('OAuth JSON callback error:', error);
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

// GET /api/auth/oauth/:provider — start OAuth (or dev mock)
router.get('/:provider', (req: Request, res: Response) => {
  const provider = parseProvider(req.params.provider);
  if (!provider) {
    res.status(400).json({ error: 'Unsupported OAuth provider' });
    return;
  }

  pruneStates();

  if (isOAuthDevMode(env, provider)) {
    // Local placeholder credentials → instant mock login
    try {
      completeOAuthLogin(res, buildDevOAuthProfile(provider));
    } catch (error) {
      console.error('Dev OAuth error:', error);
      res.redirect(`${env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`);
    }
    return;
  }

  if (provider === 'kakao' && !env.KAKAO_CLIENT_ID) {
    res.status(501).json({ error: 'Kakao OAuth is not configured' });
    return;
  }

  const state = randomBytes(16).toString('hex');
  pendingStates.set(state, { provider, createdAt: Date.now() });
  res.redirect(getAuthorizeUrl(env, provider, state));
});

// GET /api/auth/oauth/:provider/callback — OAuth provider redirect
router.get('/:provider/callback', async (req: Request, res: Response) => {
  const provider = parseProvider(req.params.provider);
  if (!provider) {
    res.status(400).json({ error: 'Unsupported OAuth provider' });
    return;
  }

  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  const oauthError = req.query.error;

  if (oauthError) {
    res.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent(String(oauthError))}`
    );
    return;
  }

  if (!code) {
    res.redirect(`${env.NEXT_PUBLIC_APP_URL}/login?error=missing_code`);
    return;
  }

  pruneStates();
  const pending = pendingStates.get(state);
  if (!pending || pending.provider !== provider) {
    res.redirect(`${env.NEXT_PUBLIC_APP_URL}/login?error=invalid_state`);
    return;
  }
  pendingStates.delete(state);

  try {
    const profile = await exchangeOAuthCode(env, provider, code);
    completeOAuthLogin(res, profile);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`);
  }
});

export { router as oauthRouter };
