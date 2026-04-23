import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '@/constants/colors';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function RefundPolicyScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.lastUpdated}>Last updated: April 14, 2026</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.intro}>
          This Refund & Cancellation Policy outlines the terms that apply when you subscribe to PutHere Pro. By subscribing, you agree to the following terms.
        </Text>

        <Section title="1. Subscription Plans">
          <Text style={styles.body}>
            PutHere offers two subscription tiers:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• <Text style={styles.bold}>Monthly Plan</Text> — $1.99 per month</Text>
            <Text style={styles.bulletItem}>• <Text style={styles.bold}>Yearly Plan</Text> — $19.99 per year (save 17%)</Text>
          </View>
          <Text style={styles.body}>
            Both plans provide unlimited item storage, priority support, and early access to new features.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="2. No Refund Policy">
          <Text style={styles.body}>
            All subscription payments are <Text style={styles.bold}>non-refundable</Text>. We do not accept requests for full or partial refunds under any circumstances, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Unused portion of a subscription period</Text>
            <Text style={styles.bulletItem}>• Change of mind after purchase</Text>
            <Text style={styles.bulletItem}>• Downgrading from a yearly to monthly plan</Text>
            <Text style={styles.bulletItem}>• Early cancellation of an active subscription</Text>
            <Text style={styles.bulletItem}>• Accidental purchases or duplicate subscriptions</Text>
          </View>
          <Text style={styles.bodyHighlight}>
            By subscribing, you acknowledge that no refund or partial refund will be issued for any remaining time on your subscription.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="3. Cancellation Policy">
          <Text style={styles.body}>
            You may cancel your subscription at any time through the app's Settings page. When you cancel:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Your cancellation takes effect at the <Text style={styles.bold}>end of the current billing period</Text></Text>
            <Text style={styles.bulletItem}>• You will retain full Pro access until your subscription expires</Text>
            <Text style={styles.bulletItem}>• After expiry, your account will revert to the free plan</Text>
            <Text style={styles.bulletItem}>• No refund is provided for the remaining subscription time</Text>
          </View>
          <Text style={styles.body}>
            For example, if you cancel a yearly plan 3 months in, you will continue to have Pro access for the remaining 9 months, but no refund will be issued for those months.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="4. Downgrading">
          <Text style={styles.body}>
            If you are on a yearly plan, you may request a downgrade to the monthly plan. The downgrade will take effect at the <Text style={styles.bold}>end of your current yearly billing period</Text>. No refund or prorated credit is provided for the remaining yearly period.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="5. Auto-Renewal">
          <Text style={styles.body}>
            <Text style={styles.bold}>Apple App Store & Google Play Store:</Text> Subscriptions purchased through these platforms auto-renew by default. To disable auto-renewal, manage your subscription through your device's app store settings at least 24 hours before the end of the current period.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Stripe (Web):</Text> If you subscribed via Stripe, you can toggle auto-renewal on or off from the app's Settings page. If auto-renewal is disabled, your subscription will expire at the end of the current billing period.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="6. Renewal Reminders">
          <Text style={styles.body}>
            PutHere will send you reminders about upcoming subscription renewals:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• <Text style={styles.bold}>5 days before renewal</Text> — A notification about your upcoming renewal date</Text>
            <Text style={styles.bulletItem}>• <Text style={styles.bold}>1 day before renewal</Text> — A final reminder before your subscription renews or expires</Text>
          </View>
          <Text style={styles.body}>
            These reminders are provided as a courtesy. It is your responsibility to manage your subscription before the renewal date.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="7. Exceptions">
          <Text style={styles.body}>
            If your subscription was purchased through the Apple App Store or Google Play Store, refund requests must be directed to Apple or Google respectively, as they handle all payment processing for in-app purchases. PutHere has no control over refunds processed by these platforms.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="8. Contact Us">
          <Text style={styles.body}>
            If you have questions about this policy or need assistance with your subscription, please contact us through the Contact Us page in the app menu. Note that contacting support does not guarantee a refund, as our no-refund policy applies in all cases.
          </Text>
        </Section>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>PutHere • Version 1.0.0</Text>
      </View>
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
  header: {
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  bodyHighlight: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.danger,
    fontWeight: '600' as const,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#C94A3A08',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    overflow: 'hidden',
  },
  bold: {
    fontWeight: '600' as const,
    color: Colors.text,
  },
  bulletList: {
    marginTop: 4,
    marginLeft: 4,
    gap: 4,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 4,
  },
  footer: {
    alignItems: 'center' as const,
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
