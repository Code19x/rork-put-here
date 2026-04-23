// PutHere App - Home Screen v1.1
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Animated, Pressable, Platform, ActivityIndicator, ScrollView, SectionList,
  useWindowDimensions, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  Plus, Search, X, Package, MapPin, Filter, ArrowUpDown,
  ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp,
  LayoutGrid, Layers, Trash2, List,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useStash, useFilteredItems } from '@/providers/StashProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import IconRenderer from '@/components/IconRenderer';
import { StashItem, Category } from '@/types';

type SortOption = 'newest' | 'oldest' | 'az' | 'za';
type ViewMode = 'list' | 'category' | 'grid';

const SORT_OPTIONS: { key: SortOption; label: string; icon: React.ReactNode }[] = [
  { key: 'newest', label: 'Newest First', icon: <CalendarArrowDown color={Colors.primary} size={16} /> },
  { key: 'oldest', label: 'Oldest First', icon: <CalendarArrowUp color={Colors.primary} size={16} /> },
  { key: 'az', label: 'A → Z', icon: <ArrowDownAZ color={Colors.primary} size={16} /> },
  { key: 'za', label: 'Z → A', icon: <ArrowUpAZ color={Colors.primary} size={16} /> },
];

const VIEW_MODES: { key: ViewMode; icon: typeof List }[] = [
  { key: 'list', icon: List },
  { key: 'category', icon: Layers },
  { key: 'grid', icon: LayoutGrid },
];

