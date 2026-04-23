import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Users, UserPlus, ChevronRight, X, Shield, Settings } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth, SharedUserPermissions, DEFAULT_PERMISSIONS } from '@/providers/AuthProvider';
import { trpc } from '@/lib/trpc';
import PermissionPicker from '@/components/PermissionPicker';

function getPermissionSummary(perms: SharedUserPermissions | undefined): string {
  if (!perms) return 'View Only';
  const { canViewProfile, canViewItems, canEditItems, canAddItems, canDeleteItems } = perms;
  if (canDeleteItems && canEditItems && canAddItems && canViewItems && canViewProfile) return 'Full Access';
  if (canEditItems && canAddItems && canViewItems && canViewProfile) return 'Editor';
  if (canViewItems && canAddItems && !canEditItems && !canDeleteItems) return 'Contributor';
  if (canViewItems && !canEditItems && !canAddItems && !canDeleteItems) return 'View Only';
  return 'Custom';
}

function getPermissionColor(label: string): string {
  switch (label) {
    case 'Full Access': return Colors.terracotta;
    case 'Editor': return Colors.primary;
    case 'Contributor': return Colors.amber;
    case 'View Only': return Colors.sage;
    default: return Colors.textSecondary;
  }
}

export default function SharedAccessScreen() {
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showPermissionPicker, setShowPermissionPicker] = useState(false);
  const [pendingInviteEmail, setPendingInviteEmail] = useState('');
  const [pendingPermissions, setPendingPermissions] = useState<SharedUserPermissions>({ ...DEFAULT_PERMISSIONS });
  const [editingPermissionsFor, setEditingPermissionsFor] = useState<string | null>(null);
  const { user, sharedUsers, inviteUser, removeSharedUser, updateSharedUserPermissions } = useAuth();
  const sendInvitationMutation = trpc.invite.sendInvitation.useMutation();

  const handleProceedToPermissions = useCallback(() => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (user && email === user.email.toLowerCase()) {
      Alert.alert('Error', 'You cannot invite yourself.');
      return;
    }
    const existing = sharedUsers.find(u => u.email.toLowerCase() === email);
    if (existing) {
      Alert.alert('Error', 'This user is already invited.');
      return;
    }
    setPendingInviteEmail(email);
    setPendingPermissions({ ...DEFAULT_PERMISSIONS });
    setEditingPermissionsFor(null);
    setShowPermissionPicker(true);
  }, [inviteEmail, user, sharedUsers]);

  const handleSaveInvitePermissions = useCallback(async (permissions: SharedUserPermissions) => {
    setShowPermissionPicker(false);

    if (editingPermissionsFor) {
      await updateSharedUserPermissions(editingPermissionsFor, permissions);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingPermissionsFor(null);
      return;
    }

    const result = await inviteUser(pendingInviteEmail, permissions);
    if (!result.success) {
      Alert.alert('Error', result.error ?? 'Failed to invite user.');
      return;
    }
    try {
      await sendInvitationMutation.mutateAsync({
        inviterName: user?.name ?? 'A PutHere user',
        inviterEmail: user?.email ?? '',
        inviteeEmail: pendingInviteEmail,
      });
      console.log('Invitation email sent to:', pendingInviteEmail);
    } catch (err) {
      console.log('Failed to send invitation email:', err);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Invited!', `An invitation has been sent to ${pendingInviteEmail}.`);
    setInviteEmail('');
    setShowInviteInput(false);
    setPendingInviteEmail('');
  }, [editingPermissionsFor, pendingInviteEmail, inviteUser, updateSharedUserPermissions, sendInvitationMutation, user]);

  const handleCancelPermissions = useCallback(() => {
    setShowPermissionPicker(false);
    setEditingPermissionsFor(null);
  }, []);

  const handleEditPermissions = useCallback((email: string) => {
    const su = sharedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!su) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingPermissionsFor(email);
    setPendingPermissions(su.permissions ?? { ...DEFAULT_PERMISSIONS });
    setShowPermissionPicker(true);
  }, [sharedUsers]);

  const handleRemoveSharedUser = useCallback(async (email: string) => {
    Alert.alert('Remove User', `Remove ${email} from shared access?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeSharedUser(email);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  }, [removeSharedUser]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={[styles.headerIcon, { backgroundColor: Colors.primaryLight + '20' }]}>
              <Users color={Colors.primary} size={28} />
            </View>
            <Text style={styles.headerTitle}>Shared Access</Text>
            <Text style={styles.headerSubtitle}>
              Invite others to view or manage your items. Control what each person can see and do.
            </Text>
          </View>

          <View style={styles.sharedAccessCard}>
            <View style={styles.sharedHeaderRow}>
              <View style={styles.sharedHeaderText}>
                <Text style={styles.sharedTitle}>Shared Users</Text>
                <Text style={styles.sharedSubtitle}>
                  {sharedUsers.length === 0 ? 'No users have shared access' : `${sharedUsers.length} user${sharedUsers.length > 1 ? 's' : ''} with access`}
                </Text>
              </View>
            </View>

            {sharedUsers.map((su) => {
              const permLabel = getPermissionSummary(su.permissions);
              const permColor = getPermissionColor(permLabel);
              return (
                <View key={su.email} style={styles.sharedUserCard}>
                  <View style={styles.sharedUserTopRow}>
                    <View style={styles.sharedUserInfo}>
                      <Text style={styles.sharedUserEmail} numberOfLines={1}>{su.email}</Text>
                      <View style={[styles.statusBadge, su.status === 'accepted' ? styles.statusAccepted : styles.statusPending]}>
                        <Text style={[styles.statusText, su.status === 'accepted' ? styles.statusTextAccepted : styles.statusTextPending]}>
                          {su.status}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveSharedUser(su.email)}
                      style={styles.removeSharedBtn}
                      activeOpacity={0.6}
                    >
                      <X color={Colors.danger} size={14} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.permissionRow}
                    onPress={() => handleEditPermissions(su.email)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.permissionDot, { backgroundColor: permColor }]} />
                    <Shield color={permColor} size={14} />
                    <Text style={[styles.permissionLabel, { color: permColor }]}>{permLabel}</Text>
                    <Settings color={Colors.textMuted} size={14} />
                  </TouchableOpacity>
                </View>
              );
            })}

            {showInviteInput ? (
              <View style={styles.inviteInputRow}>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="Enter email address"
                  placeholderTextColor={Colors.textMuted}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={handleProceedToPermissions}
                  testID="invite-email-input"
                />
                <TouchableOpacity style={styles.inviteSendBtn} onPress={handleProceedToPermissions} activeOpacity={0.7}>
                  <Text style={styles.inviteSendText}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowInviteInput(false); setInviteEmail(''); }} style={styles.inviteCancelBtn}>
                  <X color={Colors.textMuted} size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.inviteRow}
                onPress={() => setShowInviteInput(true)}
                activeOpacity={0.6}
              >
                <View style={[styles.sharedIcon, { backgroundColor: Colors.successLight + '50' }]}>
                  <UserPlus color={Colors.success} size={18} />
                </View>
                <Text style={styles.inviteLabel}>Invite User</Text>
                <ChevronRight color={Colors.textMuted} size={18} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <PermissionPicker
        visible={showPermissionPicker}
        permissions={editingPermissionsFor
          ? (sharedUsers.find(u => u.email === editingPermissionsFor)?.permissions ?? { ...DEFAULT_PERMISSIONS })
          : pendingPermissions
        }
        onSave={handleSaveInvitePermissions}
        onCancel={handleCancelPermissions}
        title={editingPermissionsFor ? 'Edit Permissions' : 'Set Permissions'}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  headerSection: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  sharedAccessCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sharedHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sharedHeaderText: {
    flex: 1,
  },
  sharedTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  sharedSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  sharedUserCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sharedUserTopRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dangerLight + '40',
  },
  permissionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  permissionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  permissionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  inviteInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  inviteRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  sharedIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  inviteLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
