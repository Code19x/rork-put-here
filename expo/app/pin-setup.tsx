// v1.1
// PutHere App - PIN Setup
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, Delete, ArrowLeft, SkipForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';


const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

type Step = 'create' | 'confirm';

export default function PinSetupScreen() {
  const { setPin } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isOnboarding = params.mode === 'onboarding';
  const [step, setStep] = useState<Step>('create');
  const [firstPin, setFirstPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotScales = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(0))
  ).current;

  const resetDots = useCallback(() => {
    dotScales.forEach((dot) => {
      Animated.timing(dot, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    });
  }, [dotScales]);

  const animateDot = useCallback((index: number, filled: boolean) => {
    Animated.spring(dotScales[index], {
      toValue: filled ? 1 : 0,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [dotScales]);

  const shake = useCallback(() => {
    setError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        setCurrentPin('');
        setError(false);
        resetDots();
      }, 300);
    });
  }, [shakeAnim, resetDots]);

  const navigateAway = useCallback(() => {
    router.replace('/(tabs)/(home)');
  }, []);

  const handleSkip = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace('/(tabs)/(home)');
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'delete') {
      setCurrentPin(prev => {
        const newPin = prev.slice(0, -1);
        if (prev.length > 0) {
          animateDot(prev.length - 1, false);
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        return newPin;
      });
      return;
    }

    if (key === '') return;

    setCurrentPin(prev => {
      if (prev.length >= PIN_LENGTH) return prev;
      const newPin = prev + key;
      animateDot(prev.length, true);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return newPin;
    });
  }, [animateDot]);

  useEffect(() => {
    if (currentPin.length === PIN_LENGTH) {
      const timer = setTimeout(async () => {
        if (step === 'create') {
          setFirstPin(currentPin);
          setCurrentPin('');
          resetDots();
          setStep('confirm');
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } else {
          if (currentPin === firstPin) {
            const success = await setPin(currentPin);
            if (success) {
              if (Platform.OS !== 'web') {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert('PIN Created', 'Your app will now lock when you leave.', [
                { text: 'OK', onPress: navigateAway },
              ]);
            } else {
              Alert.alert('Error', 'Failed to save PIN. Please try again.');
              setStep('create');
              setFirstPin('');
              setCurrentPin('');
              resetDots();
            }
          } else {
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            shake();
            setTimeout(() => {
              setStep('create');
              setFirstPin('');
            }, 600);
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentPin, step, firstPin, shake, resetDots, navigateAway]);

  const stepLabel = step === 'create' ? 'Create a PIN' : 'Confirm your PIN';
  const stepDesc = step === 'create'
    ? 'Choose a 4-digit PIN to lock your app'
    : 'Enter the same PIN again to confirm';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
          gestureEnabled: !isOnboarding,
        }}
      />
      <View style={styles.header}>
        {!isOnboarding ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="pin-setup-back">
            <ArrowLeft color={Colors.text} size={22} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerOnboarding}>
            <View style={styles.onboardingBadge}>
              <Text style={styles.onboardingBadgeText}>Account Created</Text>
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} testID="pin-setup-skip">
              <Text style={styles.skipBtnText}>Skip</Text>
              <SkipForward color={Colors.primary} size={16} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.topSection}>
        <View style={styles.shieldIcon}>
          <ShieldCheck color={Colors.success} size={32} />
        </View>
        <Text style={styles.title}>{stepLabel}</Text>
        <Text style={styles.subtitle}>{stepDesc}</Text>
        {isOnboarding && step === 'create' && (
          <Text style={styles.optionalText}>Optional — you can set this up later in Settings</Text>
        )}

        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'create' && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
        </View>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={styles.dotOuter}>
              <Animated.View
                style={[
                  styles.dotInner,
                  error && styles.dotError,
                  { transform: [{ scale: dotScales[i] }] },
                ]}
              />
            </View>
          ))}
        </Animated.View>

        {error && (
          <Text style={styles.errorText}>PINs didn't match. Start over.</Text>
        )}
      </View>

      <View>
        <View style={styles.keypad}>
          {KEYS.map((key, index) => {
            if (key === '') {
              return <View key={index} style={styles.keyEmpty} />;
            }
            if (key === 'delete') {
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.keyBtn}
                  onPress={() => handleKeyPress('delete')}
                  activeOpacity={0.6}
                >
                  <Delete color={Colors.text} size={24} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={index}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(key)}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {isOnboarding && (
          <TouchableOpacity style={styles.skipBottomBtn} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipBottomText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerOnboarding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onboardingBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  onboardingBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  shieldIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successLight + '50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.successLight,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  optionalText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: Colors.border,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  dotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    position: 'absolute' as const,
  },
  dotError: {
    backgroundColor: Colors.danger,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    marginTop: 16,
    fontWeight: '500' as const,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  keyBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  keyEmpty: {
    width: 76,
    height: 76,
  },
  skipBottomBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipBottomText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
