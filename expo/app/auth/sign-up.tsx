// v1.1
// PutHere App - Sign Up
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated, Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Check, HelpCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthColors from '@/constants/authColors';
import { useAuth } from '@/providers/AuthProvider';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(pw: string): { level: PasswordStrength; score: number } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: 'weak', score: 1 };
  if (score === 2) return { level: 'fair', score: 2 };
  if (score === 3) return { level: 'good', score: 3 };
  return { level: 'strong', score: 4 };
}

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  weak: '#FF4D4D',
  fair: '#FFAA33',
  good: '#34D399',
  strong: '#22C55E',
};

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { initiateSignUp } = useAuth();
  const params = useLocalSearchParams<{ invite_email?: string; inviter?: string }>();

  const isInvitation = !!params.invite_email;
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.invite_email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const strength = useMemo(() => {
    if (!password) return null;
    return getPasswordStrength(password);
  }, [password]);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Enter a valid email address';
    }
    if (!password) {
      e.password = 'Password is required';
    } else if (password.length < 6) {
      e.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      e.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    if (!agreedToTerms) {
      e.terms = 'You must agree to the terms';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, email, password, confirmPassword, agreedToTerms]);

  const handleSignUp = useCallback(async () => {
    if (!validate()) return;

    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setIsLoading(true);
    setErrors({});

    try {
      const result = await initiateSignUp(name.trim(), email.trim(), password);
      if (!result.success) {
        setErrors({ general: result.error ?? 'Sign up failed' });
      } else if (result.needsVerification || result.emailFailed) {
        router.replace('/auth/verify-email');
      }
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }, [validate, name, email, password, initiateSignUp, buttonScale]);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{isInvitation ? 'Accept Invitation' : 'Create Account'}</Text>
              <Text style={styles.subtitle}>
                {isInvitation
                  ? `${params.inviter ?? 'Someone'} invited you to share access. Create your account to get started.`
                  : 'Start tracking your stuff today'}
              </Text>
            </View>

            {isInvitation ? (
              <View style={styles.inviteBanner}>
                <Mail color="#D2691E" size={18} />
                <Text style={styles.inviteBannerText}>
                  Sign up with <Text style={styles.inviteBannerEmail}>{params.invite_email}</Text> to access shared items.
                </Text>
              </View>
            ) : null}

            {errors.general ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <View style={[styles.inputWrap, errors.name ? styles.inputError : null]}>
                  <User color={AuthColors.textMuted} size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={AuthColors.inputPlaceholder}
                    value={name}
                    onChangeText={(t) => { setName(t); clearFieldError('name'); }}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    testID="signup-name"
                  />
                </View>
                {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <View style={[styles.inputWrap, errors.email ? styles.inputError : null]}>
                  <Mail color={AuthColors.textMuted} size={18} />
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, isInvitation && styles.inputLocked]}
                    placeholder="Email address"
                    placeholderTextColor={AuthColors.inputPlaceholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); clearFieldError('email'); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!isInvitation}
                    testID="signup-email"
                  />
                </View>
                {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <View style={[styles.inputWrap, errors.password ? styles.inputError : null]}>
                  <Lock color={AuthColors.textMuted} size={18} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={AuthColors.inputPlaceholder}
                    value={password}
                    onChangeText={(t) => { setPassword(t); clearFieldError('password'); }}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    testID="signup-password"
                  />
                  <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={8}>
                    {showPassword
                      ? <EyeOff color={AuthColors.textMuted} size={18} />
                      : <Eye color={AuthColors.textMuted} size={18} />}
                  </Pressable>
                </View>
                {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
                {strength ? (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map(i => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor: i <= strength.score
                                ? STRENGTH_COLORS[strength.level]
                                : AuthColors.divider,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength.level] }]}>
                      {strength.level.charAt(0).toUpperCase() + strength.level.slice(1)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <View style={[styles.inputWrap, errors.confirmPassword ? styles.inputError : null]}>
                  <Lock color={AuthColors.textMuted} size={18} />
                  <TextInput
                    ref={confirmRef}
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={AuthColors.inputPlaceholder}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); clearFieldError('confirmPassword'); }}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    testID="signup-confirm-password"
                  />
                  <Pressable onPress={() => setShowConfirmPassword(p => !p)} hitSlop={8}>
                    {showConfirmPassword
                      ? <EyeOff color={AuthColors.textMuted} size={18} />
                      : <Eye color={AuthColors.textMuted} size={18} />}
                  </Pressable>
                </View>
                {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => { setAgreedToTerms(p => !p); clearFieldError('terms'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms ? <Check color="#fff" size={14} /> : null}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms ? <Text style={[styles.fieldError, { marginTop: -4 }]}>{errors.terms}</Text> : null}

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  testID="signup-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign Up</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => router.push('/auth/contact-support' as never)}
              activeOpacity={0.7}
              testID="contact-support-link"
            >
              <HelpCircle color={AuthColors.textMuted} size={15} />
              <Text style={styles.supportText}>Need help? Contact Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
  },
  inner: {
    paddingHorizontal: 28,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: AuthColors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: AuthColors.textSecondary,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.25)',
  },
  errorBannerText: {
    color: AuthColors.textDanger,
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuthColors.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AuthColors.inputBorder,
    paddingHorizontal: 16,
    gap: 12,
    height: 54,
  },
  inputError: {
    borderColor: AuthColors.textDanger,
  },
  input: {
    flex: 1,
    color: AuthColors.inputText,
    fontSize: 15,
    paddingVertical: 0,
  },
  fieldError: {
    color: AuthColors.textDanger,
    fontSize: 12,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    minWidth: 44,
    textAlign: 'right' as const,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AuthColors.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: AuthColors.accent,
    borderColor: AuthColors.accent,
  },
  termsText: {
    flex: 1,
    color: AuthColors.textSecondary,
    fontSize: 13,
  },
  termsLink: {
    color: AuthColors.accent,
    fontWeight: '600' as const,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: AuthColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AuthColors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AuthColors.divider,
  },
  dividerText: {
    color: AuthColors.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  socialButtons: {
    gap: 12,
  },
  socialBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: AuthColors.surface,
    borderWidth: 1,
    borderColor: AuthColors.inputBorder,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  socialBtnText: {
    color: AuthColors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  footerText: {
    color: AuthColors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: AuthColors.accent,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingBottom: 8,
  },
  supportText: {
    color: AuthColors.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  inviteBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  inviteBannerText: {
    flex: 1,
    color: '#5D4037',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  inviteBannerEmail: {
    fontWeight: '700' as const,
    color: '#D2691E',
  },
  inputLocked: {
    opacity: 0.6,
  },
});
