// PutHere App - Categories Screen v1.1
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, Modal, Pressable, Platform, ScrollView,
} from 'react-native';
import { Plus, Trash2, X, Check, Tag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useStash } from '@/providers/StashProvider';
import IconRenderer from '@/components/IconRenderer';
import { Image } from 'expo-image';

import { Category } from '@/types';

const ICON_OPTIONS = [
  'Package', 'Cpu', 'FileText', 'Shirt', 'Wrench', 'Gem', 'CookingPot',
  'BookOpen', 'Dumbbell', 'Car', 'Monitor', 'Home', 'Camera', 'Grid3x3',
];

const COLOR_OPTIONS = [
  Colors.primary, Colors.accent, Colors.sage, Colors.clay, Colors.amber,
  Colors.terracotta, Colors.success, Colors.textSecondary,
];

export default function CategoriesScreen() {
  const { categories, items, addCategory, deleteCategory, locations, addLocation, deleteLocation } = useStash();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Package');
  const [selectedColor, setSelectedColor] = useState(Colors.primary);
  const [activeTab, setActiveTab] = useState<'categories' | 'locations'>('categories');
  const [newLocName, setNewLocName] = useState('');
  const [selectedLocIcon, setSelectedLocIcon] = useState('Home');

  const LOCATION_ICONS = [
    'Bed', 'CookingPot', 'Car', 'DoorOpen', 'Warehouse', 'Sofa', 'Monitor',
    'Bath', 'Home', 'ArrowDown', 'Package',
  ];

  const handleAddCategory = useCallback(() => {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a category name.');
      return;
    }
    addCategory(newName.trim(), selectedIcon, selectedColor);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setNewName('');
    setSelectedIcon('Package');
    setSelectedColor(Colors.primary);
    setShowAddModal(false);
  }, [newName, selectedIcon, selectedColor, addCategory]);

  const handleDeleteCategory = useCallback((cat: Category) => {
    const itemCount = items.filter(i => i.categoryId === cat.id).length;
    const message = itemCount > 0
      ? `This category has ${itemCount} item(s). Delete anyway?`
      : `Delete "${cat.name}"?`;
    Alert.alert('Delete Category', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteCategory(cat.id);
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      },
    ]);
  }, [items, deleteCategory]);

  const handleAddLocation = useCallback(() => {
    if (!newLocName.trim()) {
      Alert.alert('Name required', 'Please enter a location name.');
      return;
    }
    addLocation(newLocName.trim(), selectedLocIcon);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setNewLocName('');
    setSelectedLocIcon('Home');
    setShowAddLocationModal(false);
  }, [newLocName, selectedLocIcon, addLocation]);

  const handleDeleteLocation = useCallback((loc: { id: string; name: string; isDefault: boolean }) => {
    if (loc.isDefault) {
      Alert.alert('Cannot Delete', 'Default locations cannot be deleted.');
      return;
    }
    Alert.alert('Delete Location', `Delete "${loc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteLocation(loc.id);
        }
      },
    ]);
  }, [deleteLocation]);

  const renderCategory = useCallback(({ item: cat }: { item: Category }) => {
    const itemCount = items.filter(i => i.categoryId === cat.id).length;
    return (
      <View style={styles.categoryCard}>
        <View style={[styles.categoryIcon, { backgroundColor: cat.color + '18' }]}>
          <IconRenderer name={cat.icon} color={cat.color} size={22} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{cat.name}</Text>
          <Text style={styles.categoryCount}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {!cat.isDefault && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteCategory(cat)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 color={Colors.danger} size={18} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [items, handleDeleteCategory]);

  const renderLocation = useCallback(({ item: loc }: { item: { id: string; name: string; icon: string; isDefault: boolean } }) => {
    const itemCount = items.filter(i => i.locationId === loc.id).length;
    return (
      <View style={styles.categoryCard}>
        <View style={[styles.categoryIcon, { backgroundColor: Colors.primaryLight + '20' }]}>
          <IconRenderer name={loc.icon} color={Colors.primary} size={22} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{loc.name}</Text>
          <Text style={styles.categoryCount}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {!loc.isDefault && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteLocation(loc)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 color={Colors.danger} size={18} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [items, handleDeleteLocation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
      </View>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Tag color={activeTab === 'categories' ? Colors.primary : Colors.textMuted} size={16} />
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
            Categories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'locations' && styles.tabActive]}
          onPress={() => setActiveTab('locations')}
        >
          <IconRenderer
            name="MapPin"
            color={activeTab === 'locations' ? Colors.primary : Colors.textMuted}
            size={16}
          />
          <Text style={[styles.tabText, activeTab === 'locations' && styles.tabTextActive]}>
            Locations
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'categories' ? (
        <FlatList
          data={categories}
          keyExtractor={item => item.id}
          renderItem={renderCategory}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
              testID="add-category-btn"
            >
              <Plus color={Colors.primary} size={20} />
              <Text style={styles.addButtonText}>Add Category</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={locations}
          keyExtractor={item => item.id}
          renderItem={renderLocation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddLocationModal(true)}
              testID="add-location-btn"
            >
              <Plus color={Colors.primary} size={20} />
              <Text style={styles.addButtonText}>Add Location</Text>
            </TouchableOpacity>
          }
        />
      )}

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Category</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              placeholderTextColor={Colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.sectionLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
              {ICON_OPTIONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, selectedIcon === icon && { backgroundColor: selectedColor + '25', borderColor: selectedColor }]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <IconRenderer name={icon} color={selectedIcon === icon ? selectedColor : Colors.textMuted} size={20} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.colorSelected]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Check color="#fff" size={16} />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalSave} onPress={handleAddCategory}>
              <Text style={styles.modalSaveText}>Create Category</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAddLocationModal} transparent animationType="fade" onRequestClose={() => setShowAddLocationModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddLocationModal(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Location</Text>
              <TouchableOpacity onPress={() => setShowAddLocationModal(false)}>
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
            />

            <Text style={styles.sectionLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
              {LOCATION_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, selectedLocIcon === icon && { backgroundColor: Colors.primary + '25', borderColor: Colors.primary }]}
                  onPress={() => setSelectedLocIcon(icon)}
                >
                  <IconRenderer name={icon} color={selectedLocIcon === icon ? Colors.primary : Colors.textMuted} size={20} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalSave} onPress={handleAddLocation}>
              <Text style={styles.modalSaveText}>Create Location</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  logoRow: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 240,
    height: 80,
    backgroundColor: 'transparent',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    gap: 8,
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    width: '88%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexGrow: 0,
    marginBottom: 16,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSave: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
