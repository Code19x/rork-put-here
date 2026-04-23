// v1.1
// PutHere App - Edit Item Screen
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, Image as ImageIcon, X, Check } from 'lucide-react-native';
import VoiceInput from '@/components/VoiceInput';
import Colors from '@/constants/colors';
import { useStash } from '@/providers/StashProvider';
import IconRenderer from '@/components/IconRenderer';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, locations, getItemById, updateItem } = useStash();

  const item = getItemById(id ?? '');

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setNotes(item.notes);
      setCategoryId(item.categoryId);
      setLocationId(item.locationId);
      setImageUri(item.imageUri);
    }
  }, [item]);

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
    if (!id) return;

    updateItem(id, {
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
  }, [name, categoryId, locationId, notes, imageUri, id, updateItem]);

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

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
        />

        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || !categoryId || !locationId) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || !categoryId || !locationId}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
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
});
