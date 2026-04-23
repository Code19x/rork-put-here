// v1.1
// PutHere App - Verify Email
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, NativeSyntheticEvent, TextInputKeyPressEventData,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthColors from '@/constants/authColors';
import { useAuth } from '@/providers/AuthProvider';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { verifyEmailAndSignUp, resendVerificationCode, cancelPendingVerification } = useAuth();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const shakeBox = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    if (!digit && !text) {
      const updated = [...code];
      updated[index] = '';
      setCode(updated);
      return;
    }

    if (digit.length === 1) {
      const updated = [...code];
      updated[index] = digit;
      setCode(updated);
      setError(null);
      if (index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (digit.length > 1) {
      const digits = digit.slice(0, CODE_LENGTH).split('');
      const updated = [...code];
      digits.forEach((d, i) => {
        if (index + i < CODE_LENGTH) updated[index + i] = d;
      });
      setCode(updated);
      setError(null);
      const nextIdx = Math.min(index + digits.length, CODE_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
    }
  }, [code]);

  const handleKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      const updated = [...code];
      updated[index - 1] = '';
      setCode(updated);
      inputRefs.current[index - 1]?.focus();
    }
  }, [code]);

  const handleVerify = useCallback(async () => {
    const fullCode = code.join('');
    if (fullCode.length < CODE_LENGTH) {
      setError('Please enter the full 6-digit code');
      shakeBox();
      return;
    }

    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyEmailAndSignUp(fullCode);
      if (!result.success) {
        setError(result.error ?? 'Verification failed');
        shakeBox();
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      shakeBox();
    } finally {
      setIsVerifying(false);
    }
  }, [code, verifyEmailAndSignUp, shakeBox]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    setIsResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      const result = await resendVerificationCode();
      if (result.success) {
        setResendTimer(RESEND_COOLDOWN);
        setResendSuccess(true);
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        setError(result.error ?? 'Failed to resend code');
      }
    } catch {
      setError('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  }, [resendTimer, resendVerificationCode]);

  const handleBack = useCallback(() => {
    cancelPendingVerification();
    router.back();
  }, [cancelPendingVerification]);

  const isCodeComplete = code.every(d => d !== '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={AuthColors.textSecondary} size={22} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <ShieldCheck color={AuthColors.accent} size={40} />
            </Animated.View>
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to your email.{'\n'}Enter it below to verify your account.
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {resendSuccess ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>Code resent successfully!</Text>
            </View>
          ) : null}

          <Animated.View style={[styles.codeRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                style={[
                  styles.codeInput,
                  code[i] ? styles.codeInputFilled : null,
                  error ? styles.codeInputError : null,
                ]}
                value={code[i]}
                onChangeText={t => handleChange(t, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={i === 0 ? CODE_LENGTH : 1}
                selectTextOnFocus
                testID={`otp-input-${i}`}
              />
            ))}
          </Animated.View>

          <TouchableOpacity
            style={[styles.verifyBtn, (!isCodeComplete || isVerifying) && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!isCodeComplete || isVerifying}
            activeOpacity={0.85}
            testID="verify-button"
          >
            {isVerifying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>
                Resend code in <Text style={styles.resendTimerBold}>{resendTimer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending} activeOpacity={0.7}>
                {isResending ? (
                  <ActivityIndicator color={AuthColors.accent} size="small" />
                ) : (
                  <Text style={styles.resendLink}>Resend Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
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
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    marginTop: -60,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
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
  errorText: {
    color: AuthColors.textDanger,
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  successBanner: {
    backgroundColor: AuthColors.successMuted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  successText: {
    color: AuthColors.success,
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  codeInput: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: AuthColors.inputBg,
    borderWidth: 1.5,
    borderColor: AuthColors.inputBorder,
    color: AuthColors.text,
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  codeInputFilled: {
    borderColor: AuthColors.accent,
    backgroundColor: AuthColors.accentMuted,
  },
  codeInputError: {
    borderColor: AuthColors.textDanger,
  },
  verifyBtn: {
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
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendTimer: {
    color: AuthColors.textMuted,
    fontSize: 14,
  },
  resendTimerBold: {
    color: AuthColors.textSecondary,
    fontWeight: '700' as const,
  },
  resendLink: {
    color: AuthColors.accent,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
