import { beforeEach, describe, expect, it } from 'vitest';
import { useMemoryDb } from '../db/sqlite';
import { testEnv } from '../test/fixtures/env';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  toPublicUser,
} from './users';
import { issueSession, verifyAccessToken, rotateRefreshToken } from './authTokens';

describe('sqlite auth flow pieces', () => {
  beforeEach(() => {
    useMemoryDb();
  });

  it('creates user and verifies password + JWT session', () => {
    const user = createUser({
      email: 'Student@Example.com',
      password: 'Password1',
      fullName: '학생',
      role: 'student',
      nativeLanguage: 'ko',
    });

    expect(user.email).toBe('student@example.com');
    expect(findUserByEmail('student@example.com')?.id).toBe(user.id);
    expect(verifyPassword(user, 'Password1')).toBe(true);
    expect(verifyPassword(user, 'wrong')).toBe(false);

    const session = issueSession(
      { id: user.id, email: user.email, role: user.role },
      {
        jwtSecret: testEnv.JWT_SECRET,
        accessExpiresIn: '1h',
        refreshExpiresIn: '7d',
      }
    );

    const payload = verifyAccessToken(session.access_token, testEnv.JWT_SECRET);
    expect(payload.sub).toBe(user.id);
    expect(payload.email).toBe(user.email);

    const rotated = rotateRefreshToken(session.refresh_token, '7d');
    expect(rotated?.userId).toBe(user.id);
    expect(toPublicUser(user).full_name).toBe('학생');
  });
});
