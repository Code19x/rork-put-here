import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { Lock, Delete, ScanFace, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

export default function PinLockScreen() {
  const { verifyPin, biometricEnabled, biometricAvailable, biometricType, authenticateWithBiometric, signOut } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bioBtnScale = useRef(new Animated.Value(1)).current;
  const dotScales = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(0))
  ).current;

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
        setPin('');
        setError(false);
        dotScales.forEach((dot) => {
          Animated.timing(dot, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        });
      }, 300);
    });
  }, [shakeAnim, dotScales]);

  const handleBiometricUnlock = useCallback(async () => {
    Animated.sequence([
      Animated.timing(bioBtnScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(bioBtnScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const success = await authenticateWithBiometric();
    if (success) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [authenticateWithBiometric, bioBtnScale]);

  useEffect(() => {
    if (biometricEnabled && biometricAvailable && Platform.OS !== 'web') {
      const timer = setTimeout(() => {
        void authenticateWithBiometric();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [biometricEnabled, biometricAvailable, authenticateWithBiometric]);

  const handleKeyPress = useCallback(async (key: string) => {
    if (key === 'delete') {
      setPin(prev => {
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

    setPin(prev => {
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
    if (pin.length === PIN_LENGTH) {
      const timer = setTimeout(async () => {
        const success = await verifyPin(pin);
        if (!success) {
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          shake();
        } else {
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pin, verifyPin, shake]);

  const showBiometric = biometricEnabled && biometricAvailable && Platform.OS !== 'web';

  const handleSignOut = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void signOut();
  }, [signOut]);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.lockIcon}>
          <Lock color={Colors.primary} size={32} />
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Enter your PIN to unlock</Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={styles.dotOuter}>
              <Animated.View
                style={[
                  styles.dotInner,
                  error && styles.dotError,
                  {
                    transform: [{ scale: dotScales[i] }],
                  },
                ]}
              />
            </View>
          ))}
        </Animated.View>

        {error && (
          <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>
        )}

        {showBiometric && (
          <Animated.View style={{ transform: [{ scale: bioBtnScale }] }}>
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={handleBiometricUnlock}
              activeOpacity={0.7}
              testID="biometric-unlock-btn"
            >
              <ScanFace color={Colors.primary} size={28} />
              <Text style={styles.biometricText}>Use {biometricType}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

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
                testID="pin-delete-btn"
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
              testID={`pin-key-${key}`}
            >
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleSignOut}
        activeOpacity={0.7}
        testID="pin-sign-out-btn"
      >
        <LogOut color={Colors.textMuted} size={16} />
        <Text style={styles.signOutText}>Sign in with a different account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight + '25',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primaryLight + '40',
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
    marginBottom: 36,
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
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight + '18',
    borderWidth: 1,
    borderColor: Colors.primaryLight + '30',
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
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
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
});
