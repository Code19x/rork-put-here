// v1.1
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
  Platform, Share, Linking,
} from 'react-native';
import { router } from 'expo-router';
import {
  Lock, KeyRound, Timer, BellRing, Download,
  Info, Star, Share2, ChevronRight,
  X, Database, Crown, LogOut, ArrowDownCircle, RefreshCw, FileText, Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';
import { useAuth, AutoLockTimeout } from '@/providers/AuthProvider';
import { useStash } from '@/providers/StashProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';



const APP_VERSION = '1.0.0';

const AUTO_LOCK_OPTIONS: { key: AutoLockTimeout; label: string }[] = [
  { key: 'immediately', label: 'Immediately' },
  { key: '1min', label: 'After 1 min' },
  { key: '5min', label: 'After 5 min' },
  { key: 'never', label: 'Never' },
];

export default function SettingsScreen() {
  const {
    user, isAuthenticated, hasPinSet,
    autoLockTimeout, setAutoLockTimeout, removePin,
    signOut,
  } = useAuth();
  const isGuest = !isAuthenticated || !user;
  const { items, categories, locations } = useStash();
  const {
    isPro, isInTrial, trialDaysLeft, trialDays,
    subscription, cancelSubscription,
    setAutoRenew, isCancelled, daysUntilRenewal,
    enableTrialAutoCharge, disableTrialAutoCharge,
  } = useSubscription();

  const [reminderEnabled, setReminderEnabled] = useState(false);

  const handleSetupPin = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/pin-setup');
  }, []);

  const handleChangePin = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/pin-setup');
  }, []);

  const handleRemovePin = useCallback(() => {
    Alert.alert('Remove PIN', 'Your app will no longer lock automatically.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removePin();
          Alert.alert('Done', 'PIN has been removed.');
        },
      },
    ]);
  }, [removePin]);

  const handleAutoLockChange = useCallback(async (timeout: AutoLockTimeout) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    await setAutoLockTimeout(timeout);
  }, [setAutoLockTimeout]);

  const handleToggleReminder = useCallback((val: boolean) => {
    setReminderEnabled(val);
    if (val) {
      Alert.alert('Reminders Enabled', 'You will receive periodic reminders to organize your items.');
    }
  }, []);

  const handleExportData = useCallback(async (format: 'json' | 'csv') => {
    try {
      const data = { items, categories, locations, exportedAt: new Date().toISOString() };
      let content: string;
      let filename: string;

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `puthere-backup-${Date.now()}.json`;
      } else {
        const headers = ['Name', 'Category', 'Location', 'Notes', 'Created At'];
        const rows = items.map(item => {
          const cat = categories.find(c => c.id === item.categoryId);
          const loc = locations.find(l => l.id === item.locationId);
          return [
            `"${item.name}"`,
            `"${cat?.name ?? ''}"`,
            `"${loc?.name ?? ''}"`,
            `"${item.notes?.replace(/"/g, '""') ?? ''}"`,
            `"${item.createdAt}"`,
          ].join(',');
        });
        content = [headers.join(','), ...rows].join('\n');
        filename = `puthere-backup-${Date.now()}.csv`;
      }

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Exported', `Data exported as ${format.toUpperCase()}.`);
      } else {
        await Share.share({
          message: content,
          title: filename,
        });
      }
    } catch (err) {
      console.log('Export error:', err);
      Alert.alert('Error', 'Failed to export data.');
    }
  }, [items, categories, locations]);



  const handleRateApp = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com');
    } else if (Platform.OS === 'android') {
      Linking.openURL('https://play.google.com/store');
    } else {
      Alert.alert('Rate the App', 'Thank you for using PutHere!');
    }
  }, []);

  const handleShareApp = useCallback(async () => {
    try {
      await Share.share({
        message: 'Check out PutHere — a personal stuff tracker app! Download it now.',
        title: 'Share PutHere',
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUBSCRIPTION</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.6}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: isPro ? '#F5A62320' : Colors.surfaceAlt }]}>
                <Crown color={isPro ? '#F5A623' : Colors.textMuted} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>{isPro ? 'PutHere Pro' : isInTrial ? 'Free Trial' : 'No Active Plan'}</Text>
                <Text style={styles.settingDesc}>
                  {isPro
                    ? `${subscription.plan === 'yearly' ? 'Yearly' : 'Monthly'} plan active`
                    : isInTrial
                      ? `${trialDaysLeft ?? 0} of ${trialDays} day${trialDaysLeft === 1 ? '' : 's'} left — Tap to subscribe`
                      : 'Tap to subscribe and restore access'}
                </Text>
              </View>
            </View>
            {isPro ? (
              <View style={styles.proBadgeSettings}>
                <Text style={styles.proBadgeSettingsText}>PRO</Text>
              </View>
            ) : (
              <ChevronRight color={Colors.textMuted} size={18} />
            )}
          </TouchableOpacity>

          {isPro && daysUntilRenewal !== null && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#5B8DB820' }]}>
                    <Clock color={Colors.info} size={18} />
                  </View>
                  <View style={styles.settingTextWrap}>
                    <Text style={styles.settingLabel}>
                      {isCancelled ? 'Expires in' : (subscription.autoRenew ? 'Renews in' : 'Expires in')}
                    </Text>
                    <Text style={styles.settingDesc}>
                      {daysUntilRenewal <= 0
                        ? 'Today'
                        : `${daysUntilRenewal} day${daysUntilRenewal === 1 ? '' : 's'} — ${new Date(subscription.expiresAt!).toLocaleDateString()}`}
                    </Text>
                  </View>
                </View>
                {isCancelled && (
                  <View style={styles.cancelledBadge}>
                    <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                  </View>
                )}
                {subscription.pendingDowngrade && !isCancelled && (
                  <View style={styles.downgradeBadge}>
                    <Text style={styles.downgradeBadgeText}>
                      {subscription.pendingDowngrade === 'free' ? 'TO FREE' : 'DOWNGRADING'}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {isPro && subscription.source === 'stripe' && !isCancelled && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#5B9A5F20' }]}>
                    <RefreshCw color={Colors.success} size={18} />
                  </View>
                  <View style={styles.settingTextWrap}>
                    <Text style={styles.settingLabel}>Auto-Renew</Text>
                    <Text style={styles.settingDesc}>
                      {subscription.autoRenew
                        ? 'Subscription will renew automatically'
                        : 'Subscription will expire at end of period'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={subscription.autoRenew}
                  onValueChange={(val) => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setAutoRenew(val);
                  }}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={subscription.autoRenew ? Colors.primary : Colors.card}
                />
              </View>
            </>
          )}

          {isPro && (subscription.source === 'apple' || subscription.source === 'google') && !isCancelled && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#5B9A5F20' }]}>
                    <RefreshCw color={Colors.success} size={18} />
                  </View>
                  <View style={styles.settingTextWrap}>
                    <Text style={styles.settingLabel}>Auto-Renew</Text>
                    <Text style={styles.settingDesc}>
                      Managed by {subscription.source === 'apple' ? 'Apple App Store' : 'Google Play Store'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.proBadgeSettings, { backgroundColor: '#5B9A5F20' }]}>
                  <Text style={[styles.proBadgeSettingsText, { color: Colors.success }]}>ON</Text>
                </View>
              </View>
            </>
          )}

          {isInTrial && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#5B9A5F20' }]}>
                    <RefreshCw color={Colors.success} size={18} />
                  </View>
                  <View style={styles.settingTextWrap}>
                    <Text style={styles.settingLabel}>Auto-charge at trial end</Text>
                    <Text style={styles.settingDesc}>
                      {subscription.autoChargeOnTrialEnd && subscription.pendingPlan
                        ? `Will be charged for ${subscription.pendingPlan} plan`
                        : 'Off — your account will lock if not subscribed'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={subscription.autoChargeOnTrialEnd}
                  onValueChange={(val) => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    if (val) enableTrialAutoCharge(subscription.pendingPlan ?? 'monthly');
                    else disableTrialAutoCharge();
                  }}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={subscription.autoChargeOnTrialEnd ? Colors.primary : Colors.card}
                />
              </View>
            </>
          )}

          {isPro && !isCancelled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  Alert.alert(
                    'Cancel Subscription',
                    `Your Pro features will remain active until ${subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'the end of your billing period'}.\n\nAfter that, your account will be locked until you subscribe again.\n\nNo refunds or partial refunds are provided for the remaining subscription period.`,
                    [
                      { text: 'Keep Plan', style: 'cancel' },
                      {
                        text: 'Cancel Plan',
                        style: 'destructive',
                        onPress: () => {
                          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          cancelSubscription();
                          Alert.alert(
                            'Subscription Cancelled',
                            `Your Pro access remains active until ${subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'the end of your billing period'}.`
                          );
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.6}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: '#C94A3A18' }]}>
                    <X color={Colors.danger} size={18} />
                  </View>
                  <View style={styles.settingTextWrap}>
                    <Text style={[styles.settingLabel, { color: Colors.danger }]}>Cancel Subscription</Text>
                    <Text style={styles.settingDesc}>Active until end of billing period</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/refund-policy')}
            activeOpacity={0.6}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.surfaceAlt }]}>
                <FileText color={Colors.textMuted} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Refund & Cancellation Policy</Text>
                <Text style={styles.settingDesc}>View our subscription policies</Text>
              </View>
            </View>
            <ChevronRight color={Colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.sectionCard}>
          {hasPinSet ? (
            <>
              <TouchableOpacity style={styles.settingRow} onPress={handleChangePin} activeOpacity={0.6}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight + '20' }]}>
                    <KeyRound color={Colors.primary} size={18} />
                  </View>
                  <View style={styles.settingTextWrap}>
                    <Text style={styles.settingLabel}>Change PIN</Text>
                    <Text style={styles.settingDesc}>Update your 4-digit PIN</Text>
                  </View>
                </View>
                <ChevronRight color={Colors.textMuted} size={18} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.settingRow} onPress={handleRemovePin} activeOpacity={0.6}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: Colors.dangerLight }]}>
                    <Lock color={Colors.danger} size={18} />
                  </View>
                  <View style={styles.settingTextWrap}>
                    <Text style={[styles.settingLabel, { color: Colors.danger }]}>Remove PIN</Text>
                    <Text style={styles.settingDesc}>Disable PIN lock</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.settingRow} onPress={handleSetupPin} activeOpacity={0.6}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.successLight + '50' }]}>
                  <Lock color={Colors.success} size={18} />
                </View>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Set Up PIN</Text>
                  <Text style={styles.settingDesc}>Create a 4-digit PIN to lock your app</Text>
                </View>
              </View>
              <ChevronRight color={Colors.textMuted} size={18} />
            </TouchableOpacity>
          )}

        </View>
      </View>

      {hasPinSet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AUTO-LOCK</Text>
          <View style={styles.sectionCard}>
            {AUTO_LOCK_OPTIONS.map((option, idx) => (
              <React.Fragment key={option.key}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => handleAutoLockChange(option.key)}
                  activeOpacity={0.6}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: Colors.amberLight + '40' }]}>
                      <Timer color={Colors.amber} size={18} />
                    </View>
                    <Text style={styles.settingLabel}>{option.label}</Text>
                  </View>
                  <View style={[
                    styles.radioOuter,
                    autoLockTimeout === option.key && styles.radioOuterActive,
                  ]}>
                    {autoLockTimeout === option.key && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS & REMINDERS</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.amberLight + '40' }]}>
                <BellRing color={Colors.amber} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Reminder Notifications</Text>
                <Text style={styles.settingDesc}>Periodic reminders to update items</Text>
              </View>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={reminderEnabled ? Colors.primary : Colors.card}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA & STORAGE</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight + '20' }]}>
                <Database color={Colors.primary} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Storage</Text>
                <Text style={styles.settingDesc}>{items.length} items stored locally</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              Alert.alert('Export Format', 'Choose export format', [
                { text: 'JSON', onPress: () => handleExportData('json') },
                { text: 'CSV', onPress: () => handleExportData('csv') },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            activeOpacity={0.6}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.sageLight + '40' }]}>
                <Download color={Colors.sage} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Export Data</Text>
                <Text style={styles.settingDesc}>Backup as CSV or JSON</Text>
              </View>
            </View>
            <ChevronRight color={Colors.textMuted} size={18} />
          </TouchableOpacity>

        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight + '20' }]}>
                <Info color={Colors.primary} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>App Version</Text>
                <Text style={styles.settingDesc}>v{APP_VERSION}</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={handleRateApp} activeOpacity={0.6}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.amberLight + '40' }]}>
                <Star color={Colors.amber} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Rate the App</Text>
                <Text style={styles.settingDesc}>Leave a review on the App Store</Text>
              </View>
            </View>
            <ChevronRight color={Colors.textMuted} size={18} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={handleShareApp} activeOpacity={0.6}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.sageLight + '40' }]}>
                <Share2 color={Colors.sage} size={18} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Share the App</Text>
                <Text style={styles.settingDesc}>Share a download link with friends</Text>
              </View>
            </View>
            <ChevronRight color={Colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {!isGuest && (
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Alert.alert(
                  'Log Out',
                  'Are you sure you want to log out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Log Out',
                      style: 'destructive',
                      onPress: async () => {
                        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        try {
                          console.log('Settings: signing out...');
                          await signOut();
                          console.log('Settings: signOut completed, auth guard will redirect');
                        } catch (err) {
                          console.log('Settings logout error:', err);
                          Alert.alert('Error', 'Failed to log out. Please try again.');
                        }
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.6}
              testID="settings-logout-btn"
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#D32F2F' }]}>
                  <LogOut color="#FFFFFF" size={18} />
                </View>
                <View style={styles.settingTextWrap}>
                  <Text style={[styles.settingLabel, { color: '#D32F2F' }]}>Log Out</Text>
                  <Text style={styles.settingDesc}>Sign out of your account</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginLeft: 66,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  sharedUserRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingLeft: 66,
  },
  sharedUserInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  sharedUserEmail: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: Colors.amberLight + '50',
  },
  statusAccepted: {
    backgroundColor: Colors.successLight + '50',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  statusTextPending: {
    color: Colors.amber,
  },
  statusTextAccepted: {
    color: Colors.success,
  },
  removeSharedBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight + '40',
  },
  inviteInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  inviteInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inviteSendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inviteSendText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  inviteCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
  proBadgeSettings: {
    backgroundColor: '#F5A623' + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadgeSettingsText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#F5A623',
  },
  cancelledBadge: {
    backgroundColor: '#C94A3A18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cancelledBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.danger,
  },
  downgradeBadge: {
    backgroundColor: '#D4A04820',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  downgradeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.amber,
  },
});
