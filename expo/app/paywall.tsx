// v1.1
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Animated, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown, Check, X, Zap, Infinity, Shield, Share2, Download,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscription, SubscriptionPlan, SubscriptionSource } from '@/providers/SubscriptionProvider';

type PlanOption = 'monthly' | 'yearly';

const FEATURES = [
  { icon: Infinity, label: 'Unlimited items', free: false },
  { icon: Download, label: 'Export data (CSV/JSON)', free: true },
  { icon: Share2, label: 'Share items with others', free: true },
  { icon: Shield, label: 'Priority support', free: false },
  { icon: Zap, label: 'Early access to new features', free: false },
];

export default function PaywallScreen() {
  const { subscribe, isPro, restorePurchase, freeItemLimit } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const getSubscriptionSource = useCallback((): SubscriptionSource => {
    if (Platform.OS === 'ios') return 'apple';
    if (Platform.OS === 'android') return 'google';
    return 'stripe';
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setIsProcessing(true);
    try {
      const source = getSubscriptionSource();
      subscribe(selectedPlan, source);
      const autoRenewMsg = source === 'apple' || source === 'google'
        ? '\nAuto-renewal is managed by your app store.'
        : '\nYou can toggle auto-renewal in Settings.';
      Alert.alert(
        'Welcome to PutHere Pro!',
        `You now have unlimited access to all features.${autoRenewMsg}`,
        [{ text: 'Let\'s Go', onPress: () => router.back() }]
      );
    } catch (err) {
      console.log('Subscribe error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPlan, subscribe, buttonScale, getSubscriptionSource]);

  const handleRestore = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const restored = await restorePurchase();
    if (restored) {
      Alert.alert('Restored', 'Your subscription has been restored.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('No Purchase Found', 'We could not find an active subscription to restore.');
    }
  }, [restorePurchase]);

  if (isPro) {
    return (
      <View style={styles.container}>
        <View style={styles.alreadyPro}>
          <View style={styles.proIconWrap}>
            <Crown color="#F5A623" size={40} />
          </View>
          <Text style={styles.alreadyProTitle}>You're already Pro!</Text>
          <Text style={styles.alreadyProDesc}>You have unlimited access to all features.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={16}>
        <X color={Colors.textSecondary} size={22} />
      </TouchableOpacity>

      <LinearGradient
        colors={['#F5A623', '#E8873C', '#C4763B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <View style={styles.crownWrap}>
            <Crown color="#fff" size={44} />
          </View>
          <Text style={styles.heroTitle}>Upgrade to Pro</Text>
          <Text style={styles.heroSubtitle}>
            You've reached the free limit of {freeItemLimit} items.{'\n'}
            Go Pro for unlimited storage.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.plansSection}>
        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'yearly' && styles.planCardSelected,
          ]}
          onPress={() => setSelectedPlan('yearly')}
          activeOpacity={0.7}
        >
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>BEST VALUE</Text>
          </View>
          <View style={styles.planHeader}>
            <View style={[
              styles.planRadio,
              selectedPlan === 'yearly' && styles.planRadioSelected,
            ]}>
              {selectedPlan === 'yearly' && <View style={styles.planRadioInner} />}
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Yearly</Text>
              <Text style={styles.planPrice}>$19.99<Text style={styles.planPeriod}>/year</Text></Text>
            </View>
            <View style={styles.planSavings}>
              <Text style={styles.planSavingsText}>Save 17%</Text>
            </View>
          </View>
          <Text style={styles.planBreakdown}>Just $1.67/month</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'monthly' && styles.planCardSelected,
          ]}
          onPress={() => setSelectedPlan('monthly')}
          activeOpacity={0.7}
        >
          <View style={styles.planHeader}>
            <View style={[
              styles.planRadio,
              selectedPlan === 'monthly' && styles.planRadioSelected,
            ]}>
              {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>$1.99<Text style={styles.planPeriod}>/month</Text></Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>What you get with Pro</Text>
        {FEATURES.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <View key={idx} style={styles.featureRow}>
              <View style={[
                styles.featureIconWrap,
                !feature.free && { backgroundColor: '#F5A623' + '20' },
              ]}>
                <Icon
                  color={feature.free ? Colors.success : '#F5A623'}
                  size={18}
                />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
              {feature.free ? (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              ) : (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[styles.subscribeButton, isProcessing && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={isProcessing}
          activeOpacity={0.8}
          testID="subscribe-btn"
        >
          <LinearGradient
            colors={['#F5A623', '#E8873C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeGradient}
          >
            <Crown color="#fff" size={20} />
            <Text style={styles.subscribeText}>
              {isProcessing ? 'Processing...' : `Subscribe Now — ${selectedPlan === 'yearly' ? '$19.99/yr' : '$1.99/mo'}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {isInTrial && (
        <TouchableOpacity
          style={[styles.autoChargeBox, autoChargeEnabled && styles.autoChargeBoxActive]}
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            if (autoChargeEnabled) {
              disableTrialAutoCharge();
            } else {
              enableTrialAutoCharge(selectedPlan);
            }
          }}
          activeOpacity={0.7}
          testID="trial-auto-charge-toggle"
        >
          <View style={[styles.autoChargeCheckbox, autoChargeEnabled && styles.autoChargeCheckboxActive]}>
            {autoChargeEnabled && <Clock color="#fff" size={14} />}
          </View>
          <View style={styles.autoChargeTextWrap}>
            <Text style={styles.autoChargeTitle}>Auto-charge when trial ends</Text>
            <Text style={styles.autoChargeDesc}>
              {autoChargeEnabled
                ? `You will be charged for the ${selectedPlan === 'yearly' ? 'yearly' : 'monthly'} plan at the end of your ${trialDays}-day trial.`
                : `Try risk-free. Without a subscription, your account will lock when the trial ends.`}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} activeOpacity={0.6}>
        <Text style={styles.restoreText}>Restore Purchase</Text>
      </TouchableOpacity>

      <Text style={styles.legalText}>
        Payment will be charged to your account upon confirmation.
        Subscriptions auto-renew unless canceled at least 24 hours before the end of the current period.
        No refunds or partial refunds are provided for cancelled subscriptions.
        Cancellations take effect at the end of the current billing period.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroGradient: {
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    alignItems: 'center',
  },
  crownWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  plansSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#F5A623',
    backgroundColor: '#FFF9F0',
  },
  planBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioSelected: {
    borderColor: '#F5A623',
  },
  planRadioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5A623',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 2,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  planSavings: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planSavingsText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#2E7D32',
  },
  planBreakdown: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
    marginLeft: 36,
    fontWeight: '500' as const,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.successLight + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  freeBadge: {
    backgroundColor: Colors.successLight + '50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  proBadge: {
    backgroundColor: '#F5A623' + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#E8873C',
  },
  subscribeButton: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  subscribeText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  legalText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 16,
    paddingHorizontal: 32,
    paddingBottom: 8,
  },
  alreadyPro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  proIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5A623' + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  alreadyProTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  alreadyProDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
