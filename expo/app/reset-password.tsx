// v1.1
// PutHere App - Reset Password
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthColors from '@/constants/authColors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type ResetState = 'loading' | 'form' | 'success' | 'error';

function parseHashTokens(): { access_token?: string; refresh_token?: string; type?: string } {
  if (Platform.OS !== 'web') return {};
  try {
    const hash = window.location.hash?.substring(1);
    if (!hash) return {};
    const params = new URLSearchParams(hash);
    return {
      access_token: params.get('access_token') ?? undefined,
      refresh_token: params.get('refresh_token') ?? undefined,
      type: params.get('type') ?? undefined,
    };
  } catch (err) {
    console.log('reset-password: parseHashTokens error:', err);
    return {};
  }
}

function parseQueryTokens(): { token_hash?: string; type?: string } {
  if (Platform.OS !== 'web') return {};
  try {
    const search = window.location.search;
    if (!search) return {};
    const params = new URLSearchParams(search);
    return {
      token_hash: params.get('token_hash') ?? undefined,
      type: params.get('type') ?? undefined,
    };
  } catch (err) {
    console.log('reset-password: parseQueryTokens error:', err);
    return {};
  }
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const params = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
    access_token?: string;
    refresh_token?: string;
  }>();

  const [state, setState] = useState<ResetState>(isPasswordRecovery ? 'form' : 'loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isPasswordRecovery) {
      console.log('reset-password: AuthProvider already in recovery mode, showing form');
      setState('form');
      return;
    }

    const handleRecovery = async () => {
      console.log('reset-password: route params:', JSON.stringify(params));

      const hashTokens = parseHashTokens();
      const queryTokens = parseQueryTokens();
      console.log('reset-password: hash tokens:', JSON.stringify(hashTokens));
      console.log('reset-password: query tokens:', JSON.stringify(queryTokens));

      const accessToken = params.access_token || hashTokens.access_token;
      const refreshToken = params.refresh_token || hashTokens.refresh_token;
      const tokenHash = params.token_hash || queryTokens.token_hash;
      const tokenType = params.type || hashTokens.type || queryTokens.type;

      if (accessToken && refreshToken) {
        console.log('reset-password: Setting session from access/refresh tokens');
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.log('reset-password: setSession error:', sessionError.message);
            setInitError('Invalid or expired reset link. Please request a new one.');
            setState('error');
            return;
          }

          if (data.session) {
            console.log('reset-password: Session set successfully for:', data.session.user?.email);
            setState('form');
            return;
          }
        } catch (err) {
          console.log('reset-password: setSession exception:', err);
          setInitError('Something went wrong. Please request a new reset link.');
          setState('error');
          return;
        }
      }

      if (tokenHash && tokenType === 'recovery') {
        console.log('reset-password: Verifying token_hash via OTP verify');
        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (verifyError) {
            console.log('reset-password: verifyOtp error:', verifyError.message);
            setInitError('Invalid or expired reset link. Please request a new one.');
            setState('error');
            return;
          }

          if (data.session) {
            console.log('reset-password: OTP verified, session created for:', data.session.user?.email);
            setState('form');
            return;
          }
        } catch (err) {
          console.log('reset-password: verifyOtp exception:', err);
          setInitError('Something went wrong. Please request a new reset link.');
          setState('error');
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('reset-password: Existing session found for:', session.user?.email);
        setState('form');
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('reset-password: auth event:', event);
        if (event === 'PASSWORD_RECOVERY' && session) {
          console.log('reset-password: PASSWORD_RECOVERY event received');
          setState('form');
          subscription.unsubscribe();
        } else if (event === 'SIGNED_IN' && session) {
          console.log('reset-password: SIGNED_IN event received');
          setState('form');
          subscription.unsubscribe();
        }
      });

      setTimeout(() => {
        setState((current) => {
          if (current === 'loading') {
            console.log('reset-password: Timeout — no auth event received');
            setInitError('Invalid or expired reset link. Please request a new one.');
            subscription.unsubscribe();
            return 'error';
          }
          return current;
        });
      }, 10000);

      return () => {
        subscription.unsubscribe();
      };
    };

    void handleRecovery();
  }, [params.access_token, params.refresh_token, params.token_hash, params.type, isPasswordRecovery]);

  const validate = useCallback(() => {
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  }, [password, confirmPassword]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('reset-password: Updating password...');
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.log('reset-password: updateUser error:', updateError.message);
        setError(updateError.message);
        return;
      }

      console.log('reset-password: Password updated successfully');

      clearPasswordRecovery();
      await supabase.auth.signOut();
      console.log('reset-password: Signed out after password update');

      setState('success');
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } catch (err: unknown) {
      console.log('reset-password: exception:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, password, successScale]);

  const handleGoToSignIn = useCallback(() => {
    clearPasswordRecovery();
    if (Platform.OS === 'web') {
      try {
        const origin = window.location.origin;
        window.location.href = `${origin}/auth/sign-in`;
        return;
      } catch {}
    }
    router.replace('/auth/sign-in');
  }, [clearPasswordRecovery]);

  const handleRequestNew = useCallback(() => {
    if (Platform.OS === 'web') {
      try {
        const origin = window.location.origin;
        window.location.href = `${origin}/auth/forgot-password`;
        return;
      } catch {}
    }
    router.replace('/auth/forgot-password');
  }, []);

  if (state === 'loading') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={AuthColors.accent} />
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <View style={styles.errorIconWrap}>
            <ShieldCheck color={AuthColors.textDanger} size={48} />
          </View>
          <Text style={styles.errorTitle}>Link Expired</Text>
          <Text style={styles.errorSubtitle}>{initError}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleRequestNew}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Request New Link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={handleGoToSignIn}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryLinkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state === 'success') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <Animated.View style={[styles.successIconWrap, { transform: [{ scale: successScale }] }]}>
            <CheckCircle color={AuthColors.success} size={56} />
          </Animated.View>
          <Text style={styles.successTitle}>Password Updated</Text>
          <Text style={styles.successSubtitle}>
            Your password has been changed successfully.{'\n'}You can now sign in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleGoToSignIn}
            activeOpacity={0.85}
            testID="go-to-sign-in"
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
            <View style={styles.iconWrap}>
              <View style={styles.iconCircle}>
                <Lock color={AuthColors.accent} size={36} />
              </View>
            </View>

            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below.{'\n'}Make sure it's at least 6 characters.
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <View style={styles.inputWrap}>
                  <Lock color={AuthColors.textMuted} size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={AuthColors.inputPlaceholder}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(null); }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="new-password-input"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showPassword ? (
                      <EyeOff color={AuthColors.textMuted} size={18} />
                    ) : (
                      <Eye color={AuthColors.textMuted} size={18} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrap}>
                  <Lock color={AuthColors.textMuted} size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor={AuthColors.inputPlaceholder}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="confirm-password-input"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showConfirm ? (
                      <EyeOff color={AuthColors.textMuted} size={18} />
                    ) : (
                      <Eye color={AuthColors.textMuted} size={18} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
                testID="set-password-button"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryLink}
              onPress={handleGoToSignIn}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryLinkText}>Cancel</Text>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  loadingText: {
    color: AuthColors.textSecondary,
    fontSize: 15,
    marginTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 28,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AuthColors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: AuthColors.text,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: AuthColors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
    marginBottom: 28,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: AuthColors.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AuthColors.inputBorder,
    paddingHorizontal: 16,
    gap: 12,
    height: 54,
  },
  input: {
    flex: 1,
    color: AuthColors.inputText,
    fontSize: 15,
    paddingVertical: 0,
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
  secondaryLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  secondaryLinkText: {
    color: AuthColors.accent,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  errorIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 77, 77, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: AuthColors.text,
    marginBottom: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    color: AuthColors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 32,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AuthColors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: AuthColors.text,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 14,
    color: AuthColors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 32,
  },
});
