// v1.1
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, Platform, Animated, ScrollView, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Camera, ImageIcon, Pencil, Check, X, Trash2, LogOut, Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth, SharedUserPermissions } from '@/providers/AuthProvider';
import { useStash } from '@/providers/StashProvider';

const getProfileStorageKey = (userId: string) => `stash_user_profile_${userId}`;

interface ProfileData {
  name: string;
  avatarUri: string | null;
}

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

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData>({ name: '', avatarUri: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const avatarScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user, isAuthenticated, isLoading: authLoading, signOut, changePassword, deleteAccount } = useAuth();
  const { clearAllData } = useStash();
  const isGuest = !authLoading && !isAuthenticated;

  useEffect(() => {
    void loadProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      if (!user?.id) return;
      const stored = await AsyncStorage.getItem(getProfileStorageKey(user.id));
      if (stored) {
        const parsed = JSON.parse(stored) as ProfileData;
        const fallbackName = parsed.name || user.name || '';
        const merged: ProfileData = { name: fallbackName, avatarUri: parsed.avatarUri };
        setProfile(merged);
        setEditName(fallbackName);
        if (!parsed.name && user.name) {
          await AsyncStorage.setItem(getProfileStorageKey(user.id), JSON.stringify(merged));
        }
        console.log('Profile loaded for user:', user.id, fallbackName);
      } else {
        const seeded: ProfileData = { name: user.name ?? '', avatarUri: user.avatarUrl ?? null };
        setProfile(seeded);
        setEditName(seeded.name);
        if (seeded.name || seeded.avatarUri) {
          await AsyncStorage.setItem(getProfileStorageKey(user.id), JSON.stringify(seeded));
        }
        console.log('Profile seeded from auth for user:', user.id, seeded.name);
      }
    } catch (e) {
      console.log('Error loading profile:', e);
    }
  }, [user?.id, user?.name, user?.avatarUrl]);

  const saveProfile = useCallback(async (updated: ProfileData) => {
    try {
      if (!user?.id) return;
      await AsyncStorage.setItem(getProfileStorageKey(user.id), JSON.stringify(updated));
      setProfile(updated);
      console.log('Profile saved for user:', user.id, updated.name);
    } catch (e) {
      console.log('Error saving profile:', e);
    }
  }, [user?.id]);

  const animateAvatar = useCallback(() => {
    Animated.sequence([
      Animated.timing(avatarScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(avatarScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [avatarScale]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        animateAvatar();
        const updated = { ...profile, avatarUri: result.assets[0].uri };
        saveProfile(updated);
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Could not open photo library.');
    }
  }, [profile, saveProfile, animateAvatar]);

  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        animateAvatar();
        const updated = { ...profile, avatarUri: result.assets[0].uri };
        saveProfile(updated);
      }
    } catch (error) {
      console.log('Camera error:', error);
      Alert.alert('Error', 'Could not open camera.');
    }
  }, [profile, saveProfile, animateAvatar]);

  const showPhotoOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }
    Alert.alert('Profile Photo', 'Choose how to set your profile picture', [
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Take Photo', onPress: takePhoto },
      ...(profile.avatarUri
        ? [{
            text: 'Remove Photo',
            style: 'destructive' as const,
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              animateAvatar();
              saveProfile({ ...profile, avatarUri: null });
            },
          }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [pickImage, takePhoto, profile, saveProfile, animateAvatar]);

  const handleSaveName = useCallback(() => {
    const trimmed = editName.trim();
    saveProfile({ ...profile, name: trimmed });
    setIsEditing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [editName, profile, saveProfile]);

  const handleCancelEdit = useCallback(() => {
    setEditName(profile.name);
    setIsEditing(false);
  }, [profile.name]);

  const startEditing = useCallback(() => {
    setEditName(profile.name);
    setIsEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [profile.name]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              console.log('Profile: signing out...');
              await signOut();
              console.log('Profile: signOut completed, auth guard will redirect');
            } catch (err) {
              console.log('Logout error:', err);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently remove your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await clearAllData();
                    const result = await deleteAccount();
                    if (result.success) {
                      console.log('Account deleted');
                    } else {
                      Alert.alert('Error', result.error ?? 'Failed to delete account.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [deleteAccount, clearAllData]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError('');
    setPasswordSuccess(false);
    if (!currentPassword) { setPasswordError('Enter your current password.'); return; }
    if (!newPassword) { setPasswordError('Enter a new password.'); return; }
    if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError('Passwords do not match.'); return; }
    setChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        setPasswordError(result.error ?? 'Failed to change password.');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordSuccess(false);
        }, 2000);
      }
    } catch {
      setPasswordError('Something went wrong.');
    } finally {
      setChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmNewPassword, changePassword]);

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
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={showPhotoOptions}
              activeOpacity={0.8}
              testID="avatar-button"
            >
              <Animated.View style={[styles.avatarOuter, { transform: [{ scale: avatarScale }] }]}>
                {profile.avatarUri ? (
                  <Image
                    source={{ uri: profile.avatarUri }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User color={Colors.primary} size={52} />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Camera color={Colors.textInverse} size={14} />
                </View>
              </Animated.View>
            </TouchableOpacity>

            <Text style={styles.tapHint}>
              Tap to {profile.avatarUri ? 'change' : 'add'} photo
            </Text>
          </View>

          {!isGuest && (
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>Account Email</Text>
              <View style={styles.emailRow}>
                <Mail color={Colors.primary} size={16} />
                <Text style={styles.emailText}>{user?.email ?? 'No email'}</Text>
              </View>
            </View>
          )}

          {!isGuest && (
          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Display Name</Text>
            {isEditing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                  maxLength={40}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  testID="name-input"
                />
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleSaveName}
                  testID="save-name-button"
                >
                  <Check color={Colors.success} size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleCancelEdit}
                  testID="cancel-name-button"
                >
                  <X color={Colors.danger} size={20} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nameRow}
                onPress={startEditing}
                activeOpacity={0.7}
                testID="edit-name-button"
              >
                <Text style={[styles.nameText, !profile.name && styles.namePlaceholder]}>
                  {profile.name || 'Tap to set your name'}
                </Text>
                <Pencil color={Colors.textMuted} size={16} />
              </TouchableOpacity>
            )}
          </View>
          )}

          {!isGuest && (
          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Security</Text>
            {!showChangePassword ? (
              <TouchableOpacity
                style={styles.changePasswordRow}
                onPress={() => {
                  setShowChangePassword(true);
                  setPasswordError('');
                  setPasswordSuccess(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sharedIcon, { backgroundColor: Colors.amber + '20' }]}>
                  <Lock color={Colors.amber} size={18} />
                </View>
                <Text style={styles.changePasswordLabel}>Change Password</Text>
                <ChevronRight color={Colors.textMuted} size={18} />
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <View style={styles.pwInputRow}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="Current password"
                    placeholderTextColor={Colors.textMuted}
                    value={currentPassword}
                    onChangeText={(t) => { setCurrentPassword(t); setPasswordError(''); }}
                    secureTextEntry={!showCurrentPw}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPw(p => !p)} style={styles.pwEyeBtn}>
                    {showCurrentPw ? <EyeOff color={Colors.textMuted} size={16} /> : <Eye color={Colors.textMuted} size={16} />}
                  </TouchableOpacity>
                </View>
                <View style={styles.pwInputRow}>
                  <TextInput
                    style={styles.pwInput}
                    placeholder="New password"
                    placeholderTextColor={Colors.textMuted}
                    value={newPassword}
                    onChangeText={(t) => { setNewPassword(t); setPasswordError(''); }}
                    secureTextEntry={!showNewPw}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowNewPw(p => !p)} style={styles.pwEyeBtn}>
                    {showNewPw ? <EyeOff color={Colors.textMuted} size={16} /> : <Eye color={Colors.textMuted} size={16} />}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.pwInputFull}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmNewPassword}
                  onChangeText={(t) => { setConfirmNewPassword(t); setPasswordError(''); }}
                  secureTextEntry={!showNewPw}
                  autoCapitalize="none"
                />
                {passwordError ? (
                  <Text style={styles.pwError}>{passwordError}</Text>
                ) : null}
                {passwordSuccess ? (
                  <Text style={styles.pwSuccess}>Password changed successfully!</Text>
                ) : null}
                <View style={styles.pwActions}>
                  <TouchableOpacity
                    style={styles.pwSaveBtn}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                    activeOpacity={0.7}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color={Colors.textInverse} size="small" />
                    ) : (
                      <Text style={styles.pwSaveBtnText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pwCancelBtn}
                    onPress={() => setShowChangePassword(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pwCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          )}

          {!isGuest && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={showPhotoOptions}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.primaryLight + '25' }]}>
                  <ImageIcon color={Colors.primary} size={20} />
                </View>
                <Text style={styles.quickActionLabel}>Change Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={startEditing}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.sage + '25' }]}>
                  <Pencil color={Colors.sage} size={20} />
                </View>
                <Text style={styles.quickActionLabel}>Edit Name</Text>
              </TouchableOpacity>

              {profile.avatarUri && (
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={() => {
                    Alert.alert(
                      'Remove Photo',
                      'Are you sure you want to remove your profile photo?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            animateAvatar();
                            saveProfile({ ...profile, avatarUri: null });
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: Colors.dangerLight }]}>
                    <Trash2 color={Colors.danger} size={20} />
                  </View>
                  <Text style={styles.quickActionLabel}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          )}

          {!isGuest && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
              testID="logout-btn"
            >
              <LogOut color="#FFFFFF" size={20} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          )}

          {!isGuest && (
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              testID="delete-account-btn"
            >
              <Trash2 color={Colors.danger} size={18} />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 28,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
  },
  avatarOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight + '30',
    borderWidth: 3,
    borderColor: Colors.primary + '40',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  tapHint: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  editRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  namePlaceholder: {
    color: Colors.textMuted,
    fontWeight: '400' as const,
    fontStyle: 'italic' as const,
  },
  statsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  changePasswordRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
  },
  changePasswordLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  passwordForm: {
    gap: 12,
  },
  pwInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  pwInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pwInputFull: {
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  pwEyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pwError: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.danger,
  },
  pwSuccess: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.success,
  },
  pwActions: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  pwSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pwSaveBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  pwCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center' as const,
  },
  pwCancelBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  deleteAccountButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  deleteAccountText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
});
