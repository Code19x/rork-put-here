// PutHere App - Privacy Policy v1.1
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

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.lastUpdated}>Last updated: March 10, 2026</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.intro}>
          Your privacy matters to us. This Privacy Policy explains how PutHere collects, uses, and protects your information when you use our app.
        </Text>

        <Section title="1. Information We Collect">
          <Text style={styles.body}>
            <Text style={styles.bold}>Account Information: </Text>
            When you sign up, we collect your name and email address to create and manage your account.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>Item Data: </Text>
            Information you add about your stashed items, including names, descriptions, categories, locations, notes, and photos. This data is stored locally on your device.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>App Settings: </Text>
            Your preferences such as notification settings, PIN lock configuration, and display options are stored locally on your device.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="2. How We Use Your Information">
          <Text style={styles.body}>We use the information we collect to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Provide and maintain the app's functionality</Text>
            <Text style={styles.bulletItem}>• Authenticate your identity and secure your account</Text>
            <Text style={styles.bulletItem}>• Store and organize your personal item inventory</Text>
            <Text style={styles.bulletItem}>• Improve our services and user experience</Text>
          </View>
        </Section>

        <View style={styles.divider} />

        <Section title="3. Data Storage & Security">
          <Text style={styles.body}>
            Your item data, photos, and preferences are stored locally on your device. We use industry-standard security measures including encryption and secure authentication to protect your information.
          </Text>
          <Text style={styles.body}>
            If you set up a PIN lock, your PIN is stored securely on your device and is never transmitted to our servers.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="4. Data Sharing">
          <Text style={styles.body}>
            We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• With your explicit consent</Text>
            <Text style={styles.bulletItem}>• To comply with legal obligations or valid legal processes</Text>
            <Text style={styles.bulletItem}>• To protect our rights, privacy, safety, or property</Text>
          </View>
        </Section>

        <View style={styles.divider} />

        <Section title="5. Your Rights">
          <Text style={styles.body}>You have the right to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Access, update, or delete your personal information</Text>
            <Text style={styles.bulletItem}>• Clear all locally stored data through app settings</Text>
            <Text style={styles.bulletItem}>• Delete your account at any time</Text>
            <Text style={styles.bulletItem}>• Opt out of notifications</Text>
          </View>
        </Section>

        <View style={styles.divider} />

        <Section title="6. Changes to This Policy">
          <Text style={styles.body}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy within the app. Continued use of the app after changes constitutes acceptance of the updated policy.
          </Text>
        </Section>

        <View style={styles.divider} />

        <Section title="7. Contact Us">
          <Text style={styles.body}>
            If you have any questions or concerns about this Privacy Policy, please reach out to us through the Contact Us page in the app menu.
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
