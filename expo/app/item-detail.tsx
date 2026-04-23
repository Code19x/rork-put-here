// v1.1
// PutHere App - Item Detail Screen
import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Share,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Edit, Trash2, Package, MapPin, StickyNote, Clock, Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useStash } from '@/providers/StashProvider';
import IconRenderer from '@/components/IconRenderer';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItemById, getCategoryById, getLocationById, deleteItem } = useStash();

  const item = getItemById(id ?? '');
  const category = item ? getCategoryById(item.categoryId) : undefined;
  const location = item ? getLocationById(item.locationId) : undefined;

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (item) {
              deleteItem(item.id);
              if (Platform.OS !== 'web') {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              router.back();
            }
          },
        },
      ]
    );
  }, [item, deleteItem]);

  const handleEdit = useCallback(() => {
    if (item) {
      router.push(`/edit-item?id=${item.id}`);
    }
  }, [item]);

  const handleShare = useCallback(async () => {
    if (!item) return;
    try {
      const cat = category?.name ?? 'Uncategorized';
      const loc = location?.name ?? 'Unknown';
      let message = `${item.name}\nCategory: ${cat}\nLocation: ${loc}`;
      if (item.notes) message += `\nNotes: ${item.notes}`;
      message += `\n\nShared from PutHere`;
      await Share.share({ message, title: `Share: ${item.name}` });
    } catch (err) {
      console.log('Share error:', err);
    }
  }, [item, category, location]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Package color={Colors.accentLight} size={64} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.itemName}>{item.name}</Text>

          <View style={styles.badges}>
            {category && (
              <View style={[styles.badge, { backgroundColor: category.color + '15' }]}>
                <IconRenderer name={category.icon} color={category.color} size={16} />
                <Text style={[styles.badgeText, { color: category.color }]}>{category.name}</Text>
              </View>
            )}
            {location && (
              <View style={[styles.badge, { backgroundColor: Colors.primaryLight + '20' }]}>
                <MapPin color={Colors.primary} size={16} />
                <Text style={[styles.badgeText, { color: Colors.primary }]}>{location.name}</Text>
              </View>
            )}
          </View>

          {item.notes ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <StickyNote color={Colors.textMuted} size={16} />
                <Text style={styles.sectionTitle}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock color={Colors.textMuted} size={16} />
              <Text style={styles.sectionTitle}>Details</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Added</Text>
              <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.updatedAt !== item.createdAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Updated</Text>
                <Text style={styles.detailValue}>{formatDate(item.updatedAt)}</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              testID="edit-item-btn"
            >
              <Edit color={Colors.textInverse} size={18} />
              <Text style={styles.editButtonText}>Edit Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              testID="share-item-btn"
            >
              <Share2 color={Colors.primary} size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              testID="delete-item-btn"
            >
              <Trash2 color={Colors.danger} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  backBtnText: {
    color: Colors.textInverse,
    fontWeight: '600' as const,
  },
  heroImage: {
    width: '100%',
    height: 280,
  },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
  },
  itemName: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  shareButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
