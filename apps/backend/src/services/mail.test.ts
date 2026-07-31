import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testEnv } from '../test/fixtures/env';
import { resetMailTransporter, sendVerificationCodeEmail } from './mail';

const sendMail = vi.fn().mockResolvedValue({ messageId: 'test' });

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail }),
  },
}));

describe('mail', () => {
  beforeEach(() => {
    resetMailTransporter();
    sendMail.mockClear();
  });

  it('sends a 6-digit verification email via SMTP', async () => {
    await sendVerificationCodeEmail(testEnv, {
      to: 'student@example.com',
      code: '654321',
      name: '학생',
    });

    expect(sendMail).toHaveBeenCalledOnce();
    const payload = sendMail.mock.calls[0][0];
    expect(payload.to).toBe('student@example.com');
    expect(payload.subject).toContain('654321');
    expect(payload.text).toContain('654321');
    expect(payload.html).toContain('654321');
  });
});
