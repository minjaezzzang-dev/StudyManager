import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EnvConfig } from '@dahamkee/shared/env';

let transporter: Transporter | null = null;

export function createMailTransporter(env: EnvConfig): Transporter {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export function getMailTransporter(env: EnvConfig): Transporter {
  if (!transporter) {
    transporter = createMailTransporter(env);
  }
  return transporter;
}

/** Reset cached transporter (tests). */
export function resetMailTransporter(): void {
  transporter = null;
}

export async function sendVerificationCodeEmail(
  env: EnvConfig,
  input: { to: string; code: string; name: string }
): Promise<void> {
  const transport = getMailTransporter(env);
  const from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`;
  const minutes = env.EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES;

  await transport.sendMail({
    from,
    to: input.to,
    subject: `[EasyKR] 이메일 인증 코드: ${input.code}`,
    text: [
      `${input.name}님, 안녕하세요.`,
      '',
      'EasyKR 회원가입 인증 코드입니다.',
      '',
      `인증 코드: ${input.code}`,
      '',
      `이 코드는 ${minutes}분 후 만료됩니다.`,
      '본인이 요청하지 않았다면 이 메일을 무시하세요.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;line-height:1.5;color:#222">
        <p><strong>${input.name}</strong>님, 안녕하세요.</p>
        <p>EasyKR 회원가입 인증 코드입니다.</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700">${input.code}</p>
        <p>이 코드는 <strong>${minutes}분</strong> 후 만료됩니다.</p>
        <p style="color:#666;font-size:12px">본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
      </div>
    `.trim(),
  });
}
