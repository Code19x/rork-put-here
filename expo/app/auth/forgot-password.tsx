// v1.1
// PutHere App - Forgot Password
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, KeyRound, CheckCircle, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthColors from '@/constants/authColors';
import { useAuth } from '@/providers/AuthProvider';

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { resetPassword, verifyResetCode, completeResetWithNewPassword, resendResetCode, setPendingResetCode } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const stepFade = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateStepTransition = useCallback(() => {
    stepFade.setValue(0);
    Animated.timing(stepFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [stepFade]);

  useEffect(() => {
    if (step === 'done') {
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [step]);

  const validateEmail = useCallback(() => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  }, [email]);

  const handleSendCode = useCallback(async () => {
    if (!validateEmail()) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await resetPassword(email.trim());
      console.log('Reset password result:', JSON.stringify(result));
      if (!result.success) {
        const errMsg = result.error?.toLowerCase() ?? '';
        if (errMsg.includes('not found') || errMsg.includes('no user') || errMsg.includes('no account')) {
          setError('No account was found for that email address.');
        } else if (errMsg.includes('check your email') || errMsg.includes('failed to send')) {
          setError(result.error ?? 'We could not send the reset code. Please try again.');
        } else {
          setError(result.error ?? 'We could not send the reset code. Please try again.');
        }
      } else {
        setSuccessMsg('We sent a 6-digit code to your email.');
        setStep('code');
        animateStepTransition();
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: unknown) {
      console.log('Reset password exception:', err);
      setError('We could not send the reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [validateEmail, email, resetPassword, animateStepTransition]);

  const handleVerifyCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Please enter the recovery code.');
      return;
    }
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await verifyResetCode(code.trim());
      console.log('Verify code result:', JSON.stringify(result));
      if (!result.success) {
        setError(result.error ?? 'The code is incorrect or expired.');
      } else {
        setPendingResetCode(code.trim());
        setSuccessMsg('Code verified successfully.');
        setStep('password');
        animateStepTransition();
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: unknown) {
      console.log('Verify code exception:', err);
      setError('We could not verify the code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [code, verifyResetCode, setPendingResetCode, animateStepTransition]);

  const handleSetPassword = useCallback(async () => {
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }
    if (!confirmPassword) {
      setError('Please confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await completeResetWithNewPassword(newPassword);
      console.log('Set password result:', JSON.stringify(result));
      if (!result.success) {
        setError('We could not update your password. Please try again.');
      } else {
        setStep('done');
        animateStepTransition();
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: unknown) {
      console.log('Set password exception:', err);
      setError('We could not update your password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, confirmPassword, completeResetWithNewPassword, animateStepTransition]);

  const handleResend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await resendResetCode();
      if (!result.success) {
        setError('We could not resend the code right now. Please wait a moment and try again.');
      } else {
        setSuccessMsg('A new reset code has been sent to your email.');
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: unknown) {
      console.log('Resend exception:', err);
      setError('We could not resend the code right now. Please wait a moment and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [resendResetCode]);

  const handleCodeChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'email' || step === 'done') {
      router.back();
    } else if (step === 'code') {
      setStep('email');
      setCode('');
      setError(null);
      setSuccessMsg(null);
      animateStepTransition();
    } else if (step === 'password') {
      setStep('code');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccessMsg(null);
      animateStepTransition();
    }
  }, [step, animateStepTransition]);

  const getStepIndicator = () => {
    const steps: Step[] = ['email', 'code', 'password'];
    const currentIdx = steps.indexOf(step);
    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              i <= currentIdx ? styles.stepDotActive : null,
              i < currentIdx ? styles.stepDotCompleted : null,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderEmailStep = () => (
    <>
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <Mail color={AuthColors.accent} size={36} />
        </View>
      </View>

      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you a password reset code.
      </Text>

      {getStepIndicator()}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <View style={[styles.inputWrap, error ? styles.inputError : null]}>
            <Mail color={AuthColors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={AuthColors.inputPlaceholder}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
              testID="forgot-email"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
          onPress={handleSendCode}
          disabled={isLoading}
          activeOpacity={0.85}
          testID="send-reset-button"
        >
          {isLoading ? (
            <><ActivityIndicator color="#fff" size="small" /><Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Sending code...</Text></>
          ) : (
            <Text style={styles.primaryBtnText}>Send Reset Code</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderCodeStep = () => (
    <>
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <ShieldCheck color={AuthColors.accent} size={36} />
        </View>
      </View>

      <Text style={styles.title}>Enter Recovery Code</Text>
      <Text style={styles.subtitle}>
        Enter the recovery code sent to your email.
      </Text>

      {getStepIndicator()}

      {successMsg ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMsg}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <View style={[styles.inputWrap, error ? styles.inputError : null]}>
            <KeyRound color={AuthColors.textMuted} size={18} />
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="Recovery code"
              placeholderTextColor={AuthColors.inputPlaceholder}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerifyCode}
              testID="reset-code-input"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
          onPress={handleVerifyCode}
          disabled={isLoading}
          activeOpacity={0.85}
          testID="verify-code-button"
        >
          {isLoading ? (
            <><ActivityIndicator color="#fff" size="small" /><Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Verifying code...</Text></>
          ) : (
            <Text style={styles.primaryBtnText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.resendText}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <Lock color={AuthColors.accent} size={36} />
        </View>
      </View>

      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>
        Enter your new password below.
      </Text>

      {getStepIndicator()}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <View style={[styles.inputWrap, error ? styles.inputError : null]}>
            <Lock color={AuthColors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={AuthColors.inputPlaceholder}
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setError(null); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="next"
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
          <View style={[styles.inputWrap, error ? styles.inputError : null]}>
            <Lock color={AuthColors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={AuthColors.inputPlaceholder}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSetPassword}
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
          style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
          onPress={handleSetPassword}
          disabled={isLoading}
          activeOpacity={0.85}
          testID="set-password-button"
        >
          {isLoading ? (
            <><ActivityIndicator color="#fff" size="small" /><Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Updating password...</Text></>
          ) : (
            <Text style={styles.primaryBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderDoneStep = () => (
    <View style={styles.successContainer}>
      <Animated.View style={[styles.successIconWrap, { transform: [{ scale: successScale }] }]}>
        <CheckCircle color={AuthColors.success} size={56} />
      </Animated.View>
      <Text style={styles.successTitle}>Password Updated!</Text>
      <Text style={styles.successSubtitle}>
        Your password has been successfully reset. You can now sign in with your new password.
      </Text>

      <TouchableOpacity
        style={styles.backToSignInBtn}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Text style={styles.backToSignInText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft color={AuthColors.textSecondary} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={{ opacity: stepFade }}>
              {step === 'email' && renderEmailStep()}
              {step === 'code' && renderCodeStep()}
              {step === 'password' && renderPasswordStep()}
              {step === 'done' && renderDoneStep()}
            </Animated.View>
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
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AuthColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 28,
    marginTop: -40,
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
    marginBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: AuthColors.inputBorder,
  },
  stepDotActive: {
    backgroundColor: AuthColors.accent,
  },
  stepDotCompleted: {
    backgroundColor: AuthColors.success,
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
  errorText: {
    color: AuthColors.textDanger,
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  successBanner: {
    backgroundColor: 'rgba(46, 160, 67, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(46, 160, 67, 0.25)',
  },
  successBannerText: {
    color: AuthColors.success,
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  form: {
    gap: 18,
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '700' as const,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: AuthColors.accent,
    flexDirection: 'row' as const,
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
  resendBtn: {
    alignItems: 'center',
  },
  resendText: {
    color: AuthColors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  emailHighlight: {
    color: AuthColors.accent,
    fontWeight: '700' as const,
  },
  successContainer: {
    alignItems: 'center',
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
  backToSignInBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: AuthColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    shadowColor: AuthColors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  backToSignInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
