import { PageId, BlockStyleExtended } from '@/components/AdminDesignToolbar';

export type BlockType = 'text' | 'heading' | 'image' | 'video' | 'divider' | 'banner' | 'cta';

export interface ContentBlock {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  visible: boolean;
  order: number;
  pageId?: PageId;
  style?: BlockStyleExtended & {
    textColor?: string;
  };
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  addedAt: string;
}

export interface AppDesignSettings {
  pushNotifications: boolean;
  emailAlerts: boolean;
  appTagline: string;
  welcomeMessage: string;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  primaryColorName: string;
  accentColorName: string;
  primaryColors: string[];
  accentColors: string[];
  headingFont: string;
  bodyFont: string;
  logoUrl: string;
}

export const DEFAULT_DESIGN: AppDesignSettings = {
  pushNotifications: true,
  emailAlerts: true,
  appTagline: 'Track your stuff, find it fast',
  welcomeMessage: 'Welcome to PutHere',
  emptyStateTitle: 'Your stash is empty',
  emptyStateSubtitle: 'Tap the + button to start tracking your stuff',
  primaryColorName: 'Warm Amber',
  accentColorName: 'Terracotta',
  primaryColors: ['#C4763B', '#D4945F', '#A45E2A', '#F0D9B5', '#FBF5EF'],
  accentColors: ['#B85C38', '#E8A87C', '#C4573B', '#E8A090', '#FFF0E8'],
  headingFont: 'System Default',
  bodyFont: 'System Default',
  logoUrl: '',
};

export type TabId = 'overview' | 'users' | 'content' | 'design' | 'preview' | 'menu-mgmt' | 'settings';

export type PreviewPageId = 'home' | 'categories' | 'menu' | 'login' | 'add-item' | 'settings';

export interface CustomMenuItem {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  targetPage: PageId;
  visible: boolean;
  order: number;
}

export interface HistorySnapshot {
  id: string;
  timestamp: string;
  label: string;
  design: AppDesignSettings;
  blocks: ContentBlock[];
}
