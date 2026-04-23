// v1.1
// PutHere App - Sign In
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, HelpCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthColors from '@/constants/authColors';
import { useAuth } from '@/providers/AuthProvider';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  const handleSignIn = useCallback(async () => {
    if (!validate()) return;

    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setIsLoading(true);
    setErrors({});

    try {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        setErrors({ general: result.error ?? 'Sign in failed' });
      }
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }, [validate, email, password, signIn, buttonScale]);

  const clearFieldError = useCallback((field: 'email' | 'password') => {
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
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <Text style={styles.tagline}>Keep track of your stuff</Text>
            </View>

            {errors.general ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <View style={[styles.inputWrap, errors.email ? styles.inputError : null]}>
                  <Mail color={AuthColors.textMuted} size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={AuthColors.inputPlaceholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); clearFieldError('email'); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    testID="signin-email"
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
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    testID="signin-password"
                  />
                  <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={8}>
                    {showPassword
                      ? <EyeOff color={AuthColors.textMuted} size={18} />
                      : <Eye color={AuthColors.textMuted} size={18} />}
                  </Pressable>
                </View>
                {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
              </View>

              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => router.push('/auth/forgot-password')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                  onPress={handleSignIn}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  testID="signin-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/sign-up')} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign Up</Text>
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
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 200,
    height: 70,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 15,
    color: AuthColors.textSecondary,
    letterSpacing: 0.3,
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
    gap: 16,
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: AuthColors.accent,
    fontSize: 13,
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
    marginVertical: 28,
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
    marginTop: 32,
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
});
