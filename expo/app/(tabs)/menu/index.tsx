// PutHere App - Menu Screen v1.1
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  User, Settings, HelpCircle, Mail, ChevronRight, Shield, Users,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';




interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, sublabel, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        {icon}
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      <ChevronRight color={Colors.textMuted} size={18} />
    </TouchableOpacity>
  );
}

export default function MenuScreen() {

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoRow}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
      </View>


      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.sectionCard}>
          <MenuItem
            icon={<User color={Colors.primary} size={20} />}
            label="My Profile"
            sublabel="View and edit your profile"
            onPress={() => router.push('/menu/profile')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Settings color={Colors.clay} size={20} />}
            label="Settings"
            sublabel="Data, notifications, sharing"
            onPress={() => router.push('/menu/settings')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Users color={Colors.terracotta} size={20} />}
            label="Shared Access"
            sublabel="Invite and manage shared users"
            onPress={() => router.push('/menu/shared-access')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.sectionCard}>
          <MenuItem
            icon={<HelpCircle color={Colors.sage} size={20} />}
            label="FAQs"
            sublabel="Frequently asked questions"
            onPress={() => router.push('/menu/faqs')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Mail color={Colors.amber} size={20} />}
            label="Contact Us"
            sublabel="Get in touch with our team"
            onPress={() => router.push('/menu/contact')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.sectionCard}>
          <MenuItem
            icon={<Shield color={Colors.textSecondary} size={20} />}
            label="Privacy Policy"
            sublabel="How we handle your data"
            onPress={() => router.push('/menu/privacy')}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with care for your stuff</Text>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  logoRow: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 8,
  },
  logo: {
    width: 240,
    height: 80,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconDanger: {
    backgroundColor: Colors.dangerLight,
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  menuLabelDanger: {
    color: Colors.danger,
  },
  menuSublabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginLeft: 68,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

});