export default function HomeScreen() {
  const { categories, locations, isLoading, getCategoryById, getLocationById, clearAllData, items: allItems } = useStash();
  const { user } = useAuth();
  const { isInTrial, trialDaysLeft, trialDays } = useSubscription();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!user?.id) {
          setProfileName(null);
          setProfileAvatar(null);
          return;
        }
        const stored = await AsyncStorage.getItem(`stash_user_profile_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored) as { name: string; avatarUri: string | null };
          if (parsed.name) setProfileName(parsed.name);
          if (parsed.avatarUri) setProfileAvatar(parsed.avatarUri);
          console.log('Home: loaded profile for user:', user.id, parsed.name);
        } else {
          setProfileName(null);
          setProfileAvatar(null);
        }
      } catch (e) {
        console.log('Home: error loading profile:', e);
      }
    };
    void loadProfile();
  }, [user?.id]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const { width: screenWidth } = useWindowDimensions();
  const GRID_GAP = 10;
  const GRID_PADDING = 16;
  const NUM_COLUMNS = 3;
  const gridTileSize = (screenWidth - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const CAT_COLUMNS = 3;
  const CAT_GAP = 10;
  const CAT_PADDING = 16;
  const catTileSize = (screenWidth - CAT_PADDING * 2 - CAT_GAP * (CAT_COLUMNS - 1)) / CAT_COLUMNS;

  const filteredItems = useFilteredItems(search, selectedCategories, selectedLocations);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'az':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'za':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return sorted;
    }
  }, [filteredItems, sortBy]);

  const categorySections = useMemo(() => {
    const grouped = new Map<string, { category: Category | undefined; items: StashItem[] }>();
    const uncategorizedKey = '__uncategorized__';

    for (const item of sortedItems) {
      const cat = getCategoryById(item.categoryId);
      const key = cat?.id ?? uncategorizedKey;
      if (!grouped.has(key)) {
        grouped.set(key, { category: cat, items: [] });
      }
      grouped.get(key)!.items.push(item);
    }

    return Array.from(grouped.values()).map(({ category, items }) => ({
      title: category?.name ?? 'Uncategorized',
      color: category?.color ?? Colors.textMuted,
      icon: category?.icon ?? 'Package',
      data: items,
    }));
  }, [sortedItems, getCategoryById]);

  const fabScale = useRef(new Animated.Value(1)).current;

  const handleFabPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      router.push('/add-item');
    });
  }, [fabScale]);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
    setShowSortMenu(false);
  }, []);

  const toggleSortMenu = useCallback(() => {
    setShowSortMenu(prev => !prev);
    setShowFilters(false);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedLocations([]);
    setSearch('');
  }, []);

  const cycleViewMode = useCallback(() => {
    setViewMode(prev => {
      const idx = VIEW_MODES.findIndex(v => v.key === prev);
      const next = VIEW_MODES[(idx + 1) % VIEW_MODES.length].key;
      if (Platform.OS !== 'web') {
        void Haptics.selectionAsync();
      }
      return next;
    });
  }, []);

  const hasActiveFilters = selectedCategories.length > 0 || selectedLocations.length > 0 || !!search;
  const currentSortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Sort';

  const displayName = profileName || user?.name || 'User';
  const displayAvatar = profileAvatar || user?.avatarUrl || null;

  const userInitial = useMemo(() => {
    if (!displayName || displayName === 'User') return '?';
    return displayName.charAt(0).toUpperCase();
  }, [displayName]);

  const handleClearAllStuff = useCallback(() => {
    Alert.alert(
      'Clear all the stuff',
      'This will delete all your stashed items, categories, and locations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Done', 'All data has been cleared.');
            } catch (error) {
              console.log('Clear data error:', error);
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  }, [clearAllData]);

  const renderListItem = useCallback(({ item }: { item: StashItem }) => {
    const category = getCategoryById(item.categoryId);
    const location = getLocationById(item.locationId);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => router.push(`/item-detail?id=${item.id}`)}
        activeOpacity={0.7}
        testID={`item-card-${item.id}`}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.itemImage} contentFit="cover" />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Package color={Colors.textMuted} size={28} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.itemMeta}>
            {category && (
              <View style={[styles.metaBadge, { backgroundColor: category.color + '18' }]}>
                <IconRenderer name={category.icon} color={category.color} size={12} />
                <Text style={[styles.metaText, { color: category.color }]}>{category.name}</Text>
              </View>
            )}
            {location && (
              <View style={styles.metaBadge}>
                <MapPin color={Colors.textMuted} size={12} />
                <Text style={styles.metaText}>{location.name}</Text>
              </View>
            )}
          </View>
          {item.notes ? (
            <Text style={styles.itemNotes} numberOfLines={1}>{item.notes}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, [getCategoryById, getLocationById]);

  const renderGridItem = useCallback(({ item }: { item: StashItem }) => {
    const category = getCategoryById(item.categoryId);

    return (
      <TouchableOpacity
        style={[styles.gridTile, { width: gridTileSize, height: gridTileSize + 36 }]}
        onPress={() => router.push(`/item-detail?id=${item.id}`)}
        activeOpacity={0.7}
        testID={`grid-item-${item.id}`}
      >
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={[styles.gridTileImage, { width: gridTileSize, height: gridTileSize }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.gridTilePlaceholder, { width: gridTileSize, height: gridTileSize }]}>
            <Package color={Colors.textMuted} size={24} />
          </View>
        )}
        <View style={styles.gridTileLabel}>
          <Text style={styles.gridTileName} numberOfLines={1}>{item.name}</Text>
          {category && (
            <View style={[styles.gridTileDot, { backgroundColor: category.color }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [getCategoryById, gridTileSize]);

  const renderCategoryItem = useCallback(({ item }: { item: StashItem }) => {
    const location = getLocationById(item.locationId);

    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => router.push(`/item-detail?id=${item.id}`)}
        activeOpacity={0.7}
        testID={`cat-item-${item.id}`}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.categoryItemImage} contentFit="cover" />
        ) : (
          <View style={styles.categoryItemPlaceholder}>
            <Package color={Colors.textMuted} size={18} />
          </View>
        )}
        <View style={styles.categoryItemInfo}>
          <Text style={styles.categoryItemName} numberOfLines={1}>{item.name}</Text>
          {location && (
            <View style={styles.categoryItemLocationRow}>
              <MapPin color={Colors.textMuted} size={10} />
              <Text style={styles.categoryItemLocation}>{location.name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [getLocationById]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string; color: string; icon: string } }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: section.color + '20' }]}>
        <IconRenderer name={section.icon} color={section.color} size={16} />
      </View>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={[styles.sectionCount, { backgroundColor: section.color + '18' }]}>
        <Text style={[styles.sectionCountText, { color: section.color }]}>
          {categorySections.find(s => s.title === section.title)?.data.length ?? 0}
        </Text>
      </View>
    </View>
  ), [categorySections]);

  const renderFilterChips = () => (
    <View style={styles.filtersContainer}>
      <Text style={styles.filterLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {categories.map(cat => {
          const isSelected = selectedCategories.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                isSelected && { backgroundColor: cat.color, borderColor: cat.color },
              ]}
              onPress={() => setSelectedCategories(prev =>
                isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
              )}
            >
              <IconRenderer
                name={cat.icon}
                color={isSelected ? '#fff' : cat.color}
                size={14}
              />
              <Text style={[
                styles.chipText,
                isSelected && { color: '#fff' },
              ]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.filterLabel, { marginTop: 12 }]}>Location</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {locations.map(loc => {
          const isSelected = selectedLocations.includes(loc.id);
          return (
            <TouchableOpacity
              key={loc.id}
              style={[
                styles.chip,
                isSelected && { backgroundColor: Colors.primary, borderColor: Colors.primary },
              ]}
              onPress={() => setSelectedLocations(prev =>
                isSelected ? prev.filter(id => id !== loc.id) : [...prev, loc.id]
              )}
            >
              <IconRenderer
                name={loc.icon}
                color={isSelected ? '#fff' : Colors.textSecondary}
                size={14}
              />
              <Text style={[
                styles.chipText,
                isSelected && { color: '#fff' },
              ]}>{loc.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderSortMenu = () => (
    <View style={styles.sortMenu}>
      {SORT_OPTIONS.map(option => (
        <TouchableOpacity
          key={option.key}
          style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
          onPress={() => {
            setSortBy(option.key);
            setShowSortMenu(false);
            if (Platform.OS !== 'web') {
              void Haptics.selectionAsync();
            }
          }}
        >
          {option.icon}
          <Text style={[styles.sortOptionText, sortBy === option.key && styles.sortOptionTextActive]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const currentViewIcon = VIEW_MODES.find(v => v.key === viewMode)?.icon ?? List;
  const ViewIcon = currentViewIcon;

  const emptyComponent = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Package color={Colors.accentLight} size={56} />
      </View>
      <Text style={styles.emptyTitle}>
        {hasActiveFilters ? 'No items match' : 'Your stash is empty'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasActiveFilters
          ? 'Try adjusting your filters or search terms'
          : 'Tap the + button to start tracking your stuff'}
      </Text>
    </View>
  );

  const renderCategoryBlock = useCallback(({ item }: { item: typeof categorySections[number] }) => {
    return (
      <TouchableOpacity
        style={[styles.categoryThumb, { width: catTileSize }]}
        onPress={() => {
          const catId = categorySections.find(s => s.title === item.title)?.data[0]?.categoryId;
          setSelectedCategories(catId ? [catId] : []);
          setViewMode('list');
          if (Platform.OS !== 'web') void Haptics.selectionAsync();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryThumbIcon, { backgroundColor: item.color }]}>
          <IconRenderer name={item.icon} color="#fff" size={22} />
        </View>
        <Text style={styles.categoryThumbName} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.categoryThumbCount}>
          {item.data.length}
        </Text>
      </TouchableOpacity>
    );
  }, [categorySections, catTileSize]);

  const renderContent = () => {
    if (viewMode === 'category') {
      if (categorySections.length === 0) {
        return <ScrollView contentContainerStyle={styles.listContent}>{emptyComponent}</ScrollView>;
      }
      return (
        <FlatList
          key="category-3col"
          data={categorySections}
          keyExtractor={item => item.title}
          renderItem={renderCategoryBlock}
          numColumns={CAT_COLUMNS}
          columnWrapperStyle={styles.categoryGridRow}
          contentContainerStyle={styles.categoryGridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={emptyComponent}
        />
      );
    }

    if (viewMode === 'grid') {
      return (
        <FlatList
          key={`grid-${NUM_COLUMNS}col`}
          data={sortedItems}
          keyExtractor={item => item.id}
          renderItem={renderGridItem}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={emptyComponent}
        />
      );
    }

    return (
      <FlatList
        key="list-1col"
        data={sortedItems}
        keyExtractor={item => item.id}
        renderItem={renderListItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={emptyComponent}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <View style={styles.headerActions}>
          {displayAvatar ? (
            <Image
              source={{ uri: displayAvatar }}
              style={styles.profileAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.profileInitialWrap}>
              <Text style={styles.profileInitialText}>{userInitial}</Text>
            </View>
          )}
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileGreeting}>Welcome back,</Text>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Search color={Colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your stash..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            testID="search-input"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <X color={Colors.textMuted} size={18} />
            </Pressable>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={cycleViewMode}
          testID="view-mode-btn"
        >
          <ViewIcon color={Colors.textSecondary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, showSortMenu && styles.iconButtonActive]}
          onPress={toggleSortMenu}
          testID="sort-btn"
        >
          <ArrowUpDown color={showSortMenu ? Colors.textInverse : Colors.textSecondary} size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, hasActiveFilters && styles.iconButtonActive]}
          onPress={toggleFilters}
          testID="filter-btn"
        >
          <Filter color={hasActiveFilters ? Colors.textInverse : Colors.textSecondary} size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.viewModeSection}>
        <Text style={styles.viewModeLabel}>View in</Text>
        <View style={styles.viewModePills}>
          {VIEW_MODES.map(mode => {
            const Icon = mode.icon;
            const active = viewMode === mode.key;
            return (
              <TouchableOpacity
                key={mode.key}
                style={[styles.viewPill, active && styles.viewPillActive]}
                onPress={() => {
                  setViewMode(mode.key);
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                }}
              >
                <Icon color={active ? Colors.textInverse : Colors.textSecondary} size={14} />
                <Text style={[styles.viewPillText, active && styles.viewPillTextActive]}>
                  {mode.key === 'list' ? 'List' : mode.key === 'category' ? 'Categories' : 'Grid'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showSortMenu && renderSortMenu()}
      {showFilters && renderFilterChips()}

      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
          <X color={Colors.primary} size={14} />
          <Text style={styles.clearFiltersText}>Clear all filters</Text>
        </TouchableOpacity>
      )}

      {sortBy !== 'newest' && !showSortMenu && (
        <View style={styles.sortIndicator}>
          <Text style={styles.sortIndicatorText}>Sorted by: {currentSortLabel}</Text>
        </View>
      )}

      {isInTrial && trialDaysLeft !== null && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>
            {trialDaysLeft === 0
              ? `Free trial ends today`
              : `${trialDaysLeft} of ${trialDays} trial day${trialDaysLeft === 1 ? '' : 's'} remaining`}
          </Text>
          <TouchableOpacity onPress={() => router.push('/paywall')} activeOpacity={0.7}>
            <Text style={styles.limitBannerLink}>Subscribe</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderContent()}

      <View style={styles.fabGroup}>
        <TouchableOpacity
          style={styles.trashFab}
          onPress={handleClearAllStuff}
          activeOpacity={0.8}
          testID="clear-all-btn"
        >
          <Trash2 color="#fff" size={22} />
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            style={styles.fabInner}
            onPress={handleFabPress}
            activeOpacity={0.8}
            testID="add-item-fab"
          >
            <Plus color={Colors.textInverse} size={28} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 24,
    gap: 8,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.accentLight,
  },
  profileInitialWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1B2A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8873C',
  },
  profileTextWrap: {
    maxWidth: 110,
  },
  profileGreeting: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.danger || '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8873C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logo: {
    width: 140,
    height: 44,
    backgroundColor: 'transparent',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  viewModeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  viewModeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  viewModePills: {
    flexDirection: 'row',
    gap: 8,
  },
  viewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 5,
  },
  viewPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  viewPillText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  viewPillTextActive: {
    color: Colors.textInverse,
  },

  sortMenu: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  sortOptionActive: {
    backgroundColor: Colors.primaryLight + '15',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  sortOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  sortIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sortIndicatorText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 8,
    gap: 5,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },

  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 90,
    height: 90,
  },
  itemImagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  itemNotes: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },

  gridContent: {
    padding: 16,
    paddingBottom: 100,
  },
  gridRow: {
    gap: 10,
  },
  gridTile: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  gridTileImage: {
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  gridTilePlaceholder: {
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  gridTileLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  gridTileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  gridTileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
    gap: 8,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionCount: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  categoryItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryItemImage: {
    width: 56,
    height: 56,
  },
  categoryItemPlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryItemInfo: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  categoryItemLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  categoryItemLocation: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  categoryGridContent: {
    padding: 16,
    paddingBottom: 100,
  },
  categoryGridRow: {
    gap: 10,
    marginBottom: 10,
  },
  categoryThumb: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryThumbIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryThumbName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 2,
  },
  categoryThumbCount: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accentLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fabGroup: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trashFab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.danger || '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF3E0',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    gap: 8,
  },
  limitBannerText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#E65100',
  },
  limitBannerLink: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#F5A623',
    textDecorationLine: 'underline' as const,
  },
});
