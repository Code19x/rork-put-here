import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Crown, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

export default function TrialLockScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();

  const goToPaywall = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  }, []);

  const handleSignOut = useCallback(async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
  }, [signOut]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} testID="trial-lock-screen">
      <LinearGradient
        colors={['#F5A623', '#E8873C', '#C4763B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Lock color="#fff" size={44} />
      </LinearGradient>

      <Text style={styles.title}>Your free trial has ended</Text>
      <Text style={styles.subtitle}>
        {user?.name ? `Hi ${user.name.split(' ')[0]}, ` : ''}subscribe to continue using PutHere and keep access to your stash.
      </Text>

      <View style={styles.plansBox}>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Monthly</Text>
          <Text style={styles.planPrice}>$1.99<Text style={styles.planPeriod}>/mo</Text></Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.planRow}>
          <View style={styles.planLabelRow}>
            <Text style={styles.planLabel}>Yearly</Text>
            <View style={styles.savePill}>
              <Text style={styles.savePillText}>SAVE 17%</Text>
            </View>
          </View>
          <Text style={styles.planPrice}>$19.99<Text style={styles.planPeriod}>/yr</Text></Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={goToPaywall} activeOpacity={0.85} testID="trial-lock-subscribe">
        <LinearGradient
          colors={['#F5A623', '#E8873C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryBtnGradient}
        >
          <Crown color="#fff" size={20} />
          <Text style={styles.primaryBtnText}>Subscribe Now</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignOut} activeOpacity={0.7} testID="trial-lock-signout">
        <LogOut color={Colors.textSecondary} size={16} />
        <Text style={styles.secondaryBtnText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        Your account remains saved. Subscribe anytime to regain access. Billing through {Platform.OS === 'ios' ? 'the App Store' : Platform.OS === 'android' ? 'Google Play' : 'your app store'}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  plansBox: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 24,
  },
  planRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  planLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  planLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  savePill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savePillText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#2E7D32',
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 14,
  },
  primaryBtnGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  secondaryBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  legal: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 16,
    marginTop: 12,
    paddingHorizontal: 16,
  },
});
