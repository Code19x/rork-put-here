import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  Animated, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Shield, Eye, Pencil, Plus, Trash2, User, Grid3X3,
  ChevronDown, ChevronUp, X, Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { SharedUserPermissions, DEFAULT_PERMISSIONS } from '@/providers/AuthProvider';

interface PermissionPickerProps {
  visible: boolean;
  permissions: SharedUserPermissions;
  onSave: (permissions: SharedUserPermissions) => void;
  onCancel: () => void;
  title?: string;
  categories?: { id: string; name: string }[];
}

interface PermissionToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  color: string;
}

function PermissionToggle({ icon, label, description, value, onToggle, color }: PermissionToggleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
    onToggle(!value);
  }, [value, onToggle, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.toggleRow, value && styles.toggleRowActive]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.toggleIcon, { backgroundColor: value ? color + '20' : Colors.surfaceAlt }]}>
          {icon}
        </View>
        <View style={styles.toggleContent}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDesc}>{description}</Text>
        </View>
        <View style={[styles.checkbox, value && { backgroundColor: color, borderColor: color }]}>
          {value && <Check color="#FFF" size={14} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const PRESET_LEVELS = [
  {
    id: 'view_only',
    label: 'View Only',
    description: 'Can only see your items',
    color: Colors.sage,
    permissions: {
      canViewProfile: false,
      canViewItems: true,
      canEditItems: false,
      canAddItems: false,
      canDeleteItems: false,
      allowAllCategories: true,
      allowedCategories: [] as string[],
    },
  },
  {
    id: 'contributor',
    label: 'Contributor',
    description: 'Can view and add new items',
    color: Colors.amber,
    permissions: {
      canViewProfile: false,
      canViewItems: true,
      canEditItems: false,
      canAddItems: true,
      canDeleteItems: false,
      allowAllCategories: true,
      allowedCategories: [] as string[],
    },
  },
  {
    id: 'editor',
    label: 'Editor',
    description: 'Can view, add, and edit items',
    color: Colors.primary,
    permissions: {
      canViewProfile: true,
      canViewItems: true,
      canEditItems: true,
      canAddItems: true,
      canDeleteItems: false,
      allowAllCategories: true,
      allowedCategories: [] as string[],
    },
  },
  {
    id: 'full_access',
    label: 'Full Access',
    description: 'Complete access to all items and actions',
    color: Colors.terracotta,
    permissions: {
      canViewProfile: true,
      canViewItems: true,
      canEditItems: true,
      canAddItems: true,
      canDeleteItems: true,
      allowAllCategories: true,
      allowedCategories: [] as string[],
    },
  },
] as const;

export default function PermissionPicker({
  visible,
  permissions,
  onSave,
  onCancel,
  title = 'Set Permissions',
  categories = [],
}: PermissionPickerProps) {
  const [localPerms, setLocalPerms] = useState<SharedUserPermissions>({ ...permissions });
  const [showCustom, setShowCustom] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocalPerms({ ...permissions });
      setShowCustom(false);
      Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible, permissions, slideAnim]);

  const getActivePreset = useCallback(() => {
    for (const preset of PRESET_LEVELS) {
      const p = preset.permissions;
      if (
        localPerms.canViewProfile === p.canViewProfile &&
        localPerms.canViewItems === p.canViewItems &&
        localPerms.canEditItems === p.canEditItems &&
        localPerms.canAddItems === p.canAddItems &&
        localPerms.canDeleteItems === p.canDeleteItems
      ) {
        return preset.id;
      }
    }
    return null;
  }, [localPerms]);

  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = PRESET_LEVELS.find(p => p.id === presetId);
    if (!preset) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalPerms(prev => ({
      ...prev,
      ...preset.permissions,
      allowAllCategories: prev.allowAllCategories,
      allowedCategories: prev.allowedCategories,
    }));
  }, []);

  const handleToggle = useCallback((key: keyof SharedUserPermissions, value: boolean) => {
    setLocalPerms(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCategoryToggle = useCallback((catId: string) => {
    setLocalPerms(prev => {
      const current = prev.allowedCategories;
      const updated = current.includes(catId)
        ? current.filter(c => c !== catId)
        : [...current, catId];
      return { ...prev, allowedCategories: updated };
    });
  }, []);

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(localPerms);
  }, [localPerms, onSave]);

  const activePreset = getActivePreset();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn} activeOpacity={0.7}>
            <X color={Colors.textMuted} size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerSaveBtn} activeOpacity={0.7}>
            <Text style={styles.headerSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield color={Colors.primary} size={18} />
              <Text style={styles.sectionTitle}>Access Level</Text>
            </View>
            <Text style={styles.sectionDesc}>Choose a preset or customize individual permissions below.</Text>

            <View style={styles.presetsGrid}>
              {PRESET_LEVELS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    activePreset === preset.id && { borderColor: preset.color, backgroundColor: preset.color + '08' },
                  ]}
                  onPress={() => handlePresetSelect(preset.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.presetDot, { backgroundColor: preset.color }]} />
                  <Text style={[
                    styles.presetLabel,
                    activePreset === preset.id && { color: preset.color, fontWeight: '700' as const },
                  ]}>
                    {preset.label}
                  </Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>
                  {activePreset === preset.id && (
                    <View style={[styles.presetCheck, { backgroundColor: preset.color }]}>
                      <Check color="#FFF" size={12} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.customToggle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCustom(!showCustom);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.customToggleText}>Customize Permissions</Text>
            {showCustom ? <ChevronUp color={Colors.textMuted} size={18} /> : <ChevronDown color={Colors.textMuted} size={18} />}
          </TouchableOpacity>

          {showCustom && (
            <View style={styles.section}>
              <PermissionToggle
                icon={<User color={localPerms.canViewProfile ? Colors.primary : Colors.textMuted} size={18} />}
                label="View Profile & Personal Info"
                description="See profile photo, name, and account details"
                value={localPerms.canViewProfile}
                onToggle={(v) => handleToggle('canViewProfile', v)}
                color={Colors.primary}
              />
              <PermissionToggle
                icon={<Eye color={localPerms.canViewItems ? Colors.sage : Colors.textMuted} size={18} />}
                label="View Items"
                description="See all items and their details"
                value={localPerms.canViewItems}
                onToggle={(v) => handleToggle('canViewItems', v)}
                color={Colors.sage}
              />
              <PermissionToggle
                icon={<Pencil color={localPerms.canEditItems ? Colors.amber : Colors.textMuted} size={18} />}
                label="Edit Items"
                description="Modify existing item details"
                value={localPerms.canEditItems}
                onToggle={(v) => handleToggle('canEditItems', v)}
                color={Colors.amber}
              />
              <PermissionToggle
                icon={<Plus color={localPerms.canAddItems ? Colors.success : Colors.textMuted} size={18} />}
                label="Add Items"
                description="Create new items in the collection"
                value={localPerms.canAddItems}
                onToggle={(v) => handleToggle('canAddItems', v)}
                color={Colors.success}
              />
              <PermissionToggle
                icon={<Trash2 color={localPerms.canDeleteItems ? Colors.danger : Colors.textMuted} size={18} />}
                label="Delete Items"
                description="Permanently remove items"
                value={localPerms.canDeleteItems}
                onToggle={(v) => handleToggle('canDeleteItems', v)}
                color={Colors.danger}
              />
            </View>
          )}

          {showCustom && categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Grid3X3 color={Colors.primary} size={18} />
                <Text style={styles.sectionTitle}>Category Access</Text>
              </View>

              <PermissionToggle
                icon={<Grid3X3 color={localPerms.allowAllCategories ? Colors.primary : Colors.textMuted} size={18} />}
                label="All Categories"
                description="Access items across every category"
                value={localPerms.allowAllCategories}
                onToggle={(v) => handleToggle('allowAllCategories', v)}
                color={Colors.primary}
              />

              {!localPerms.allowAllCategories && (
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => {
                    const isSelected = localPerms.allowedCategories.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                        onPress={() => handleCategoryToggle(cat.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.surface,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSaveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerSaveText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 20,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  presetsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  presetCard: {
    width: '47%' as unknown as number,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    position: 'relative' as const,
  },
  presetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  presetDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  presetCheck: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  customToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  customToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  toggleRowActive: {
    borderColor: Colors.primary + '40',
  },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  toggleDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
  },
  categoryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 8,
    paddingLeft: 4,
  },
  categoryChip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary + '50',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  bottomSpacer: {
    height: 40,
  },
});
