export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface Location {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
}

export interface StashItem {
  id: string;
  name: string;
  categoryId: string;
  locationId: string;
  notes: string;
  imageUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  authMethod?: 'email' | 'apple' | 'google';
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}
