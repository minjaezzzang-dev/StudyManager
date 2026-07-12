import { StyleSheet, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { UI_COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@dahamkee/shared/constants';
import { validateEmail, validatePassword } from '@dahamkee/shared/utils';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nationality, setNationality] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [fullNameError, setFullNameError] = useState('');
  const [nationalityError, setNationalityError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const nationalities = [
    { code: 'KR', name: '대한민국', flag: '🇰🇷' },
    { code: 'US', name: '미국', flag: '🇺🇸' },
    { code: 'CN', name: '중국', flag: '🇨🇳' },
    { code: 'VN', name: '베트남', flag: '🇻🇳' },
    { code: 'JP', name: '일본', flag: '🇯🇵' },
    { code: 'PH', name: '필리핀', flag: '🇵🇭' },
    { code: 'TH', name: '태국', flag: '🇹🇭' },
    { code: 'ID', name: '인도네시아', flag: '🇮🇩' },
    { code: 'MY', name: '말레이시아', flag: '🇲🇾' },
    { code: 'OTHER', name: '기타', flag: '🌍' },
  ];

  const handleSignUp = async () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFullNameError('');
    setNationalityError('');

    if (!validateEmail(email)) {
      setEmailError('유효한 이메일 주소를 입력해주세요.');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.message || '비밀번호가 유효하지 않습니다.');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!fullName.trim()) {
      setFullNameError('이름을 입력해주세요.');
      return;
    }

    if (!nationality) {
      setNationalityError('국적을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement Supabase Auth sign up
      console.log('Sign up with:', { email, password, fullName, nationality });
      router.replace('/(tabs)');
    } catch (error) {
      setEmailError('회원가입에 실패했습니다. 다시 시도해주세요.');
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
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>다함께교실 계정을 만들어보세요</Text>
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
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호 (8자 이상, 영문 대소문자, 숫자 포함)"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="비밀번호 재입력"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="이름"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            {fullNameError && <Text style={styles.errorText}>{fullNameError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>국적</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowNationality(!showNationality)}>
              <View style={styles.dropdownContent}>
                <Text style={nationality ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {nationality ? nationalities.find(n => n.code === nationality)?.name || nationality : '국적 선택'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </View>
            </TouchableOpacity>
            {showNationality && (
              <View style={styles.dropdownList}>
                {nationalities.map((nat) => (
                  <TouchableOpacity
                    key={nat.code}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setNationality(nat.code);
                      setShowNationality(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{nat.flag} {nat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {nationalityError && <Text style={styles.errorText}>{nationalityError}</Text>}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSignUp} disabled={isLoading}>
            <Text style={styles.submitButtonText}>
              {isLoading ? '가입 중...' : '가입하기'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>로그인</Text>
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
  dropdown: {
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: BORDER_RADIUS,
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'Nunito',
    color: UI_COLORS.textPrimary,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    fontFamily: 'Nunito',
    color: UI_COLORS.textSecondary,
  },
  dropdownArrow: {
    fontSize: 12,
    color: UI_COLORS.textSecondary,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: BORDER_RADIUS,
    marginTop: SPACING.xs,
    maxHeight: 200,
    zIndex: 100,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Nunito',
    color: UI_COLORS.textPrimary,
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