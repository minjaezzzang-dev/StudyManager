import type { EnvConfig } from '@dahamkee/shared/env';

export type OAuthProvider = 'google' | 'kakao';

export interface OAuthProfile {
  provider: OAuthProvider;
  subject: string;
  email: string;
  fullName: string;
}

function isPlaceholderCredential(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.toLowerCase();
  return (
    v.startsWith('dev') ||
    v.startsWith('test') ||
    v.includes('your_') ||
    v.includes('placeholder')
  );
}

export function isOAuthDevMode(env: EnvConfig, provider: OAuthProvider): boolean {
  if (provider === 'google') {
    return isPlaceholderCredential(env.GOOGLE_CLIENT_ID);
  }
  return isPlaceholderCredential(env.KAKAO_CLIENT_ID);
}

export function getAuthorizeUrl(
  env: EnvConfig,
  provider: OAuthProvider,
  state: string
): string {
  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: env.KAKAO_CLIENT_ID || '',
    redirect_uri: env.KAKAO_REDIRECT_URI || '',
    response_type: 'code',
    state,
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeOAuthCode(
  env: EnvConfig,
  provider: OAuthProvider,
  code: string
): Promise<OAuthProfile> {
  if (provider === 'google') {
    return exchangeGoogle(env, code);
  }
  return exchangeKakao(env, code);
}

async function exchangeGoogle(env: EnvConfig, code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${body}`);
  }

  const tokens = (await tokenRes.json()) as { access_token: string };
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error('Failed to fetch Google profile');
  }

  const profile = (await profileRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
  };

  if (!profile.email) {
    throw new Error('Google account has no email');
  }

  return {
    provider: 'google',
    subject: profile.sub,
    email: profile.email,
    fullName: profile.name || profile.email.split('@')[0],
  };
}

async function exchangeKakao(env: EnvConfig, code: string): Promise<OAuthProfile> {
  if (!env.KAKAO_CLIENT_ID || !env.KAKAO_REDIRECT_URI) {
    throw new Error('Kakao OAuth is not configured');
  }

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.KAKAO_CLIENT_ID,
    redirect_uri: env.KAKAO_REDIRECT_URI,
    code,
  });
  if (env.KAKAO_CLIENT_SECRET) {
    tokenBody.set('client_secret', env.KAKAO_CLIENT_SECRET);
  }

  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Kakao token exchange failed: ${body}`);
  }

  const tokens = (await tokenRes.json()) as { access_token: string };
  const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error('Failed to fetch Kakao profile');
  }

  const profile = (await profileRes.json()) as {
    id: number;
    kakao_account?: {
      email?: string;
      profile?: { nickname?: string };
    };
  };

  const email =
    profile.kakao_account?.email || `kakao_${profile.id}@oauth.easykr.local`;
  const fullName =
    profile.kakao_account?.profile?.nickname || `Kakao User ${profile.id}`;

  return {
    provider: 'kakao',
    subject: String(profile.id),
    email,
    fullName,
  };
}

export function buildDevOAuthProfile(provider: OAuthProvider): OAuthProfile {
  if (provider === 'google') {
    return {
      provider: 'google',
      subject: 'dev-google-subject',
      email: 'google-dev@easykr.local',
      fullName: 'Google Dev User',
    };
  }
  return {
    provider: 'kakao',
    subject: 'dev-kakao-subject',
    email: 'kakao-dev@easykr.local',
    fullName: 'Kakao Dev User',
  };
}
