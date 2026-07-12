import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { UI_COLORS, SPACING, SHADOWS } from '@dahamkee/shared/constants';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/landing');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoInner}>
          <Text style={styles.logoText}>EK</Text>
        </View>
        <ActivityIndicator size="large" color={UI_COLORS.primary} style={styles.spinner} />
      </View>
      <Text style={styles.slogan}>다함께교실</Text>
      <Text style={styles.subSlogan}>함께 배우고, 함께 성장하는</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: UI_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  spinner: {
    marginTop: SPACING.lg,
  },
  slogan: {
    fontSize: 28,
    fontWeight: '700',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
    marginBottom: SPACING.xs,
  },
  subSlogan: {
    fontSize: 14,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
  },
});