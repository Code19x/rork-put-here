import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/providers/AuthProvider';
import { vanillaClient } from '@/lib/trpc';

const TRIAL_DAYS = 7;
const STORAGE_KEY_PREFIX = 'stash_subscription_v2_';
const REMINDER_KEY_PREFIX = 'stash_trial_reminder_sent_';

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionSource = 'apple' | 'google' | 'stripe';
export type SubscriptionStatus = 'trial' | 'active' | 'expired';

interface SubscriptionState {
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  trialStartedAt: string | null;
  subscribedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  autoRenew: boolean;
  autoChargeOnTrialEnd: boolean;
  pendingPlan: SubscriptionPlan | null;
  source: SubscriptionSource | null;
}

const DEFAULT_STATE: SubscriptionState = {
  status: 'trial',
  plan: null,
  trialStartedAt: null,
  subscribedAt: null,
  expiresAt: null,
  cancelledAt: null,
  autoRenew: false,
  autoChargeOnTrialEnd: false,
  pendingPlan: null,
  source: null,
};

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function getPlatformSource(): SubscriptionSource {
  if (Platform.OS === 'ios') return 'apple';
  if (Platform.OS === 'android') return 'google';
  return 'stripe';
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_STATE);
  const userId = user?.id ?? null;
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;
  const reminderCheckedRef = useRef(false);

  const subQuery = useQuery({
    queryKey: ['subscription_v2', userId],
    enabled: !!userId && isAuthenticated,
    queryFn: async (): Promise<SubscriptionState> => {
      if (!storageKey) return DEFAULT_STATE;
      const stored = await AsyncStorage.getItem(storageKey);
      console.log('SubscriptionProvider: loading state for', userId);

      let state: SubscriptionState;
      if (!stored) {
        state = {
          ...DEFAULT_STATE,
          status: 'trial',
          trialStartedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(state));
        console.log('SubscriptionProvider: trial started for user', userId);
      } else {
        state = JSON.parse(stored) as SubscriptionState;
      }

      const now = new Date();

      if (state.status === 'active' && state.expiresAt && new Date(state.expiresAt) < now) {
        if (state.autoRenew && !state.cancelledAt) {
          console.log('SubscriptionProvider: auto-renewing');
          const next = new Date();
          const renewPlan = state.pendingPlan ?? state.plan ?? 'monthly';
          if (renewPlan === 'monthly') next.setMonth(next.getMonth() + 1);
          else next.setFullYear(next.getFullYear() + 1);
          state = {
            ...state,
            plan: renewPlan,
            subscribedAt: now.toISOString(),
            expiresAt: next.toISOString(),
            pendingPlan: null,
            cancelledAt: null,
          };
        } else {
          console.log('SubscriptionProvider: subscription expired → locked');
          state = { ...state, status: 'expired', plan: null, autoRenew: false };
        }
        await AsyncStorage.setItem(storageKey, JSON.stringify(state));
      }

      if (state.status === 'trial' && state.trialStartedAt) {
        const trialEnd = new Date(state.trialStartedAt);
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        if (now >= trialEnd) {
          if (state.autoChargeOnTrialEnd && state.pendingPlan) {
            console.log('SubscriptionProvider: auto-charging at trial end');
            const next = new Date();
            if (state.pendingPlan === 'monthly') next.setMonth(next.getMonth() + 1);
            else next.setFullYear(next.getFullYear() + 1);
            state = {
              ...state,
              status: 'active',
              plan: state.pendingPlan,
              subscribedAt: now.toISOString(),
              expiresAt: next.toISOString(),
              source: getPlatformSource(),
              autoRenew: true,
              pendingPlan: null,
            };
          } else {
            console.log('SubscriptionProvider: trial expired → locked');
            state = { ...state, status: 'expired', plan: null };
          }
          await AsyncStorage.setItem(storageKey, JSON.stringify(state));
        }
      }

      return state;
    },
  });

  useEffect(() => {
    if (subQuery.data) setSubscription(subQuery.data);
  }, [subQuery.data]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setSubscription(DEFAULT_STATE);
      reminderCheckedRef.current = false;
    }
  }, [isAuthenticated, userId]);

  const persist = useMutation({
    mutationFn: async (updated: SubscriptionState) => {
      if (!storageKey) throw new Error('No user');
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      console.log('SubscriptionProvider: saved', updated.status, updated.plan);
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription_v2', userId] });
    },
  });

  const trialDaysLeft = useMemo(() => {
    if (subscription.status !== 'trial' || !subscription.trialStartedAt) return null;
    const trialEnd = new Date(subscription.trialStartedAt);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    return Math.max(0, daysBetween(trialEnd, new Date()));
  }, [subscription.status, subscription.trialStartedAt]);

  const isPro = subscription.status === 'active';
  const isInTrial = subscription.status === 'trial';
  const isLocked = subscription.status === 'expired';
  const hasAccess = isPro || isInTrial;

  const daysUntilRenewal = useMemo(() => {
    if (!subscription.expiresAt) return null;
    return daysBetween(new Date(subscription.expiresAt), new Date());
  }, [subscription.expiresAt]);

  const isCancelled = !!subscription.cancelledAt;

  useEffect(() => {
    if (reminderCheckedRef.current) return;
    if (!user?.email || !isInTrial || trialDaysLeft === null) return;
    if (trialDaysLeft !== 2) return;

    reminderCheckedRef.current = true;
    const key = `${REMINDER_KEY_PREFIX}${userId}`;

    const sendIfNeeded = async () => {
      try {
        const sent = await AsyncStorage.getItem(key);
        if (sent === 'true') {
          console.log('SubscriptionProvider: trial reminder already sent');
          return;
        }
        console.log('SubscriptionProvider: sending 2-day trial reminder to', user.email);
        const result = await vanillaClient.trial.sendReminder.mutate({
          email: user.email,
          name: user.name,
          daysLeft: trialDaysLeft,
          autoCharge: subscription.autoChargeOnTrialEnd,
        });
        if (result.success) {
          await AsyncStorage.setItem(key, 'true');
        }
      } catch (err) {
        console.log('SubscriptionProvider: reminder send error', err);
      }
    };
    void sendIfNeeded();
  }, [isInTrial, trialDaysLeft, user?.email, user?.name, userId, subscription.autoChargeOnTrialEnd]);

  const subscribe = useCallback((plan: SubscriptionPlan, source: SubscriptionSource = getPlatformSource()) => {
    const now = new Date();
    const expires = new Date(now);
    if (plan === 'monthly') expires.setMonth(expires.getMonth() + 1);
    else expires.setFullYear(expires.getFullYear() + 1);
    const updated: SubscriptionState = {
      status: 'active',
      plan,
      trialStartedAt: subscription.trialStartedAt,
      subscribedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      cancelledAt: null,
      autoRenew: true,
      autoChargeOnTrialEnd: false,
      pendingPlan: null,
      source,
    };
    setSubscription(updated);
    persist.mutate(updated);
  }, [subscription.trialStartedAt, persist]);

  const enableTrialAutoCharge = useCallback((plan: SubscriptionPlan) => {
    const updated: SubscriptionState = {
      ...subscription,
      autoChargeOnTrialEnd: true,
      pendingPlan: plan,
      source: getPlatformSource(),
    };
    setSubscription(updated);
    persist.mutate(updated);
  }, [subscription, persist]);

  const disableTrialAutoCharge = useCallback(() => {
    const updated: SubscriptionState = {
      ...subscription,
      autoChargeOnTrialEnd: false,
      pendingPlan: null,
    };
    setSubscription(updated);
    persist.mutate(updated);
  }, [subscription, persist]);

  const cancelSubscription = useCallback(() => {
    if (subscription.status !== 'active') return;
    const updated: SubscriptionState = {
      ...subscription,
      cancelledAt: new Date().toISOString(),
      autoRenew: false,
    };
    setSubscription(updated);
    persist.mutate(updated);
  }, [subscription, persist]);

  const setAutoRenew = useCallback((enabled: boolean) => {
    if (subscription.status !== 'active') return;
    const updated: SubscriptionState = {
      ...subscription,
      autoRenew: enabled,
      cancelledAt: enabled ? null : subscription.cancelledAt,
    };
    setSubscription(updated);
    persist.mutate(updated);
  }, [subscription, persist]);

  const restorePurchase = useCallback(async () => {
    if (!storageKey) return false;
    const stored = await AsyncStorage.getItem(storageKey);
    if (!stored) return false;
    const parsed = JSON.parse(stored) as SubscriptionState;
    if (parsed.status === 'active' && parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
      setSubscription(parsed);
      return true;
    }
    return false;
  }, [storageKey]);

  return useMemo(() => ({
    subscription,
    isPro,
    isInTrial,
    isLocked,
    hasAccess,
    isCancelled,
    trialDays: TRIAL_DAYS,
    trialDaysLeft,
    daysUntilRenewal,
    subscribe,
    enableTrialAutoCharge,
    disableTrialAutoCharge,
    cancelSubscription,
    setAutoRenew,
    restorePurchase,
    isLoading: subQuery.isLoading,
  }), [
    subscription, isPro, isInTrial, isLocked, hasAccess, isCancelled,
    trialDaysLeft, daysUntilRenewal,
    subscribe, enableTrialAutoCharge, disableTrialAutoCharge,
    cancelSubscription, setAutoRenew, restorePurchase, subQuery.isLoading,
  ]);
});
