import { Category, Location } from '@/types';
import Colors from '@/constants/colors';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-electronics', name: 'Electronics', icon: 'Cpu', color: Colors.primary, isDefault: true },
  { id: 'cat-documents', name: 'Documents', icon: 'FileText', color: Colors.sage, isDefault: true },
  { id: 'cat-clothing', name: 'Clothing', icon: 'Shirt', color: Colors.accent, isDefault: true },
  { id: 'cat-tools', name: 'Tools', icon: 'Wrench', color: Colors.clay, isDefault: true },
  { id: 'cat-collectibles', name: 'Collectibles', icon: 'Gem', color: Colors.amber, isDefault: true },
  { id: 'cat-kitchen', name: 'Kitchen', icon: 'CookingPot', color: Colors.terracotta, isDefault: true },
  { id: 'cat-books', name: 'Books', icon: 'BookOpen', color: Colors.sage, isDefault: true },
  { id: 'cat-sports', name: 'Sports', icon: 'Dumbbell', color: Colors.success, isDefault: true },
  { id: 'cat-misc', name: 'Misc', icon: 'Package', color: Colors.textMuted, isDefault: true },
];

export const DEFAULT_LOCATIONS: Location[] = [
  { id: 'loc-bedroom', name: 'Bedroom', icon: 'Bed', isDefault: true },
  { id: 'loc-kitchen', name: 'Kitchen', icon: 'CookingPot', isDefault: true },
  { id: 'loc-garage', name: 'Garage', icon: 'Car', isDefault: true },
  { id: 'loc-closet', name: 'Closet', icon: 'DoorOpen', isDefault: true },
  { id: 'loc-storage', name: 'Storage Room', icon: 'Warehouse', isDefault: true },
  { id: 'loc-living', name: 'Living Room', icon: 'Sofa', isDefault: true },
  { id: 'loc-office', name: 'Office', icon: 'Monitor', isDefault: true },
  { id: 'loc-bathroom', name: 'Bathroom', icon: 'Bath', isDefault: true },
  { id: 'loc-attic', name: 'Attic', icon: 'Home', isDefault: true },
  { id: 'loc-basement', name: 'Basement', icon: 'ArrowDown', isDefault: true },
];
