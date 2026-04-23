// v1.1
// PutHere App - Admin Portal
import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, Platform, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield, Globe, ExternalLink, Lock, ArrowLeft,
  Monitor, Smartphone, Server, KeyRound, Mail,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#0B1219',
  surface: '#131E2B',
  surfaceRaised: '#1A2938',
  card: '#162233',
  accent: '#00D4AA',
  accentDim: 'rgba(0, 212, 170, 0.10)',
  accentBorder: 'rgba(0, 212, 170, 0.20)',
  accentGlow: 'rgba(0, 212, 170, 0.30)',
  cyan: '#22D3EE',
  cyanDim: 'rgba(34, 211, 238, 0.10)',
  amber: '#FBBF24',
  amberDim: 'rgba(251, 191, 36, 0.10)',
  text: '#E8EDF2',
  textSecondary: '#8899AA',
  textMuted: '#546070',
  border: '#1E2E40',
  divider: '#1A2636',
};

const ADMIN_WEB_URL = 'https://puthereapp.com/admin';

export default function AdminPortalScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  const handleOpenWebAdmin = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const supported = await Linking.canOpenURL(ADMIN_WEB_URL);
      if (supported) {
        await Linking.openURL(ADMIN_WEB_URL);
      } else {
        await Linking.openURL(ADMIN_WEB_URL);
      }
    } catch (e) {
      console.log('Error opening admin URL:', e);
    }
  }, []);

  const handleGoToLogin = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/admin-login');
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          testID="admin-portal-back"
        >
          <ArrowLeft color={C.textSecondary} size={20} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Admin Portal</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.shieldContainer}>
            <Animated.View style={[styles.shieldPulse, { opacity: pulseAnim }]} />
            <View style={styles.shieldCircle}>
              <Shield color={C.accent} size={36} />
            </View>
          </View>
          <Text style={styles.heroTitle}>PutHere Admin</Text>
          <Text style={styles.heroDomain}>puthereapp.com</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>System Online</Text>
          </View>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCESS METHODS</Text>

          <TouchableOpacity
            style={styles.accessCard}
            onPress={handleGoToLogin}
            activeOpacity={0.7}
            testID="admin-app-login-btn"
          >
            <View style={styles.accessCardHeader}>
              <View style={[styles.accessIcon, { backgroundColor: C.accentDim }]}>
                <Smartphone color={C.accent} size={22} />
              </View>
              <View style={styles.accessCardInfo}>
                <Text style={styles.accessCardTitle}>In-App Admin Login</Text>
                <Text style={styles.accessCardDesc}>Access the admin dashboard directly within the app</Text>
              </View>
            </View>
            <View style={styles.accessCardFooter}>
              <View style={styles.accessTag}>
                <Lock color={C.accent} size={12} />
                <Text style={styles.accessTagText}>Credential Required</Text>
              </View>
              <View style={styles.accessArrow}>
                <KeyRound color={C.accent} size={16} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accessCard}
            onPress={handleOpenWebAdmin}
            activeOpacity={0.7}
            testID="admin-web-link-btn"
          >
            <View style={styles.accessCardHeader}>
              <View style={[styles.accessIcon, { backgroundColor: C.cyanDim }]}>
                <Monitor color={C.cyan} size={22} />
              </View>
              <View style={styles.accessCardInfo}>
                <Text style={styles.accessCardTitle}>Web Admin Panel</Text>
                <Text style={styles.accessCardDesc}>Open the admin dashboard in your web browser</Text>
              </View>
            </View>
            <View style={styles.accessCardFooter}>
              <View style={styles.urlPill}>
                <Globe color={C.textMuted} size={12} />
                <Text style={styles.urlText}>puthereapp.com/admin</Text>
              </View>
              <View style={[styles.accessArrow, { backgroundColor: C.cyanDim }]}>
                <ExternalLink color={C.cyan} size={16} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADMIN INFO</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: C.amberDim }]}>
                <Mail color={C.amber} size={16} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Admin Email</Text>
                <Text style={styles.infoValue}>support@puthereapp.com</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: C.accentDim }]}>
                <Globe color={C.accent} size={16} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Domain</Text>
                <Text style={styles.infoValue}>puthereapp.com</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: C.cyanDim }]}>
                <Server color={C.cyan} size={16} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Backend Status</Text>
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Operational</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerSection}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>PutHere Admin Portal v1.0</Text>
          <Text style={styles.footerSub}>Authorized personnel only</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: C.text,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  shieldContainer: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldPulse: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.accentGlow,
  },
  shieldCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.surfaceRaised,
    borderWidth: 2,
    borderColor: C.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: C.text,
    letterSpacing: -0.5,
  },
  heroDomain: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: C.accent,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: C.textSecondary,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: C.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 2,
  },
  accessCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  accessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  accessIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessCardInfo: {
    flex: 1,
  },
  accessCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: C.text,
    letterSpacing: -0.2,
  },
  accessCardDesc: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  accessCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  accessTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  accessTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: C.accent,
    letterSpacing: 0.2,
  },
  urlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  urlText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: C.textMuted,
    letterSpacing: 0.2,
  },
  accessArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: C.text,
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginLeft: 64,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#34D399',
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 6,
  },
  footerLine: {
    width: 36,
    height: 2,
    backgroundColor: C.border,
    borderRadius: 1,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500' as const,
  },
  footerSub: {
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 0.3,
  },
});
