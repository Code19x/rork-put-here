import { PageId } from '@/components/AdminDesignToolbar';

export const COLOR_PALETTES = [
  { name: 'Warm Amber', colors: ['#C4763B', '#D4945F', '#A45E2A', '#F0D9B5', '#FBF5EF'] },
  { name: 'Terracotta', colors: ['#B85C38', '#E8A87C', '#C4573B', '#E8A090', '#FFF0E8'] },
  { name: 'Ocean Blue', colors: ['#1A73E8', '#4DA3FF', '#0D47A1', '#BBDEFB', '#E3F2FD'] },
  { name: 'Forest Green', colors: ['#2E7D32', '#66BB6A', '#1B5E20', '#C8E6C9', '#E8F5E9'] },
  { name: 'Midnight', colors: ['#1A1A2E', '#16213E', '#0F3460', '#533483', '#E94560'] },
  { name: 'Sunset', colors: ['#FF6B35', '#F7C59F', '#EF4C25', '#EFEFD0', '#1A535C'] },
  { name: 'Rose Gold', colors: ['#B76E79', '#E8C4C8', '#8E4A52', '#F5E6E8', '#FFF5F5'] },
  { name: 'Slate', colors: ['#334155', '#64748B', '#1E293B', '#CBD5E1', '#F1F5F9'] },
  { name: 'Lavender', colors: ['#7C3AED', '#A78BFA', '#5B21B6', '#DDD6FE', '#EDE9FE'] },
  { name: 'Coral Reef', colors: ['#FF6F61', '#FFB3A7', '#D94F43', '#FFE0DB', '#FFF5F3'] },
  { name: 'Mocha', colors: ['#6F4E37', '#A67B5B', '#4A3423', '#D4B896', '#F5EDE3'] },
  { name: 'Teal', colors: ['#009688', '#4DB6AC', '#00695C', '#B2DFDB', '#E0F2F1'] },
];

export const FONT_OPTIONS = [
  { name: 'System Default', family: 'System', preview: 'Aa Bb Cc' },
  { name: 'San Francisco', family: 'SF Pro Display', preview: 'Aa Bb Cc' },
  { name: 'Roboto', family: 'Roboto', preview: 'Aa Bb Cc' },
  { name: 'Inter', family: 'Inter', preview: 'Aa Bb Cc' },
  { name: 'Poppins', family: 'Poppins', preview: 'Aa Bb Cc' },
  { name: 'Montserrat', family: 'Montserrat', preview: 'Aa Bb Cc' },
  { name: 'Lato', family: 'Lato', preview: 'Aa Bb Cc' },
  { name: 'Open Sans', family: 'Open Sans', preview: 'Aa Bb Cc' },
  { name: 'Nunito', family: 'Nunito', preview: 'Aa Bb Cc' },
  { name: 'Playfair Display', family: 'Playfair Display', preview: 'Aa Bb Cc' },
  { name: 'Source Sans Pro', family: 'Source Sans Pro', preview: 'Aa Bb Cc' },
  { name: 'DM Sans', family: 'DM Sans', preview: 'Aa Bb Cc' },
];

export const AC = {
  bg: '#0F1923',
  surface: '#1A2735',
  surfaceLight: '#243447',
  card: '#1E2D3D',
  accent: '#00D4AA',
  accentDim: 'rgba(0, 212, 170, 0.12)',
  accentGlow: 'rgba(0, 212, 170, 0.25)',
  blue: '#3B82F6',
  blueDim: 'rgba(59, 130, 246, 0.12)',
  orange: '#F59E0B',
  orangeDim: 'rgba(245, 158, 11, 0.12)',
  pink: '#EC4899',
  pinkDim: 'rgba(236, 72, 153, 0.12)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139, 92, 246, 0.12)',
  red: '#EF4444',
  redDim: 'rgba(239, 68, 68, 0.12)',
  green: '#22C55E',
  greenDim: 'rgba(34, 197, 94, 0.12)',
  text: '#E8EDF2',
  textSecondary: '#8899AA',
  textMuted: '#5A6A7A',
  border: '#2A3A4A',
  divider: '#1E2E3E',
  inputBg: '#162230',
  cyan: '#06B6D4',
  cyanDim: 'rgba(6, 182, 212, 0.12)',
  yellow: '#EAB308',
  yellowDim: 'rgba(234, 179, 8, 0.12)',
};

export const CREATOR_BG_COLORS = [
  '#FFFFFF', '#F5F5F5', '#0F1923', '#1A2735', '#1E293B',
  '#FBF5EF', '#E8F5E9', '#FFF0E8', '#E3F2FD', '#EDE9FE',
  '#FFF5F5', '#F0FDF4', '#FEF3C7', '#FCE7F3', '#ECFEFF',
  '#1A1A2E', '#16213E', '#2D1B69', '#1B4332', '#7F1D1D',
];

export const CREATOR_TEXT_COLORS = [
  '#000000', '#333333', '#666666', '#FFFFFF', '#E8EDF2',
  '#C4763B', '#B85C38', '#1A73E8', '#2E7D32', '#7C3AED',
  '#EF4444', '#EC4899', '#06B6D4', '#F59E0B',
];

export const PAGE_OPTIONS: { id: PageId; name: string }[] = [
  { id: 'home', name: 'Home' },
  { id: 'categories', name: 'Categories' },
  { id: 'item-detail', name: 'Item Detail' },
  { id: 'add-item', name: 'Add Item' },
  { id: 'settings', name: 'Settings' },
  { id: 'menu', name: 'Menu' },
  { id: 'login', name: 'Login' },
];

export const MENU_ICON_OPTIONS = [
  'FileText', 'Package', 'Grid3x3', 'MapPin', 'Shield', 'Settings',
  'HelpCircle', 'Mail', 'User', 'Bell', 'Star', 'Heart',
  'Camera', 'Bookmark', 'Clock', 'Globe',
];

export const MAX_HISTORY = 30;
