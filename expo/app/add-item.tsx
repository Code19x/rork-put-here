// v1.1
// PutHere App - Add Item Screen
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, Image as ImageIcon, X, Check, Plus } from 'lucide-react-native';
import VoiceInput from '@/components/VoiceInput';
import Colors from '@/constants/colors';
import { useStash } from '@/providers/StashProvider';
import IconRenderer from '@/components/IconRenderer';

const CATEGORY_ICON_OPTIONS = [
  'Cpu', 'FileText', 'Shirt', 'Wrench', 'Gem', 'CookingPot', 'BookOpen',
  'Dumbbell', 'Package', 'Tag', 'Camera', 'Monitor', 'Home', 'Car',
];

const CATEGORY_COLOR_OPTIONS = [
  Colors.primary, Colors.sage, Colors.accent, Colors.clay,
  Colors.amber, Colors.terracotta, Colors.success, Colors.textMuted,
  '#6A8CAF', '#9B6B9E', '#5B8C5A', '#C94040',
];

const LOCATION_ICON_OPTIONS = [
  'Bed', 'CookingPot', 'Car', 'DoorOpen', 'Warehouse', 'Sofa',
  'Monitor', 'Bath', 'Home', 'ArrowDown', 'Package', 'MapPin',
];

export default function AddItemScreen() {
  const { categories, locations, addItem, addCategory, addLocation } = useStash();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Package');
  const [newCatColor, setNewCatColor] = useState(Colors.primary);

  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocIcon, setNewLocIcon] = useState('MapPin');

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Could not open image picker.');
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Camera error:', error);
      Alert.alert('Error', 'Could not open camera.');
    }
  }, []);

  const handleAddCategory = useCallback(() => {
    if (!newCatName.trim()) {
      Alert.alert('Name required', 'Please enter a category name.');
      return;
    }
    const created = addCategory(newCatName.trim(), newCatIcon, newCatColor);
    setCategoryId(created.id);
    setShowNewCategory(false);
    setNewCatName('');
    setNewCatIcon('Package');
    setNewCatColor(Colors.primary);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [newCatName, newCatIcon, newCatColor, addCategory]);

  const handleAddLocation = useCallback(() => {
    if (!newLocName.trim()) {
      Alert.alert('Name required', 'Please enter a location name.');
      return;
    }
    const created = addLocation(newLocName.trim(), newLocIcon);
    setLocationId(created.id);
    setShowNewLocation(false);
    setNewLocName('');
    setNewLocIcon('MapPin');
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [newLocName, newLocIcon, addLocation]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this item.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Category required', 'Please select a category.');
      return;
    }
    if (!locationId) {
      Alert.alert('Location required', 'Please select a location.');
      return;
    }

    addItem({
      name: name.trim(),
      categoryId,
      locationId,
      notes: notes.trim(),
      imageUri,
    });

    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  }, [name, categoryId, locationId, notes, imageUri, addItem]);

  const resetNewCategory = useCallback(() => {
    setShowNewCategory(false);
    setNewCatName('');
    setNewCatIcon('Package');
    setNewCatColor(Colors.primary);
  }, []);

  const resetNewLocation = useCallback(() => {
    setShowNewLocation(false);
    setNewLocName('');
    setNewLocIcon('MapPin');
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
              <TouchableOpacity style={styles.removeImage} onPress={() => setImageUri(null)}>
                <X color="#fff" size={16} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                  <Camera color={Colors.primary} size={24} />
                  <Text style={styles.imageBtnText}>Camera</Text>
                </TouchableOpacity>
                <View style={styles.imageDivider} />
                <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                  <ImageIcon color={Colors.primary} size={24} />
                  <Text style={styles.imageBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.label}>Name</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputFlex}
            placeholder="What is this item?"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            testID="item-name-input"
          />
          <VoiceInput onTranscription={(text) => setName(prev => prev ? `${prev} ${text}` : text)} currentValue={name} onValueChange={setName} />
        </View>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.selectChip,
                categoryId === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
              ]}
              onPress={() => setCategoryId(cat.id)}
            >
              <IconRenderer
                name={cat.icon}
                color={categoryId === cat.id ? '#fff' : cat.color}
                size={15}
              />
              <Text style={[
                styles.selectChipText,
                categoryId === cat.id && { color: '#fff' },
              ]}>{cat.name}</Text>
              {categoryId === cat.id && <Check color="#fff" size={14} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => setShowNewCategory(true)}
            testID="add-category-btn"
          >
            <Plus color={Colors.primary} size={15} />
            <Text style={styles.addChipText}>New</Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={styles.label}>Location</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {locations.map(loc => (
            <TouchableOpacity
              key={loc.id}
              style={[
                styles.selectChip,
                locationId === loc.id && { backgroundColor: Colors.primary, borderColor: Colors.primary },
              ]}
              onPress={() => setLocationId(loc.id)}
            >
              <IconRenderer
                name={loc.icon}
                color={locationId === loc.id ? '#fff' : Colors.textSecondary}
                size={15}
              />
              <Text style={[
                styles.selectChipText,
                locationId === loc.id && { color: '#fff' },
              ]}>{loc.name}</Text>
              {locationId === loc.id && <Check color="#fff" size={14} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => setShowNewLocation(true)}
            testID="add-location-btn"
          >
            <Plus color={Colors.primary} size={15} />
            <Text style={styles.addChipText}>New</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.labelRow}>
          <Text style={styles.label}>Notes</Text>
          <VoiceInput onTranscription={(text) => setNotes(prev => prev ? `${prev} ${text}` : text)} currentValue={notes} onValueChange={setNotes} />
        </View>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Add any details, serial numbers, or reminders..."
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          testID="item-notes-input"
        />

        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || !categoryId || !locationId) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || !categoryId || !locationId}
          testID="save-item-btn"
        >
          <Text style={styles.saveButtonText}>Save Item</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showNewCategory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Category</Text>
              <TouchableOpacity onPress={resetNewCategory} hitSlop={12}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              placeholderTextColor={Colors.textMuted}
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
              testID="new-category-name-input"
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICON_OPTIONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newCatIcon === icon && { backgroundColor: newCatColor, borderColor: newCatColor },
                  ]}
                  onPress={() => setNewCatIcon(icon)}
                >
                  <IconRenderer
                    name={icon}
                    color={newCatIcon === icon ? '#fff' : Colors.textSecondary}
                    size={20}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newCatColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewCatColor(color)}
                >
                  {newCatColor === color && <Check color="#fff" size={14} />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalPreview}>
              <View style={[styles.previewChip, { backgroundColor: newCatColor }]}>
                <IconRenderer name={newCatIcon} color="#fff" size={15} />
                <Text style={styles.previewChipText}>{newCatName || 'Preview'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, !newCatName.trim() && styles.modalSaveBtnDisabled]}
              onPress={handleAddCategory}
              disabled={!newCatName.trim()}
            >
              <Text style={styles.modalSaveBtnText}>Add Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showNewLocation} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Location</Text>
              <TouchableOpacity onPress={resetNewLocation} hitSlop={12}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Location name"
              placeholderTextColor={Colors.textMuted}
              value={newLocName}
              onChangeText={setNewLocName}
              autoFocus
              testID="new-location-name-input"
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {LOCATION_ICON_OPTIONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newLocIcon === icon && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                  ]}
                  onPress={() => setNewLocIcon(icon)}
                >
                  <IconRenderer
                    name={icon}
                    color={newLocIcon === icon ? '#fff' : Colors.textSecondary}
                    size={20}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalPreview}>
              <View style={[styles.previewChip, { backgroundColor: Colors.primary }]}>
                <IconRenderer name={newLocIcon} color="#fff" size={15} />
                <Text style={styles.previewChipText}>{newLocName || 'Preview'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, !newLocName.trim() && styles.modalSaveBtnDisabled]}
              onPress={handleAddLocation}
              disabled={!newLocName.trim()}
            >
              <Text style={styles.modalSaveBtnText}>Add Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  imageSection: {
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 160,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageBtn: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    gap: 6,
  },
  imageBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  imageDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  notesInput: {
    minHeight: 90,
    paddingTop: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  inputFlex: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 8,
    gap: 6,
  },
  selectChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    gap: 5,
  },
  addChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  modalPreview: {
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 8,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 7,
  },
  previewChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
});
