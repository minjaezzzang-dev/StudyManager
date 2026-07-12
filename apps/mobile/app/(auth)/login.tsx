import { StyleSheet, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { UI_COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@dahamkee/shared/constants';
import { validateEmail, validatePassword } from '@dahamkee/shared/utils';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    if (!validateEmail(email)) {
      setEmailError('유효한 이메일 주소를 입력해주세요.');
      return;
    }

    if (!password) {
      setPasswordError('비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement Supabase Auth login
      console.log('Login with:', email, password);
      router.replace('/(tabs)');
    } catch (error) {
      setPasswordError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>EK</Text>
          </View>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.subtitle}>계정으로 로그인하여 계속하세요</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="이메일 주소"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.passwordRow}>
              <Text style={styles.label}>비밀번호</Text>
              <TouchableOpacity style={styles.forgotButton} onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />
            {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          <View style={styles.rememberRow}>
            <TouchableOpacity style={styles.checkbox} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[
                styles.checkboxInner,
                rememberMe && styles.checkboxChecked
              ]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>로그인 상태 유지</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleLogin} disabled={isLoading}>
            <Text style={styles.submitButtonText}>
              {isLoading ? '로그인 중...' : '로그인'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>계정이 없으신가요? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.linkText}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: UI_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.lg,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
  },
  form: {
    width: '100%',
    gap: SPACING.lg,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Nunito',
  },
  input: {
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    fontFamily: 'Nunito',
    color: UI_COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: UI_COLORS.error,
    fontFamily: 'Nunito',
  },
  forgotButton: {
    padding: SPACING.xs,
  },
  forgotText: {
    fontSize: 13,
    color: UI_COLORS.primary,
    fontFamily: 'Nunito',
    fontWeight: '600',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: UI_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: UI_COLORS.primary,
    borderColor: UI_COLORS.primary,
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: UI_COLORS.textPrimary,
    fontFamily: 'Nunito',
  },
  submitButton: {
    backgroundColor: UI_COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    ...SHADOWS.md,
    marginTop: SPACING.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: 14,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: UI_COLORS.primary,
    fontFamily: 'Quicksand',
  },
});