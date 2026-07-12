import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Image } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { UI_COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@dahamkee/shared/constants';

export default function AuthLandingScreen() {
  const router = useRouter();

  const handleSocialLogin = (provider: string) => {
    console.log(`${provider} login pressed`);
    // TODO: Implement Supabase OAuth
  };

  const handleNativeLogin = () => {
    router.push('/(auth)/login');
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>EK</Text>
        </View>
        <Text style={styles.title}>다함께교실</Text>
        <Text style={styles.subtitle}>다문화 학생을 위한 한국 생활 가이드</Text>
      </View>

      <View style={styles.socialButtons}>
        <TouchableOpacity style={[styles.socialButton, styles.googleButton]} onPress={() => handleSocialLogin('Google')}>
          <Image source={require('../../assets/icons/google.png')} style={styles.socialIcon} />
          <Text style={styles.socialButtonText}>Google로 계속하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.socialButton, styles.appleButton]} onPress={() => handleSocialLogin('Apple')}>
          <Image source={require('../../assets/icons/apple.png')} style={styles.socialIcon} />
          <Text style={styles.socialButtonText}>Apple로 계속하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.socialButton, styles.facebookButton]} onPress={() => handleSocialLogin('Facebook')}>
          <Image source={require('../../assets/icons/facebook.png')} style={styles.socialIcon} />
          <Text style={styles.socialButtonText}>Facebook으로 계속하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.socialButton, styles.xButton]} onPress={() => handleSocialLogin('X')}>
          <Image source={require('../../assets/icons/x.png')} style={styles.socialIcon} />
          <Text style={styles.socialButtonText}>X로 계속하기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.nativeButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNativeLogin}>
          <Text style={styles.primaryButtonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignUp}>
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.languageSelector}>
        <Text style={styles.languageLabel}>언어</Text>
        <View style={styles.languageButtons}>
          <TouchableOpacity style={styles.languageButton}>
            <Text>🇰🇷 한국어</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.languageButton}>
            <Text>🇺🇸 English</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.languageButton}>
            <Text>🇨🇳 中文</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.languageButton}>
            <Text>🇻🇳 Tiếng Việt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
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
  socialButtons: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: UI_COLORS.border,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  xButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: SPACING.md,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: UI_COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SPACING.md,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
  },
  nativeButtons: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: UI_COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: UI_COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: UI_COLORS.primary,
    fontFamily: 'Quicksand',
  },
  languageSelector: {
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 12,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
    marginBottom: SPACING.sm,
  },
  languageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  languageButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS,
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
});