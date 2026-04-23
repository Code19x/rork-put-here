// v1.1
// PutHere App - Admin Login
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Animated,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAdmin } from '@/providers/AdminProvider';

const ADMIN_COLORS = {
  bg: '#0F1923',
  surface: '#1A2735',
  surfaceLight: '#243447',
  accent: '#00D4AA',
  accentDim: 'rgba(0, 212, 170, 0.15)',
  accentGlow: 'rgba(0, 212, 170, 0.3)',
  text: '#E8EDF2',
  textSecondary: '#8899AA',
  textMuted: '#5A6A7A',
  border: '#2A3A4A',
  danger: '#FF4D6A',
  inputBg: '#162230',
};

export default function AdminLoginScreen() {
  const { adminSignIn } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminSignIn(email.trim(), password);
      if (!result.success) {
        triggerShake();
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert('Access Denied', result.error ?? 'Invalid credentials.');
      } else {
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace('/admin-dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, adminSignIn, triggerShake]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          testID="admin-back-btn"
        >
          <ArrowLeft color={ADMIN_COLORS.textSecondary} size={22} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Animated.View style={[styles.shieldWrap, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.shieldInner}>
              <Shield color={ADMIN_COLORS.accent} size={40} />
            </View>
          </Animated.View>
          <Text style={styles.title}>Admin Console</Text>
          <Text style={styles.subtitle}>puthereapp.com</Text>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Restricted Access</Text>
          </View>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Admin Email</Text>
            <View style={styles.inputWrap}>
              <Mail color={ADMIN_COLORS.textMuted} size={18} />
              <TextInput
                style={styles.input}
                placeholder="support@puthereapp.com"
                placeholderTextColor={ADMIN_COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="admin-email-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Lock color={ADMIN_COLORS.textMuted} size={18} />
              <TextInput
                style={styles.input}
                placeholder="Enter admin password"
                placeholderTextColor={ADMIN_COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                testID="admin-password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                {showPassword ? (
                  <EyeOff color={ADMIN_COLORS.textMuted} size={18} />
                ) : (
                  <Eye color={ADMIN_COLORS.textMuted} size={18} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isSubmitting && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
            testID="admin-login-btn"
          >
            {isSubmitting ? (
              <ActivityIndicator color={ADMIN_COLORS.bg} size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Authenticate</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>PutHere Admin Panel v1.0</Text>
          <Text style={styles.footerSubtext}>Authorized personnel only</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bg,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ADMIN_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shieldWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ADMIN_COLORS.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ADMIN_COLORS.accentGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: ADMIN_COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: ADMIN_COLORS.accent,
    marginTop: 4,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.danger,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: ADMIN_COLORS.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: ADMIN_COLORS.textSecondary,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: ADMIN_COLORS.text,
  },
  loginBtn: {
    backgroundColor: ADMIN_COLORS.accent,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: ADMIN_COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: ADMIN_COLORS.bg,
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
    gap: 8,
  },
  footerLine: {
    width: 40,
    height: 2,
    backgroundColor: ADMIN_COLORS.border,
    borderRadius: 1,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    fontWeight: '500' as const,
  },
  footerSubtext: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    letterSpacing: 0.5,
  },
});
