import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { StashItem, Category, Location } from '@/types';
import { DEFAULT_CATEGORIES, DEFAULT_LOCATIONS } from '@/constants/defaults';
import { useAuth } from '@/providers/AuthProvider';

const STORAGE_PREFIX = 'stash';
const getItemsKey = (userId: string) => `${STORAGE_PREFIX}_items_${userId}`;
const getCategoriesKey = (userId: string) => `${STORAGE_PREFIX}_categories_${userId}`;
const getLocationsKey = (userId: string) => `${STORAGE_PREFIX}_locations_${userId}`;

export const [StashProvider, useStash] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const prevUserIdRef = useRef<string | null>(null);

  const [items, setItems] = useState<StashItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [locations, setLocations] = useState<Location[]>(DEFAULT_LOCATIONS);

  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      console.log('StashProvider: user changed from', prevUserIdRef.current, 'to', userId, '— resetting data');
      setItems([]);
      setCategories(DEFAULT_CATEGORIES);
      setLocations(DEFAULT_LOCATIONS);
      queryClient.removeQueries({ queryKey: ['stash-items'] });
      queryClient.removeQueries({ queryKey: ['stash-categories'] });
      queryClient.removeQueries({ queryKey: ['stash-locations'] });
    }
    prevUserIdRef.current = userId;
  }, [userId, queryClient]);

  const itemsQuery = useQuery({
    queryKey: ['stash-items', userId],
    queryFn: async () => {
      if (!userId) return [];
      const stored = await AsyncStorage.getItem(getItemsKey(userId));
      console.log('StashProvider: loading items for user:', userId);
      return stored ? (JSON.parse(stored) as StashItem[]) : [];
    },
    enabled: !!userId,
  });

  const categoriesQuery = useQuery({
    queryKey: ['stash-categories', userId],
    queryFn: async () => {
      if (!userId) return DEFAULT_CATEGORIES;
      const stored = await AsyncStorage.getItem(getCategoriesKey(userId));
      console.log('StashProvider: loading categories for user:', userId);
      return stored ? (JSON.parse(stored) as Category[]) : DEFAULT_CATEGORIES;
    },
    enabled: !!userId,
  });

  const locationsQuery = useQuery({
    queryKey: ['stash-locations', userId],
    queryFn: async () => {
      if (!userId) return DEFAULT_LOCATIONS;
      const stored = await AsyncStorage.getItem(getLocationsKey(userId));
      console.log('StashProvider: loading locations for user:', userId);
      return stored ? (JSON.parse(stored) as Location[]) : DEFAULT_LOCATIONS;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (itemsQuery.data) setItems(itemsQuery.data);
  }, [itemsQuery.data]);

  useEffect(() => {
    if (categoriesQuery.data) setCategories(categoriesQuery.data);
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (locationsQuery.data) setLocations(locationsQuery.data);
  }, [locationsQuery.data]);

  const persistItems = useMutation({
    mutationFn: async (updated: StashItem[]) => {
      if (!userId) throw new Error('No user');
      await AsyncStorage.setItem(getItemsKey(userId), JSON.stringify(updated));
      console.log('StashProvider: saved', updated.length, 'items for user:', userId);
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stash-items', userId] });
    },
  });

  const persistCategories = useMutation({
    mutationFn: async (updated: Category[]) => {
      if (!userId) throw new Error('No user');
      await AsyncStorage.setItem(getCategoriesKey(userId), JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stash-categories', userId] });
    },
  });

  const persistLocations = useMutation({
    mutationFn: async (updated: Location[]) => {
      if (!userId) throw new Error('No user');
      await AsyncStorage.setItem(getLocationsKey(userId), JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stash-locations', userId] });
    },
  });

  const addItem = useCallback((item: Omit<StashItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newItem: StashItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newItem, ...items];
    setItems(updated);
    persistItems.mutate(updated);
    return newItem;
  }, [items, persistItems]);

  const updateItem = useCallback((id: string, changes: Partial<Omit<StashItem, 'id' | 'createdAt'>>) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item
    );
    setItems(updated);
    persistItems.mutate(updated);
  }, [items, persistItems]);

  const deleteItem = useCallback((id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    persistItems.mutate(updated);
  }, [items, persistItems]);

  const addCategory = useCallback((name: string, icon: string, color: string) => {
    const newCat: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      icon,
      color,
      isDefault: false,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    persistCategories.mutate(updated);
    return newCat;
  }, [categories, persistCategories]);

  const deleteCategory = useCallback((id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    persistCategories.mutate(updated);
  }, [categories, persistCategories]);

  const addLocation = useCallback((name: string, icon: string) => {
    const newLoc: Location = {
      id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      icon,
      isDefault: false,
    };
    const updated = [...locations, newLoc];
    setLocations(updated);
    persistLocations.mutate(updated);
    return newLoc;
  }, [locations, persistLocations]);

  const deleteLocation = useCallback((id: string) => {
    const updated = locations.filter(l => l.id !== id);
    setLocations(updated);
    persistLocations.mutate(updated);
  }, [locations, persistLocations]);

  const getCategoryById = useCallback((id: string) => categories.find(c => c.id === id), [categories]);
  const getLocationById = useCallback((id: string) => locations.find(l => l.id === id), [locations]);
  const getItemById = useCallback((id: string) => items.find(i => i.id === id), [items]);

  const isLoading = itemsQuery.isLoading || categoriesQuery.isLoading || locationsQuery.isLoading;

  const clearAllData = useCallback(async () => {
    if (!userId) return;
    await AsyncStorage.multiRemove([
      getItemsKey(userId),
      getCategoriesKey(userId),
      getLocationsKey(userId),
    ]);
    setItems([]);
    setCategories(DEFAULT_CATEGORIES);
    setLocations(DEFAULT_LOCATIONS);
    void queryClient.invalidateQueries({ queryKey: ['stash-items', userId] });
    void queryClient.invalidateQueries({ queryKey: ['stash-categories', userId] });
    void queryClient.invalidateQueries({ queryKey: ['stash-locations', userId] });
    console.log('StashProvider: all data cleared for user:', userId);
  }, [queryClient, userId]);

  return useMemo(() => ({
    items,
    categories,
    locations,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    addCategory,
    deleteCategory,
    addLocation,
    deleteLocation,
    getCategoryById,
    getLocationById,
    getItemById,
    clearAllData,
  }), [
    items, categories, locations, isLoading,
    addItem, updateItem, deleteItem,
    addCategory, deleteCategory,
    addLocation, deleteLocation,
    getCategoryById, getLocationById, getItemById,
    clearAllData,
  ]);
});

export function useFilteredItems(search: string, categoryIds: string[], locationIds: string[]) {
  const { items } = useStash();
  return useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryIds.length === 0 || categoryIds.includes(item.categoryId);
      const matchesLocation = locationIds.length === 0 || locationIds.includes(item.locationId);
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [items, search, categoryIds, locationIds]);
}
