import { validateEnv, type EnvConfig } from '@dahamkee/shared/env';

const testEnvValues: Record<string, string> = {
  APP_NAME: 'EasyKR',
  APP_VERSION: '1.0.0-test',
  APP_ENV: 'test',
  NODE_ENV: 'test',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzd0yHQQYAW8Y1s1W5t9vGn9V7yJ0I',
  SUPABASE_JWT_SECRET: 'test-jwt-secret-min-32-characters-long-for-testing',
  OPENAI_API_KEY: 'sk-test-key-do-not-use-in-production-12345',
  GOOGLE_VISION_API_KEY: 'test-vision-key-12345678901234567890',
  GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-google-secret-1234567890',
  GOOGLE_REDIRECT_URI: 'http://localhost:10000/api/auth/oauth/google/callback',
  APPLE_CLIENT_ID: 'com.easykr.web.test',
  APPLE_REDIRECT_URI: 'http://localhost:3000/auth/callback/apple',
  BACKEND_PORT: '10001',
  BACKEND_HOST: '0.0.0.0',
  BACKEND_URL: 'http://localhost:10001',
  JWT_SECRET: 'test-jwt-secret-key-min-32-characters-long-for-testing-only',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_API_URL: 'http://localhost:10001',
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  EXPO_PUBLIC_API_URL: 'http://localhost:10001',
  EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  ENABLE_SWAGGER_UI: 'false',
  LOG_PRETTY: 'false',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_SECURE: 'false',
  SMTP_FROM_EMAIL: 'noreply@easykr.local',
  SMTP_FROM_NAME: 'EasyKR',
};

export const testEnv: EnvConfig = validateEnv(testEnvValues);

export function applyTestEnv(): void {
  Object.assign(process.env, testEnvValues);
}
