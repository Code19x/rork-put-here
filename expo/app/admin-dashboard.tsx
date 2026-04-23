// v1.1
// PutHere App - Admin Dashboard
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  RefreshControl, Animated, Alert, Platform, Switch, TextInput,
  Modal, ActivityIndicator, Image as RNImage,
} from 'react-native';
import { router } from 'expo-router';
import {
  Users, Package, Grid3x3, MapPin, TrendingUp, LogOut,
  ChevronRight, Activity, Settings, FileText, BarChart3,
  Trash2, UserX, Shield, Bell, Globe, Palette, Type,
  Image as ImageIcon, Layout, PenLine, Check, X, Plus,
  Video, Link, AlignLeft, Heading, Square, ChevronDown,
  Eye, EyeOff, GripVertical, Layers,
  Camera, FolderOpen, CloudUpload, Smartphone, RotateCcw,
  Save, History, Undo2, Search, CircleDot,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAdmin, AppStats } from '@/providers/AdminProvider';
import { UserProfile } from '@/types';
import { saveToDb, loadFromDb } from '@/lib/adminDb';
import AdminDesignToolbar, { PageId, BlockStyleExtended } from '@/components/AdminDesignToolbar';
import {
  COLOR_PALETTES, FONT_OPTIONS, AC, CREATOR_BG_COLORS,
  PAGE_OPTIONS, MENU_ICON_OPTIONS, MAX_HISTORY,
} from '@/components/admin/constants';
import {
  BlockType, ContentBlock, MediaItem, AppDesignSettings, DEFAULT_DESIGN,
  TabId, PreviewPageId, CustomMenuItem, HistorySnapshot,
} from '@/components/admin/types';
import { styles } from '@/components/admin/styles';

const hapticLight = () => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
const hapticMedium = () => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); };
const hapticSuccess = () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); };

function StatCard({ label, value, icon, color, bgColor, delay }: { label: string; value: number; icon: React.ReactNode; color: string; bgColor: string; delay: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, [fadeAnim, slideAnim, delay]);
  return (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function UserRow({ user, onDelete }: { user: UserProfile; onDelete: (id: string) => void }) {
  const d = new Date(user.createdAt);
  return (
    <View style={styles.userRow}>
      <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text></View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <Text style={styles.userDate}>Joined {d.getMonth() + 1}/{d.getDate()}/{d.getFullYear()}</Text>
      </View>
      <View style={styles.userActions}>
        {user.authMethod && <View style={styles.methodBadge}><Text style={styles.methodText}>{user.authMethod}</Text></View>}
        <TouchableOpacity style={styles.deleteUserBtn} onPress={() => onDelete(user.id)} activeOpacity={0.7}><UserX color={AC.red} size={16} /></TouchableOpacity>
      </View>
    </View>
  );
}

function EditableField({ label, value, onSave, multiline }: { label: string; value: string; onSave: (v: string) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <View style={styles.editableFieldWrap}>
        <Text style={styles.editableLabel}>{label}</Text>
        <View style={styles.editInputRow}>
          <TextInput style={[styles.editInput, multiline && styles.editInputMulti]} value={draft} onChangeText={setDraft} multiline={multiline} placeholderTextColor={AC.textMuted} autoFocus />
          <TouchableOpacity style={styles.editActionBtn} onPress={() => { onSave(draft.trim()); setEditing(false); hapticLight(); }} activeOpacity={0.7}><Check color={AC.accent} size={16} /></TouchableOpacity>
          <TouchableOpacity style={styles.editCancelBtn} onPress={() => { setDraft(value); setEditing(false); }} activeOpacity={0.7}><X color={AC.red} size={16} /></TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.editableFieldWrap} onPress={() => setEditing(true)} activeOpacity={0.7}>
      <Text style={styles.editableLabel}>{label}</Text>
      <View style={styles.editableValueRow}>
        <Text style={styles.editableValue} numberOfLines={2}>{value || '(not set)'}</Text>
        <PenLine color={AC.textMuted} size={14} />
      </View>
    </TouchableOpacity>
  );
}

function ColorPalettePicker({ selected, onSelect }: { selected: string; onSelect: (n: string, c: string[]) => void }) {
  return (
    <View style={styles.palettesGrid}>
      {COLOR_PALETTES.map(p => (
        <TouchableOpacity key={p.name} style={[styles.paletteItem, p.name === selected && styles.paletteItemSelected]} onPress={() => { onSelect(p.name, p.colors); hapticLight(); }} activeOpacity={0.7}>
          <View style={styles.paletteSwatches}>{p.colors.map((c, i) => <View key={i} style={[styles.paletteSwatch, { backgroundColor: c }]} />)}</View>
          <Text style={[styles.paletteName, p.name === selected && styles.paletteNameSelected]}>{p.name}</Text>
          {p.name === selected && <View style={styles.paletteCheck}><Check color={AC.accent} size={12} /></View>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function FontPicker({ selected, onSelect, label }: { selected: string; onSelect: (n: string) => void; label: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.fontPickerWrap}>
      <Text style={styles.editableLabel}>{label}</Text>
      <TouchableOpacity style={styles.fontPickerBtn} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Type color={AC.textSecondary} size={16} />
        <Text style={styles.fontPickerValue}>{selected}</Text>
        <ChevronDown color={AC.textMuted} size={16} style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined} />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.fontDropdown}>
          {FONT_OPTIONS.map(f => (
            <TouchableOpacity key={f.name} style={[styles.fontOption, f.name === selected && styles.fontOptionSelected]} onPress={() => { onSelect(f.name); setExpanded(false); hapticLight(); }} activeOpacity={0.7}>
              <View style={styles.fontOptionLeft}>
                <Text style={[styles.fontOptionName, f.name === selected && styles.fontOptionNameSelected]}>{f.name}</Text>
                <Text style={styles.fontOptionPreview}>{f.preview}</Text>
              </View>
              {f.name === selected && <Check color={AC.accent} size={14} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'heading', label: 'Heading', icon: <Heading color={AC.blue} size={20} />, desc: 'Large title text' },
  { type: 'text', label: 'Text Block', icon: <AlignLeft color={AC.accent} size={20} />, desc: 'Paragraph content' },
  { type: 'image', label: 'Image', icon: <ImageIcon color={AC.orange} size={20} />, desc: 'Image from URL' },
  { type: 'video', label: 'Video', icon: <Video color={AC.pink} size={20} />, desc: 'Video embed' },
  { type: 'banner', label: 'Banner', icon: <Layout color={AC.purple} size={20} />, desc: 'Hero banner section' },
  { type: 'cta', label: 'Call to Action', icon: <Link color={AC.cyan} size={20} />, desc: 'Button with link' },
  { type: 'divider', label: 'Divider', icon: <Square color={AC.textMuted} size={20} />, desc: 'Visual separator' },
];

const getBlockIcon = (type: BlockType) => {
  const map: Record<string, React.ReactNode> = {
    heading: <Heading color={AC.blue} size={16} />, text: <AlignLeft color={AC.accent} size={16} />,
    image: <ImageIcon color={AC.orange} size={16} />, video: <Video color={AC.pink} size={16} />,
    banner: <Layout color={AC.purple} size={16} />, cta: <Link color={AC.cyan} size={16} />,
    divider: <Square color={AC.textMuted} size={16} />,
  };
  return map[type] ?? <FileText color={AC.textSecondary} size={16} />;
};

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { adminSession, adminSignOut, fetchStats, fetchUsers, deleteUser, clearAllItems } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<AppStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [design, setDesign] = useState<AppDesignSettings>(DEFAULT_DESIGN);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showBlockCreator, setShowBlockCreator] = useState(false);
  const [newBlockType, setNewBlockType] = useState<BlockType | null>(null);
  const [newBlockPage, setNewBlockPage] = useState<PageId>('home');
  const [newBlockBgType, setNewBlockBgType] = useState<'transparent' | 'solid' | 'image'>('transparent');
  const [newBlockBgColor, setNewBlockBgColor] = useState('');
  const [newBlockBgImage, setNewBlockBgImage] = useState('');
  const [creatorStep, setCreatorStep] = useState<'type' | 'page' | 'style'>('type');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageId>('home');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [dbSyncing, setDbSyncing] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedDesign, setLastSavedDesign] = useState<AppDesignSettings>(DEFAULT_DESIGN);
  const [lastSavedBlocks, setLastSavedBlocks] = useState<ContentBlock[]>([]);
  const [previewPage, setPreviewPage] = useState<PreviewPageId>('home');
  const [customMenuItems, setCustomMenuItems] = useState<CustomMenuItem[]>([]);
  const [showAddMenuItemModal, setShowAddMenuItemModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<CustomMenuItem | null>(null);
  const [newMenuLabel, setNewMenuLabel] = useState('');
  const [newMenuSublabel, setNewMenuSublabel] = useState('');
  const [newMenuIcon, setNewMenuIcon] = useState('FileText');
  const [newMenuTargetPage, setNewMenuTargetPage] = useState<PageId>('home');

  const pushHistory = useCallback((label: string, d: AppDesignSettings, b: ContentBlock[]) => {
    setHistory(prev => [{ id: Date.now().toString(), timestamp: new Date().toISOString(), label, design: JSON.parse(JSON.stringify(d)), blocks: JSON.parse(JSON.stringify(b)) }, ...prev.slice(0, MAX_HISTORY - 1)]);
    setHasUnsavedChanges(true);
  }, []);

  const loadDesign = useCallback(async () => { try { const d = await loadFromDb<AppDesignSettings>('design', DEFAULT_DESIGN); const m = { ...DEFAULT_DESIGN, ...d }; setDesign(m); setLastSavedDesign(m); } catch (e) { console.log('Load design error:', e); } }, []);
  const saveDesign = useCallback(async (u: AppDesignSettings) => { try { setDesign(u); setDbSyncing(true); await saveToDb('design', u); } catch (e) { console.log('Save design error:', e); } finally { setDbSyncing(false); } }, []);
  const loadBlocks = useCallback(async () => { try { const d = await loadFromDb<ContentBlock[]>('blocks', []); setBlocks(d); setLastSavedBlocks(d); } catch (e) { console.log('Load blocks error:', e); } }, []);
  const saveBlocks = useCallback(async (u: ContentBlock[]) => { try { setBlocks(u); setDbSyncing(true); await saveToDb('blocks', u); } catch (e) { console.log('Save blocks error:', e); } finally { setDbSyncing(false); } }, []);
  const loadMedia = useCallback(async () => { try { const d = await loadFromDb<MediaItem[]>('media', []); setMediaItems(d); } catch (e) { console.log('Load media error:', e); } }, []);
  const saveMedia = useCallback(async (u: MediaItem[]) => { try { setMediaItems(u); setDbSyncing(true); await saveToDb('media', u); } catch (e) { console.log('Save media error:', e); } finally { setDbSyncing(false); } }, []);
  const loadHistory = useCallback(async () => { try { const d = await loadFromDb<HistorySnapshot[]>('settings', []); if (Array.isArray(d)) setHistory(d); } catch (e) { console.log('Load history error:', e); } }, []);
  const saveHistory = useCallback(async (s: HistorySnapshot[]) => { try { await saveToDb('settings', s); } catch (e) { console.log('Save history error:', e); } }, []);
  const loadCustomMenuItems = useCallback(async () => { try { const d = await loadFromDb<CustomMenuItem[]>('customMenuItems', []); setCustomMenuItems(d); } catch (e) { console.log('Load menu items error:', e); } }, []);
  const saveCustomMenuItems = useCallback(async (u: CustomMenuItem[]) => { try { setCustomMenuItems(u); setDbSyncing(true); await saveToDb('customMenuItems', u); } catch (e) { console.log('Save menu items error:', e); } finally { setDbSyncing(false); } }, []);

  const pickImage = useCallback(async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant photo library access.'); return null; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      return !r.canceled && r.assets[0] ? r.assets[0].uri : null;
    } catch { return null; }
  }, []);

  const pickVideo = useCallback(async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant photo library access.'); return null; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: true, quality: 0.7, videoMaxDuration: 60 });
      return !r.canceled && r.assets[0] ? r.assets[0].uri : null;
    } catch { return null; }
  }, []);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant camera access.'); return null; }
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      return !r.canceled && r.assets[0] ? r.assets[0].uri : null;
    } catch { return null; }
  }, []);

  const handleUploadMedia = useCallback(async (mt: 'image' | 'video', src: 'gallery' | 'camera') => {
    setUploadingMedia(true);
    try {
      let uri: string | null = null;
      if (mt === 'image' && src === 'camera') uri = await takePhoto();
      else if (mt === 'image') uri = await pickImage();
      else uri = await pickVideo();
      if (uri) {
        await saveMedia([...mediaItems, { id: Date.now().toString(), type: mt, url: uri, name: `${mt}_${Date.now()}`, addedAt: new Date().toISOString() }]);
        hapticSuccess();
        Alert.alert('Success', `${mt === 'image' ? 'Image' : 'Video'} uploaded!`);
      }
    } catch { Alert.alert('Error', 'Failed to upload media.'); } finally { setUploadingMedia(false); }
  }, [mediaItems, saveMedia, takePhoto, pickImage, pickVideo]);

  const loadData = useCallback(async () => {
    const [s, u] = await Promise.all([fetchStats(), fetchUsers()]);
    setStats(s); setUsers(u);
  }, [fetchStats, fetchUsers]);

  useEffect(() => { void loadData(); void loadDesign(); void loadBlocks(); void loadMedia(); void loadHistory(); void loadCustomMenuItems(); }, [loadData, loadDesign, loadBlocks, loadMedia, loadHistory, loadCustomMenuItems]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await Promise.all([loadData(), loadDesign(), loadBlocks(), loadMedia(), loadCustomMenuItems()]); setRefreshing(false); }, [loadData, loadDesign, loadBlocks, loadMedia, loadCustomMenuItems]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Exit admin panel?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: async () => { await adminSignOut(); router.replace('/admin-login' as never); } }]);
  }, [adminSignOut]);

  const handleDeleteUser = useCallback((userId: string) => {
    const u = users.find(x => x.id === userId);
    Alert.alert('Delete User', `Remove "${u?.name ?? 'this user'}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (await deleteUser(userId)) { setUsers(prev => prev.filter(x => x.id !== userId)); hapticSuccess(); } } }]);
  }, [users, deleteUser]);

  const handleClearItems = useCallback(() => {
    Alert.alert('Clear All Items', 'Delete all stash items?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear All', style: 'destructive', onPress: async () => { if (await clearAllItems()) { await loadData(); hapticSuccess(); Alert.alert('Done', 'All items cleared.'); } } }]);
  }, [clearAllItems, loadData]);

  const updateDesignField = useCallback((field: keyof AppDesignSettings, value: string | boolean | string[]) => {
    const u = { ...design, [field]: value }; setDesign(u); setHasUnsavedChanges(true); pushHistory(`Changed ${String(field)}`, u, blocks);
  }, [design, blocks, pushHistory]);

  const handleSaveAll = useCallback(async () => {
    try {
      setDbSyncing(true); await saveDesign(design); await saveBlocks(blocks); await saveHistory(history);
      setLastSavedDesign(JSON.parse(JSON.stringify(design))); setLastSavedBlocks(JSON.parse(JSON.stringify(blocks)));
      setHasUnsavedChanges(false); hapticSuccess(); Alert.alert('Saved', 'All changes saved.');
    } catch { Alert.alert('Error', 'Failed to save.'); } finally { setDbSyncing(false); }
  }, [design, blocks, history, saveDesign, saveBlocks, saveHistory]);

  const handleRevertToLastSave = useCallback(() => {
    Alert.alert('Revert Changes', 'Discard unsaved changes?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revert', style: 'destructive', onPress: () => { setDesign(JSON.parse(JSON.stringify(lastSavedDesign))); setBlocks(JSON.parse(JSON.stringify(lastSavedBlocks))); setHasUnsavedChanges(false); } }]);
  }, [lastSavedDesign, lastSavedBlocks]);

  const handleUndoLast = useCallback(() => {
    if (history.length < 2) { handleRevertToLastSave(); return; }
    const prev = history[1];
    if (prev) { setDesign(JSON.parse(JSON.stringify(prev.design))); setBlocks(JSON.parse(JSON.stringify(prev.blocks))); setHistory(h => h.slice(1)); setHasUnsavedChanges(true); hapticLight(); }
  }, [history, handleRevertToLastSave]);

  const handleRestoreSnapshot = useCallback((snap: HistorySnapshot) => {
    Alert.alert('Restore Snapshot', `Restore "${snap.label}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => { setDesign(JSON.parse(JSON.stringify(snap.design))); setBlocks(JSON.parse(JSON.stringify(snap.blocks))); setHasUnsavedChanges(true); setShowHistoryModal(false); hapticLight(); } }]);
  }, []);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) ?? null;
  const handleToolbarStyleChange = useCallback((ns: BlockStyleExtended) => {
    if (!selectedBlockId) return;
    setBlocks(prev => prev.map(b => b.id === selectedBlockId ? { ...b, style: { ...b.style, ...ns } } : b));
    setHasUnsavedChanges(true);
  }, [selectedBlockId]);

  const filteredBlocks = blocks.filter(b => (b.pageId ?? 'home') === selectedPage);

  const resetCreator = useCallback(() => {
    setNewBlockType(null); setNewBlockPage(selectedPage); setNewBlockBgType('transparent');
    setNewBlockBgColor(''); setNewBlockBgImage(''); setCreatorStep('type'); setShowBlockCreator(false);
  }, [selectedPage]);

  const finalizeNewBlock = useCallback(() => {
    if (!newBlockType) return;
    const nb: ContentBlock = {
      id: Date.now().toString(), type: newBlockType, title: newBlockType === 'divider' ? 'Divider' : '', content: '', visible: true, order: blocks.length, pageId: newBlockPage,
      style: { bgColor: newBlockBgType === 'solid' ? newBlockBgColor : '', textColor: '', font: '', fontSize: newBlockType === 'heading' ? 24 : 16, alignment: 'left', borderStyle: 'solid', borderWidth: 0, borderRadius: 10, borderColor: '', paddingTop: 10, paddingRight: 10, paddingBottom: 10, paddingLeft: 10, backgroundImage: newBlockBgType === 'image' ? newBlockBgImage : '', animation: 'none', opacity: 1 },
    };
    setEditingBlock(nb); resetCreator(); hapticSuccess();
  }, [newBlockType, newBlockPage, newBlockBgType, newBlockBgColor, newBlockBgImage, blocks.length, resetCreator]);

  const saveBlock = useCallback((block: ContentBlock) => {
    const exists = blocks.find(b => b.id === block.id);
    const updated = exists ? blocks.map(b => b.id === block.id ? block : b) : [...blocks, block];
    setBlocks(updated); setHasUnsavedChanges(true);
    pushHistory(exists ? `Edited: ${block.title || block.type}` : `Added: ${block.title || block.type}`, design, updated);
    setEditingBlock(null); hapticSuccess();
  }, [blocks, design, pushHistory]);

  const deleteBlock = useCallback((id: string) => {
    Alert.alert('Delete Block', 'Remove this block?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { const updated = blocks.filter(b => b.id !== id); setBlocks(updated); setHasUnsavedChanges(true); pushHistory('Deleted block', design, updated); } }]);
  }, [blocks, design, pushHistory]);

  const toggleBlockVisibility = useCallback((id: string) => { setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b)); setHasUnsavedChanges(true); hapticLight(); }, []);
  const duplicateBlock = useCallback((block: ContentBlock) => { const updated = [...blocks, { ...block, id: Date.now().toString(), title: block.title + ' (copy)', order: blocks.length }]; setBlocks(updated); setHasUnsavedChanges(true); pushHistory(`Duplicated: ${block.title || block.type}`, design, updated); hapticLight(); }, [blocks, design, pushHistory]);
  const moveBlock = useCallback((id: string, dir: 'up' | 'down') => { const idx = blocks.findIndex(b => b.id === id); if ((dir === 'up' && idx <= 0) || (dir === 'down' && idx >= blocks.length - 1)) return; const u = [...blocks]; const si = dir === 'up' ? idx - 1 : idx + 1; [u[idx], u[si]] = [u[si], u[idx]]; u.forEach((b, i) => { b.order = i; }); setBlocks(u); setHasUnsavedChanges(true); }, [blocks]);

  const handleAddMenuItem = useCallback(() => {
    if (!newMenuLabel.trim()) { Alert.alert('Error', 'Enter a label.'); return; }
    const item: CustomMenuItem = { id: editingMenuItem?.id || Date.now().toString(), label: newMenuLabel.trim(), sublabel: newMenuSublabel.trim(), icon: newMenuIcon, targetPage: newMenuTargetPage, visible: true, order: editingMenuItem ? editingMenuItem.order : customMenuItems.length };
    void saveCustomMenuItems(editingMenuItem ? customMenuItems.map(m => m.id === editingMenuItem.id ? item : m) : [...customMenuItems, item]);
    setNewMenuLabel(''); setNewMenuSublabel(''); setNewMenuIcon('FileText'); setNewMenuTargetPage('home'); setEditingMenuItem(null); setShowAddMenuItemModal(false); hapticSuccess();
  }, [newMenuLabel, newMenuSublabel, newMenuIcon, newMenuTargetPage, editingMenuItem, customMenuItems, saveCustomMenuItems]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Stats', icon: <BarChart3 color={activeTab === 'overview' ? AC.accent : AC.textMuted} size={18} /> },
    { id: 'users', label: 'Users', icon: <Users color={activeTab === 'users' ? AC.accent : AC.textMuted} size={18} /> },
    { id: 'content', label: 'Blocks', icon: <Layers color={activeTab === 'content' ? AC.accent : AC.textMuted} size={18} /> },
    { id: 'design', label: 'Design', icon: <Palette color={activeTab === 'design' ? AC.accent : AC.textMuted} size={18} /> },
    { id: 'preview', label: 'Preview', icon: <Smartphone color={activeTab === 'preview' ? AC.accent : AC.textMuted} size={18} /> },
    { id: 'menu-mgmt', label: 'Menu', icon: <Grid3x3 color={activeTab === 'menu-mgmt' ? AC.accent : AC.textMuted} size={18} /> },
    { id: 'settings', label: 'Config', icon: <Settings color={activeTab === 'settings' ? AC.accent : AC.textMuted} size={18} /> },
  ];

  const renderOverview = () => (
    <>
      <View style={styles.statsGrid}>
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={<Users color={AC.blue} size={22} />} color={AC.blue} bgColor={AC.blueDim} delay={0} />
        <StatCard label="Total Items" value={stats?.totalItems ?? 0} icon={<Package color={AC.accent} size={22} />} color={AC.accent} bgColor={AC.accentDim} delay={80} />
        <StatCard label="Categories" value={stats?.totalCategories ?? 0} icon={<Grid3x3 color={AC.orange} size={22} />} color={AC.orange} bgColor={AC.orangeDim} delay={160} />
        <StatCard label="Locations" value={stats?.totalLocations ?? 0} icon={<MapPin color={AC.pink} size={22} />} color={AC.pink} bgColor={AC.pinkDim} delay={240} />
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Activity color={AC.accent} size={18} /><Text style={styles.sectionTitle}>Activity</Text></View>
        {[['Active today', stats?.activeToday ?? 0], ['New this week', stats?.newUsersThisWeek ?? 0], ['Items/user', stats && stats.totalUsers > 0 ? (stats.totalItems / stats.totalUsers).toFixed(1) : '0'], ['Blocks', blocks.length], ['Media', mediaItems.length]].map(([l, v], i) => (
          <React.Fragment key={i}>{i > 0 && <View style={styles.activityDivider} />}<View style={styles.activityRow}><Text style={styles.activityLabel}>{l}</Text><Text style={styles.activityValue}>{v}</Text></View></React.Fragment>
        ))}
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><TrendingUp color={AC.blue} size={18} /><Text style={styles.sectionTitle}>Quick Actions</Text></View>
        {[['content', 'Manage Blocks', <Layers key="l" color={AC.textSecondary} size={18} />], ['design', 'Edit Design', <Palette key="p" color={AC.textSecondary} size={18} />], ['users', 'Manage Users', <Users key="u" color={AC.textSecondary} size={18} />]].map(([tab, text, icon], i) => (
          <React.Fragment key={i}>{i > 0 && <View style={styles.activityDivider} />}<TouchableOpacity style={styles.actionRow} onPress={() => setActiveTab(tab as TabId)} activeOpacity={0.7}>{icon}<Text style={styles.actionText}>{text}</Text><ChevronRight color={AC.textMuted} size={16} /></TouchableOpacity></React.Fragment>
        ))}
      </View>
    </>
  );

  const renderUsers = () => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}><Users color={AC.blue} size={18} /><Text style={styles.sectionTitle}>Users ({users.length})</Text></View>
      {users.length === 0 ? <View style={styles.emptyState}><Users color={AC.textMuted} size={36} /><Text style={styles.emptyText}>No users yet</Text></View> : users.map((u, i) => <React.Fragment key={u.id}>{i > 0 && <View style={styles.activityDivider} />}<UserRow user={u} onDelete={handleDeleteUser} /></React.Fragment>)}
    </View>
  );

  const renderDesign = () => (
    <>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Type color={AC.blue} size={18} /><Text style={styles.sectionTitle}>App Text</Text></View>
        <EditableField label="Tagline" value={design.appTagline} onSave={v => updateDesignField('appTagline', v)} />
        <View style={styles.activityDivider} />
        <EditableField label="Welcome" value={design.welcomeMessage} onSave={v => updateDesignField('welcomeMessage', v)} />
        <View style={styles.activityDivider} />
        <EditableField label="Empty Title" value={design.emptyStateTitle} onSave={v => updateDesignField('emptyStateTitle', v)} />
        <View style={styles.activityDivider} />
        <EditableField label="Empty Subtitle" value={design.emptyStateSubtitle} onSave={v => updateDesignField('emptyStateSubtitle', v)} multiline />
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Palette color={AC.purple} size={18} /><Text style={styles.sectionTitle}>Primary Colors</Text></View>
        <View style={styles.paletteSection}>
          <View style={styles.currentPaletteRow}>
            <Text style={styles.currentPaletteLabel}>Current:</Text>
            <View style={styles.currentSwatches}>{design.primaryColors.map((c, i) => <View key={i} style={[styles.currentSwatch, { backgroundColor: c }]} />)}</View>
            <Text style={styles.currentPaletteName}>{design.primaryColorName}</Text>
          </View>
          <ColorPalettePicker selected={design.primaryColorName} onSelect={(n, c) => void saveDesign({ ...design, primaryColorName: n, primaryColors: c })} />
        </View>
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Palette color={AC.orange} size={18} /><Text style={styles.sectionTitle}>Accent Colors</Text></View>
        <View style={styles.paletteSection}>
          <View style={styles.currentPaletteRow}>
            <Text style={styles.currentPaletteLabel}>Current:</Text>
            <View style={styles.currentSwatches}>{design.accentColors.map((c, i) => <View key={i} style={[styles.currentSwatch, { backgroundColor: c }]} />)}</View>
            <Text style={styles.currentPaletteName}>{design.accentColorName}</Text>
          </View>
          <ColorPalettePicker selected={design.accentColorName} onSelect={(n, c) => void saveDesign({ ...design, accentColorName: n, accentColors: c })} />
        </View>
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Type color={AC.cyan} size={18} /><Text style={styles.sectionTitle}>Typography</Text></View>
        <FontPicker label="Heading Font" selected={design.headingFont} onSelect={n => updateDesignField('headingFont', n)} />
        <View style={styles.activityDivider} />
        <FontPicker label="Body Font" selected={design.bodyFont} onSelect={n => updateDesignField('bodyFont', n)} />
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><ImageIcon color={AC.blue} size={18} /><Text style={styles.sectionTitle}>Branding</Text></View>
        <EditableField label="Logo URL" value={design.logoUrl} onSave={v => updateDesignField('logoUrl', v)} />
      </View>
    </>
  );

  const renderSettings = () => (
    <>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Globe color={AC.purple} size={18} /><Text style={styles.sectionTitle}>App Config</Text></View>
        {[['App Name', 'PutHere'], ['Domain', 'puthereapp.com'], ['Support', 'support@puthereapp.com'], ['Version', '1.0.0']].map(([l, v], i) => (
          <React.Fragment key={i}>{i > 0 && <View style={styles.activityDivider} />}<View style={styles.settingRow}><Text style={styles.settingLabel}>{l}</Text><Text style={styles.settingValue}>{v}</Text></View></React.Fragment>
        ))}
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Bell color={AC.orange} size={18} /><Text style={styles.sectionTitle}>Notifications</Text></View>
        <View style={styles.settingRow}><Text style={styles.settingLabel}>Push</Text><Switch value={design.pushNotifications} onValueChange={v => updateDesignField('pushNotifications', v)} trackColor={{ false: AC.surfaceLight, true: AC.accentDim }} thumbColor={design.pushNotifications ? AC.accent : AC.textMuted} /></View>
        <View style={styles.activityDivider} />
        <View style={styles.settingRow}><Text style={styles.settingLabel}>Email</Text><Switch value={design.emailAlerts} onValueChange={v => updateDesignField('emailAlerts', v)} trackColor={{ false: AC.surfaceLight, true: AC.accentDim }} thumbColor={design.emailAlerts ? AC.accent : AC.textMuted} /></View>
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Shield color={AC.accent} size={18} /><Text style={styles.sectionTitle}>Security</Text></View>
        <View style={styles.settingRow}><Text style={styles.settingLabel}>Session</Text><Text style={styles.settingValue}>{adminSession ? new Date(adminSession.loginAt).toLocaleString() : 'N/A'}</Text></View>
        <View style={styles.activityDivider} />
        <View style={styles.settingRow}><Text style={styles.settingLabel}>PIN Lock</Text><View style={styles.statusBadge}><Text style={styles.statusText}>Available</Text></View></View>
      </View>
    </>
  );

  const renderContent = () => (
    <>
      <AdminDesignToolbar selectedPage={selectedPage} onPageChange={setSelectedPage} blockStyle={selectedBlock?.style ?? {}} onStyleChange={handleToolbarStyleChange} hasSelectedBlock={!!selectedBlockId} />
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Layers color={AC.accent} size={18} /><Text style={styles.sectionTitle}>Blocks — {selectedPage} ({filteredBlocks.length})</Text></View>
        <TouchableOpacity style={styles.addBlockBtn} onPress={() => { setNewBlockPage(selectedPage); setCreatorStep('type'); setNewBlockType(null); setShowBlockCreator(true); hapticMedium(); }} activeOpacity={0.7}><Plus color={AC.accent} size={18} /><Text style={styles.addBlockBtnText}>Add Block</Text></TouchableOpacity>
      </View>
      {showBlockCreator && renderBlockCreator()}
      {filteredBlocks.length === 0 && !showBlockCreator ? (
        <View style={styles.sectionCard}><View style={styles.emptyState}><Layers color={AC.textMuted} size={40} /><Text style={styles.emptyText}>No blocks on this page</Text></View></View>
      ) : filteredBlocks.map((block, idx) => {
        const isSel = selectedBlockId === block.id;
        return (
          <TouchableOpacity key={block.id} style={[styles.sectionCard, !block.visible && styles.blockHidden, isSel && styles.blockSelected]} onPress={() => { setSelectedBlockId(isSel ? null : block.id); hapticLight(); }} activeOpacity={0.8}>
            <View style={styles.blockHeader}>
              <View style={styles.blockHeaderLeft}>
                <View style={[styles.blockTypeIcon, { backgroundColor: isSel ? AC.accentDim : AC.surfaceLight }]}>{getBlockIcon(block.type)}</View>
                <View style={styles.blockHeaderInfo}>
                  <Text style={styles.blockTitle} numberOfLines={1}>{block.title || `Untitled ${block.type}`}</Text>
                  <View style={styles.blockMetaRow}><Text style={styles.blockType}>{block.type.toUpperCase()}</Text>{isSel && <Text style={styles.blockSelectedLabel}>SELECTED</Text>}</View>
                </View>
              </View>
              <View style={styles.blockActions}>
                <TouchableOpacity style={styles.blockActionBtn} onPress={() => toggleBlockVisibility(block.id)} activeOpacity={0.7}>{block.visible ? <Eye color={AC.accent} size={14} /> : <EyeOff color={AC.textMuted} size={14} />}</TouchableOpacity>
                <TouchableOpacity style={styles.blockActionBtn} onPress={() => moveBlock(block.id, 'up')} activeOpacity={0.7} disabled={idx === 0}><GripVertical color={idx === 0 ? AC.surfaceLight : AC.textSecondary} size={14} /></TouchableOpacity>
              </View>
            </View>
            {block.content ? <View style={styles.blockPreview}><Text style={styles.blockPreviewText} numberOfLines={2}>{block.content}</Text></View> : null}
            <View style={styles.blockFooter}>
              <TouchableOpacity style={styles.blockFooterBtn} onPress={() => setEditingBlock(block)} activeOpacity={0.7}><PenLine color={AC.blue} size={13} /><Text style={[styles.blockFooterBtnText, { color: AC.blue }]}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.blockFooterBtn} onPress={() => duplicateBlock(block)} activeOpacity={0.7}><Layers color={AC.purple} size={13} /><Text style={[styles.blockFooterBtnText, { color: AC.purple }]}>Copy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.blockFooterBtn} onPress={() => deleteBlock(block.id)} activeOpacity={0.7}><Trash2 color={AC.red} size={13} /><Text style={[styles.blockFooterBtnText, { color: AC.red }]}>Delete</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><ImageIcon color={AC.orange} size={18} /><Text style={styles.sectionTitle}>Media ({mediaItems.length})</Text></View>
        <TouchableOpacity style={styles.addBlockBtn} onPress={() => setShowMediaModal(true)} activeOpacity={0.7}><Plus color={AC.orange} size={18} /><Text style={[styles.addBlockBtnText, { color: AC.orange }]}>Add Media</Text></TouchableOpacity>
        {mediaItems.map((item, i) => (
          <React.Fragment key={item.id}>{i > 0 && <View style={styles.activityDivider} />}
            <View style={styles.mediaRow}>
              {item.type === 'image' ? <RNImage source={{ uri: item.url }} style={styles.mediaThumbnail} /> : <View style={[styles.mediaTypeIcon, { backgroundColor: AC.pinkDim }]}><Video color={AC.pink} size={16} /></View>}
              <View style={styles.mediaInfo}><Text style={styles.mediaName} numberOfLines={1}>{item.name}</Text><Text style={styles.mediaUrl} numberOfLines={1}>{item.url.startsWith('file://') ? 'Local' : item.url}</Text></View>
              <TouchableOpacity style={styles.deleteUserBtn} onPress={() => Alert.alert('Delete?', 'Remove?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void saveMedia(mediaItems.filter(m => m.id !== item.id)) }])} activeOpacity={0.7}><Trash2 color={AC.red} size={14} /></TouchableOpacity>
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Trash2 color={AC.red} size={18} /><Text style={styles.sectionTitle}>Danger Zone</Text></View>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearItems} activeOpacity={0.7}><Trash2 color={AC.red} size={18} /><Text style={styles.dangerBtnText}>Clear All Items</Text></TouchableOpacity>
      </View>
    </>
  );

  const renderPreview = () => {
    const pc = design.primaryColors[0] || '#C4763B';
    const bgL = design.primaryColors[4] || '#FBF5EF';
    const cc = '#FFFFFF'; const tc = '#3D2C1E'; const tsc = '#7A6555'; const tmc = '#A89585'; const cbc = '#EDE0D4';
    const PAGES: { id: PreviewPageId; label: string }[] = [{ id: 'home', label: 'Home' }, { id: 'categories', label: 'Categories' }, { id: 'menu', label: 'Menu' }, { id: 'add-item', label: 'Add Item' }, { id: 'settings', label: 'Settings' }, { id: 'login', label: 'Login' }];
    return (
      <>
        <View style={styles.previewActionBar}>
          <TouchableOpacity style={[styles.previewActionBtn, !hasUnsavedChanges && styles.previewActionBtnDisabled]} onPress={handleUndoLast} activeOpacity={0.7} disabled={!hasUnsavedChanges && history.length === 0}>
            <Undo2 color={hasUnsavedChanges || history.length > 0 ? AC.blue : AC.textMuted} size={16} /><Text style={[styles.previewActionBtnText, { color: hasUnsavedChanges || history.length > 0 ? AC.blue : AC.textMuted }]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.previewSaveBtn, !hasUnsavedChanges && styles.previewSaveBtnDisabled]} onPress={handleSaveAll} activeOpacity={0.7} disabled={!hasUnsavedChanges}>
            {dbSyncing ? <ActivityIndicator color="#FFF" size="small" /> : <><Save color={hasUnsavedChanges ? '#FFF' : AC.textMuted} size={16} /><Text style={[styles.previewSaveBtnText, !hasUnsavedChanges && { color: AC.textMuted }]}>Save</Text></>}
          </TouchableOpacity>
        </View>
        <View style={styles.pvPageSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
            {PAGES.map(pg => <TouchableOpacity key={pg.id} style={[styles.pvPageChip, previewPage === pg.id && styles.pvPageChipActive]} onPress={() => { setPreviewPage(pg.id); hapticLight(); }} activeOpacity={0.7}><Text style={[styles.pvPageChipText, previewPage === pg.id && styles.pvPageChipTextActive]}>{pg.label}</Text></TouchableOpacity>)}
          </ScrollView>
        </View>
        {hasUnsavedChanges && <View style={styles.unsavedBanner}><View style={styles.unsavedDot} /><Text style={styles.unsavedText}>Unsaved changes</Text></View>}
        <View style={styles.phoneFrame}>
          <View style={[styles.phoneStatusBar, { backgroundColor: bgL }]}><Text style={[styles.phoneStatusTime, { color: tc }]}>9:41</Text><View style={styles.phoneStatusIcons}><View style={[styles.phoneSignalDot, { backgroundColor: tmc }]} /><View style={[styles.phoneSignalDot, { backgroundColor: tmc }]} /><View style={[styles.phoneSignalDot, { backgroundColor: tmc }]} /></View></View>
          {previewPage === 'home' ? (
            <>
              <View style={[styles.phoneHeader, { backgroundColor: bgL }]}><Text style={[styles.phoneHeaderTitle, { color: tc }]}>{design.welcomeMessage || 'Welcome'}</Text><Text style={[styles.phoneHeaderSub, { color: tsc }]}>{design.appTagline || 'Track your stuff'}</Text></View>
              <View style={[styles.phoneSearchBar, { backgroundColor: bgL }]}><View style={[styles.phoneSearchInner, { backgroundColor: cc, borderColor: cbc }]}><Search color={pc} size={14} /><Text style={[styles.phoneSearchText, { color: tmc }]}>Search...</Text></View></View>
              <ScrollView style={[styles.phoneBody, { backgroundColor: bgL }]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {[1, 2, 3].map(i => <View key={i} style={{ backgroundColor: cc, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: cbc, flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: bgL, justifyContent: 'center', alignItems: 'center' }}><Package color={pc} size={20} /></View><View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '600' as const, color: tc }}>Item {i}</Text><Text style={{ fontSize: 11, color: tsc, marginTop: 1 }}>Category</Text></View><ChevronRight color={tmc} size={16} /></View>)}
                <View style={{ height: 60 }} />
              </ScrollView>
            </>
          ) : previewPage === 'login' ? (
            <View style={[styles.phoneBody, { backgroundColor: bgL, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }]}>
              <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: pc + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}><Package color={pc} size={28} /></View>
              <Text style={{ fontSize: 18, fontWeight: '800' as const, color: tc, marginBottom: 4 }}>PutHere</Text>
              <Text style={{ fontSize: 11, color: tsc, marginBottom: 20, textAlign: 'center' }}>{design.appTagline}</Text>
              {['Email', 'Password'].map(f => <View key={f} style={{ width: '100%', backgroundColor: cc, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: cbc, marginBottom: 8 }}><Text style={{ fontSize: 11, color: tmc }}>{f}</Text></View>)}
              <View style={{ width: '100%', borderRadius: 12, backgroundColor: pc, paddingVertical: 11, alignItems: 'center', marginTop: 4 }}><Text style={{ fontSize: 13, fontWeight: '700' as const, color: '#FFF' }}>Sign In</Text></View>
            </View>
          ) : (
            <><View style={[styles.phoneHeader, { backgroundColor: bgL }]}><Text style={[styles.phoneHeaderTitle, { color: tc }]}>{previewPage.charAt(0).toUpperCase() + previewPage.slice(1).replace('-', ' ')}</Text></View><View style={[styles.phoneBody, { backgroundColor: bgL }]}><View style={{ backgroundColor: cc, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: cbc, alignItems: 'center' }}><Text style={{ fontSize: 13, color: tsc }}>Preview: {previewPage}</Text></View></View></>
          )}
          {previewPage !== 'login' && (
            <View style={[styles.phoneTabBar, { borderTopColor: cbc, backgroundColor: cc }]}>
              <View style={styles.phoneTabItem}><Package color={previewPage === 'home' ? pc : tmc} size={16} /><Text style={[styles.phoneTabLabel, { color: previewPage === 'home' ? pc : tmc }]}>My Stash</Text></View>
              <View style={styles.phoneTabItem}><Grid3x3 color={previewPage === 'categories' ? pc : tmc} size={16} /><Text style={[styles.phoneTabLabel, { color: previewPage === 'categories' ? pc : tmc }]}>Categories</Text></View>
              <View style={styles.phoneTabItem}><Settings color={previewPage === 'menu' || previewPage === 'settings' ? pc : tmc} size={16} /><Text style={[styles.phoneTabLabel, { color: previewPage === 'menu' || previewPage === 'settings' ? pc : tmc }]}>Menu</Text></View>
            </View>
          )}
        </View>
        <View style={styles.previewLegend}>
          <Text style={styles.previewLegendTitle}>Theme</Text>
          <View style={styles.previewLegendRow}>
            <View style={styles.previewLegendItem}><View style={[styles.previewLegendSwatch, { backgroundColor: pc }]} /><Text style={styles.previewLegendLabel}>{design.primaryColorName}</Text></View>
            <View style={styles.previewLegendItem}><View style={[styles.previewLegendSwatch, { backgroundColor: design.accentColors[0] || '#B85C38' }]} /><Text style={styles.previewLegendLabel}>{design.accentColorName}</Text></View>
          </View>
        </View>
      </>
    );
  };

  const renderMenuManagement = () => (
    <>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Grid3x3 color={AC.accent} size={18} /><Text style={styles.sectionTitle}>Menu Items ({customMenuItems.length})</Text></View>
        <TouchableOpacity style={styles.addBlockBtn} onPress={() => { setEditingMenuItem(null); setNewMenuLabel(''); setNewMenuSublabel(''); setNewMenuIcon('FileText'); setNewMenuTargetPage('home'); setShowAddMenuItemModal(true); hapticMedium(); }} activeOpacity={0.7}><Plus color={AC.accent} size={18} /><Text style={styles.addBlockBtnText}>Add Item</Text></TouchableOpacity>
      </View>
      {customMenuItems.length === 0 ? (
        <View style={styles.sectionCard}><View style={styles.emptyState}><Grid3x3 color={AC.textMuted} size={40} /><Text style={styles.emptyText}>No custom menu items</Text></View></View>
      ) : customMenuItems.map(item => (
        <View key={item.id} style={[styles.sectionCard, !item.visible && { opacity: 0.5 }]}>
          <View style={styles.blockHeader}>
            <View style={styles.blockHeaderLeft}><View style={[styles.blockTypeIcon, { backgroundColor: AC.accentDim }]}><FileText color={AC.accent} size={16} /></View><View style={styles.blockHeaderInfo}><Text style={styles.blockTitle}>{item.label}</Text><Text style={styles.blockType}>PAGE: {item.targetPage.toUpperCase()}</Text></View></View>
            <TouchableOpacity style={styles.blockActionBtn} onPress={() => { const u = customMenuItems.map(m => m.id === item.id ? { ...m, visible: !m.visible } : m); void saveCustomMenuItems(u); }} activeOpacity={0.7}>{item.visible ? <Eye color={AC.accent} size={14} /> : <EyeOff color={AC.textMuted} size={14} />}</TouchableOpacity>
          </View>
          <View style={styles.blockFooter}>
            <TouchableOpacity style={styles.blockFooterBtn} onPress={() => { setEditingMenuItem(item); setNewMenuLabel(item.label); setNewMenuSublabel(item.sublabel); setNewMenuIcon(item.icon); setNewMenuTargetPage(item.targetPage); setShowAddMenuItemModal(true); }} activeOpacity={0.7}><PenLine color={AC.blue} size={13} /><Text style={[styles.blockFooterBtnText, { color: AC.blue }]}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={styles.blockFooterBtn} onPress={() => Alert.alert('Delete?', 'Remove?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void saveCustomMenuItems(customMenuItems.filter(m => m.id !== item.id)) }])} activeOpacity={0.7}><Trash2 color={AC.red} size={13} /><Text style={[styles.blockFooterBtnText, { color: AC.red }]}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}><Layers color={AC.blue} size={18} /><Text style={styles.sectionTitle}>Default Items</Text></View>
        {['My Profile', 'Settings', 'FAQs', 'Contact Us', 'Privacy Policy'].map((l, i) => <React.Fragment key={l}>{i > 0 && <View style={styles.activityDivider} />}<View style={styles.activityRow}><Text style={styles.activityLabel}>{l}</Text><View style={styles.statusBadge}><Text style={styles.statusText}>Built-in</Text></View></View></React.Fragment>)}
      </View>
    </>
  );

  const renderBlockCreator = () => {
    if (!showBlockCreator) return null;
    return (
      <View style={styles.creatorContainer}>
        <View style={styles.creatorHeader}><Text style={styles.creatorTitle}>New Block</Text><TouchableOpacity onPress={resetCreator} activeOpacity={0.7} style={styles.creatorCloseBtn}><X color={AC.text} size={20} /></TouchableOpacity></View>
        <View style={styles.creatorSteps}>
          {[['type', 'Type', <Layers key="t" color={creatorStep === 'type' ? AC.accent : AC.textMuted} size={14} />], ['page', 'Page', <FileText key="p" color={creatorStep === 'page' ? AC.cyan : AC.textMuted} size={14} />], ['style', 'Style', <Palette key="s" color={creatorStep === 'style' ? AC.orange : AC.textMuted} size={14} />]].map(([id, lbl, icon]) => (
            <TouchableOpacity key={id as string} style={[styles.creatorStepTab, creatorStep === id && styles.creatorStepTabActive]} onPress={() => { if (id === 'style' && !newBlockType) return; setCreatorStep(id as 'type' | 'page' | 'style'); }} activeOpacity={0.7}>{icon}<Text style={[styles.creatorStepText, creatorStep === id && styles.creatorStepTextActive]}>{lbl}</Text>{id === 'type' && newBlockType && <Check color={AC.green} size={12} />}</TouchableOpacity>
          ))}
        </View>
        <ScrollView style={styles.creatorBody} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {creatorStep === 'type' && (
            <View style={styles.creatorSection}>
              <Text style={styles.creatorSectionLabel}>Select Type</Text>
              <View style={styles.creatorTypeGrid}>
                {BLOCK_TYPES.map(bt => {
                  const a = newBlockType === bt.type;
                  return (
                    <TouchableOpacity key={bt.type} style={[styles.creatorTypeCard, a && styles.creatorTypeCardActive]} onPress={() => { setNewBlockType(bt.type); hapticLight(); }} activeOpacity={0.7}>
                      <View style={[styles.creatorTypeIconWrap, a && styles.creatorTypeIconWrapActive]}>{bt.icon}</View>
                      <Text style={[styles.creatorTypeLabel, a && styles.creatorTypeLabelActive]}>{bt.label}</Text>
                      <Text style={styles.creatorTypeDesc}>{bt.desc}</Text>
                      {a && <View style={styles.creatorTypeCheck}><Check color={AC.accent} size={12} /></View>}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {newBlockType && <TouchableOpacity style={styles.creatorNextBtn} onPress={() => setCreatorStep('page')} activeOpacity={0.7}><Text style={styles.creatorNextBtnText}>Next: Page</Text><ChevronRight color="#0F1923" size={16} /></TouchableOpacity>}
            </View>
          )}
          {creatorStep === 'page' && (
            <View style={styles.creatorSection}>
              <Text style={styles.creatorSectionLabel}>Add to Page</Text>
              <View style={styles.creatorPageGrid}>
                {PAGE_OPTIONS.map(p => <TouchableOpacity key={p.id} style={[styles.creatorPageChip, newBlockPage === p.id && styles.creatorPageChipActive]} onPress={() => { setNewBlockPage(p.id); hapticLight(); }} activeOpacity={0.7}><CircleDot color={newBlockPage === p.id ? AC.accent : AC.textMuted} size={14} /><Text style={[styles.creatorPageChipText, newBlockPage === p.id && styles.creatorPageChipTextActive]}>{p.name}</Text></TouchableOpacity>)}
              </View>
              <TouchableOpacity style={styles.creatorNextBtn} onPress={() => setCreatorStep('style')} activeOpacity={0.7}><Text style={styles.creatorNextBtnText}>Next: Style</Text><ChevronRight color="#0F1923" size={16} /></TouchableOpacity>
            </View>
          )}
          {creatorStep === 'style' && (
            <View style={styles.creatorSection}>
              <Text style={styles.creatorSectionLabel}>Background</Text>
              <View style={styles.creatorBgTypeRow}>
                {([['transparent', 'None'], ['solid', 'Color'], ['image', 'Image']] as const).map(([v, l]) => <TouchableOpacity key={v} style={[styles.creatorBgTypeBtn, newBlockBgType === v && styles.creatorBgTypeBtnActive]} onPress={() => { setNewBlockBgType(v); hapticLight(); }} activeOpacity={0.7}><Text style={[styles.creatorBgTypeBtnText, newBlockBgType === v && styles.creatorBgTypeBtnTextActive]}>{l}</Text></TouchableOpacity>)}
              </View>
              {newBlockBgType === 'solid' && <><Text style={[styles.creatorSectionLabel, { marginTop: 16 }]}>Color</Text><View style={styles.creatorColorGrid}>{CREATOR_BG_COLORS.map((c, i) => <TouchableOpacity key={i} style={[styles.creatorColorSwatch, { backgroundColor: c }, newBlockBgColor === c && styles.creatorColorSwatchActive]} onPress={() => setNewBlockBgColor(c)} activeOpacity={0.7}>{newBlockBgColor === c && <Check color={c === '#FFFFFF' || c === '#F5F5F5' ? '#000' : '#FFF'} size={12} />}</TouchableOpacity>)}</View></>}
              {newBlockBgType === 'image' && <><Text style={[styles.creatorSectionLabel, { marginTop: 16 }]}>Image URL</Text><TextInput style={styles.creatorInput} value={newBlockBgImage} onChangeText={setNewBlockBgImage} placeholder="https://..." placeholderTextColor={AC.textMuted} autoCapitalize="none" keyboardType="url" /></>}
              <TouchableOpacity style={[styles.creatorCreateBtn, !newBlockType && styles.creatorCreateBtnDisabled]} onPress={finalizeNewBlock} activeOpacity={0.7} disabled={!newBlockType}><Plus color="#0F1923" size={18} /><Text style={styles.creatorCreateBtnText}>Create Block</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderBlockEditorModal = () => {
    if (!editingBlock) return null;
    return (
      <Modal visible={!!editingBlock} transparent animationType="slide" onRequestClose={() => setEditingBlock(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{blocks.find(b => b.id === editingBlock.id) ? 'Edit' : 'New'} {editingBlock.type}</Text><TouchableOpacity onPress={() => setEditingBlock(null)} activeOpacity={0.7}><X color={AC.text} size={22} /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.editorField}><Text style={styles.editorLabel}>Title</Text><TextInput style={styles.editorInput} value={editingBlock.title} onChangeText={t => setEditingBlock({ ...editingBlock, title: t })} placeholder="Title..." placeholderTextColor={AC.textMuted} /></View>
              {editingBlock.type !== 'divider' && <View style={styles.editorField}><Text style={styles.editorLabel}>Content</Text><TextInput style={[styles.editorInput, styles.editorTextArea]} value={editingBlock.content} onChangeText={t => setEditingBlock({ ...editingBlock, content: t })} placeholder="Content..." placeholderTextColor={AC.textMuted} multiline /></View>}
              {(editingBlock.type === 'image' || editingBlock.type === 'banner') && <View style={styles.editorField}><Text style={styles.editorLabel}>Image URL</Text><TextInput style={styles.editorInput} value={editingBlock.imageUrl ?? ''} onChangeText={t => setEditingBlock({ ...editingBlock, imageUrl: t })} placeholder="https://..." placeholderTextColor={AC.textMuted} autoCapitalize="none" keyboardType="url" />{editingBlock.imageUrl ? <View style={styles.imagePreviewWrap}><RNImage source={{ uri: editingBlock.imageUrl }} style={styles.imagePreview} /></View> : null}</View>}
              {editingBlock.type === 'video' && <View style={styles.editorField}><Text style={styles.editorLabel}>Video URL</Text><TextInput style={styles.editorInput} value={editingBlock.videoUrl ?? ''} onChangeText={t => setEditingBlock({ ...editingBlock, videoUrl: t })} placeholder="https://..." placeholderTextColor={AC.textMuted} autoCapitalize="none" keyboardType="url" /></View>}
              {editingBlock.type === 'cta' && <><View style={styles.editorField}><Text style={styles.editorLabel}>Button Text</Text><TextInput style={styles.editorInput} value={editingBlock.buttonText ?? ''} onChangeText={t => setEditingBlock({ ...editingBlock, buttonText: t })} placeholder="Click Here" placeholderTextColor={AC.textMuted} /></View><View style={styles.editorField}><Text style={styles.editorLabel}>Button Link</Text><TextInput style={styles.editorInput} value={editingBlock.buttonLink ?? ''} onChangeText={t => setEditingBlock({ ...editingBlock, buttonLink: t })} placeholder="https://..." placeholderTextColor={AC.textMuted} autoCapitalize="none" keyboardType="url" /></View></>}
              <Text style={styles.editorSectionLabel}>Style</Text>
              <View style={styles.editorField}>
                <Text style={styles.editorLabel}>Alignment</Text>
                <View style={styles.alignmentRow}>{(['left', 'center', 'right'] as const).map(a => <TouchableOpacity key={a} style={[styles.alignmentBtn, editingBlock.style?.alignment === a && styles.alignmentBtnSelected]} onPress={() => setEditingBlock({ ...editingBlock, style: { ...editingBlock.style, alignment: a } })} activeOpacity={0.7}><Text style={[styles.alignmentBtnText, editingBlock.style?.alignment === a && styles.alignmentBtnTextSelected]}>{a.charAt(0).toUpperCase() + a.slice(1)}</Text></TouchableOpacity>)}</View>
              </View>
              <View style={styles.editorField}>
                <Text style={styles.editorLabel}>Font Size: {editingBlock.style?.fontSize ?? 16}px</Text>
                <View style={styles.fontSizeRow}>{[12, 14, 16, 18, 20, 24, 28, 32].map(s => <TouchableOpacity key={s} style={[styles.fontSizeBtn, editingBlock.style?.fontSize === s && styles.fontSizeBtnSelected]} onPress={() => setEditingBlock({ ...editingBlock, style: { ...editingBlock.style, fontSize: s } })} activeOpacity={0.7}><Text style={[styles.fontSizeBtnText, editingBlock.style?.fontSize === s && styles.fontSizeBtnTextSelected]}>{s}</Text></TouchableOpacity>)}</View>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.saveBlockBtn} onPress={() => saveBlock(editingBlock)} activeOpacity={0.7}><Check color="#FFF" size={18} /><Text style={styles.saveBlockBtnText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.adminBadge}><Shield color={AC.accent} size={16} /></View>
          <View><Text style={styles.topBarTitle}>Admin</Text><View style={styles.topBarSubRow}><Text style={styles.topBarSub}>puthereapp.com</Text>{dbSyncing && <View style={styles.syncBadge}><CloudUpload color={AC.accent} size={10} /><Text style={styles.syncText}>syncing</Text></View>}</View></View>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7} testID="admin-signout-btn"><LogOut color={AC.red} size={18} /></TouchableOpacity>
      </View>
      <View style={styles.tabBar}>{tabs.map(t => <TouchableOpacity key={t.id} style={[styles.tab, activeTab === t.id && styles.tabActive]} onPress={() => setActiveTab(t.id)} activeOpacity={0.7}>{t.icon}<Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text></TouchableOpacity>)}</View>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AC.accent} />}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'content' && renderContent()}
        {activeTab === 'design' && renderDesign()}
        {activeTab === 'preview' && renderPreview()}
        {activeTab === 'menu-mgmt' && renderMenuManagement()}
        {activeTab === 'settings' && renderSettings()}
      </ScrollView>
      {renderBlockEditorModal()}
      <Modal visible={showMediaModal} transparent animationType="slide" onRequestClose={() => setShowMediaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Media</Text><TouchableOpacity onPress={() => setShowMediaModal(false)} activeOpacity={0.7}><X color={AC.text} size={22} /></TouchableOpacity></View>
            <View style={styles.mediaTypeToggle}>
              {(['image', 'video'] as const).map(mt => <TouchableOpacity key={mt} style={[styles.mediaTypeBtn, newMediaType === mt && styles.mediaTypeBtnActive]} onPress={() => setNewMediaType(mt)} activeOpacity={0.7}>{mt === 'image' ? <ImageIcon color={newMediaType === mt ? AC.accent : AC.textMuted} size={16} /> : <Video color={newMediaType === mt ? AC.accent : AC.textMuted} size={16} />}<Text style={[styles.mediaTypeBtnText, newMediaType === mt && styles.mediaTypeBtnTextActive]}>{mt}</Text></TouchableOpacity>)}
            </View>
            <View style={styles.uploadSection}>
              <Text style={styles.uploadSectionTitle}>Upload</Text>
              <View style={styles.uploadSourceRow}>
                {newMediaType === 'image' && <TouchableOpacity style={styles.uploadSourceBtn} onPress={() => handleUploadMedia('image', 'camera')} activeOpacity={0.7} disabled={uploadingMedia}><Camera color={AC.blue} size={20} /><Text style={styles.uploadSourceBtnText}>Camera</Text></TouchableOpacity>}
                <TouchableOpacity style={styles.uploadSourceBtn} onPress={() => handleUploadMedia(newMediaType, 'gallery')} activeOpacity={0.7} disabled={uploadingMedia}><FolderOpen color={AC.orange} size={20} /><Text style={styles.uploadSourceBtnText}>{newMediaType === 'image' ? 'Gallery' : 'Video'}</Text></TouchableOpacity>
              </View>
              {uploadingMedia && <View style={styles.uploadingRow}><ActivityIndicator color={AC.accent} size="small" /><Text style={styles.uploadingText}>Uploading...</Text></View>}
            </View>
            <View style={styles.orDivider}><View style={styles.orDividerLine} /><Text style={styles.orDividerTextModal}>OR URL</Text><View style={styles.orDividerLine} /></View>
            <View style={styles.editorField}><Text style={styles.editorLabel}>Name</Text><TextInput style={styles.editorInput} value={newMediaName} onChangeText={setNewMediaName} placeholder="Name" placeholderTextColor={AC.textMuted} /></View>
            <View style={styles.editorField}><Text style={styles.editorLabel}>URL</Text><TextInput style={styles.editorInput} value={newMediaUrl} onChangeText={setNewMediaUrl} placeholder="https://..." placeholderTextColor={AC.textMuted} autoCapitalize="none" keyboardType="url" /></View>
            <TouchableOpacity style={styles.saveBlockBtn} onPress={() => { if (!newMediaUrl.trim()) { Alert.alert('Error', 'Enter URL'); return; } void saveMedia([...mediaItems, { id: Date.now().toString(), type: newMediaType, url: newMediaUrl.trim(), name: newMediaName.trim() || 'Untitled', addedAt: new Date().toISOString() }]); setNewMediaUrl(''); setNewMediaName(''); setShowMediaModal(false); hapticSuccess(); }} activeOpacity={0.7}><Plus color="#FFF" size={18} /><Text style={styles.saveBlockBtnText}>Add</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showHistoryModal} transparent animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>History</Text><TouchableOpacity onPress={() => setShowHistoryModal(false)} activeOpacity={0.7}><X color={AC.text} size={22} /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {history.length === 0 ? <View style={styles.emptyState}><History color={AC.textMuted} size={36} /><Text style={styles.emptyText}>No history</Text></View> : history.map((snap, idx) => (
                <View key={snap.id} style={styles.historyItem}>
                  <View style={styles.historyTimeline}><View style={[styles.historyDot, idx === 0 && styles.historyDotActive]} />{idx < history.length - 1 && <View style={styles.historyLine} />}</View>
                  <View style={styles.historyContent}><Text style={styles.historyLabel}>{snap.label}</Text><Text style={styles.historyTime}>{new Date(snap.timestamp).toLocaleString()}</Text></View>
                  <TouchableOpacity style={styles.historyRestoreBtn} onPress={() => handleRestoreSnapshot(snap)} activeOpacity={0.7}><RotateCcw color={AC.accent} size={14} /><Text style={styles.historyRestoreText}>Restore</Text></TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={showAddMenuItemModal} transparent animationType="slide" onRequestClose={() => setShowAddMenuItemModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editingMenuItem ? 'Edit' : 'Add'} Menu Item</Text><TouchableOpacity onPress={() => setShowAddMenuItemModal(false)} activeOpacity={0.7}><X color={AC.text} size={22} /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.editorField}><Text style={styles.editorLabel}>Label</Text><TextInput style={styles.editorInput} value={newMenuLabel} onChangeText={setNewMenuLabel} placeholder="Label" placeholderTextColor={AC.textMuted} /></View>
              <View style={styles.editorField}><Text style={styles.editorLabel}>Sublabel</Text><TextInput style={styles.editorInput} value={newMenuSublabel} onChangeText={setNewMenuSublabel} placeholder="Description" placeholderTextColor={AC.textMuted} /></View>
              <View style={styles.editorField}><Text style={styles.editorLabel}>Icon</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{MENU_ICON_OPTIONS.map(ic => <TouchableOpacity key={ic} style={[styles.creatorPageChip, newMenuIcon === ic && styles.creatorPageChipActive]} onPress={() => setNewMenuIcon(ic)} activeOpacity={0.7}><Text style={[styles.creatorPageChipText, newMenuIcon === ic && styles.creatorPageChipTextActive]}>{ic}</Text></TouchableOpacity>)}</View></View>
              <View style={styles.editorField}><Text style={styles.editorLabel}>Page</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{PAGE_OPTIONS.map(p => <TouchableOpacity key={p.id} style={[styles.creatorPageChip, newMenuTargetPage === p.id && styles.creatorPageChipActive]} onPress={() => setNewMenuTargetPage(p.id)} activeOpacity={0.7}><CircleDot color={newMenuTargetPage === p.id ? AC.accent : AC.textMuted} size={12} /><Text style={[styles.creatorPageChipText, newMenuTargetPage === p.id && styles.creatorPageChipTextActive]}>{p.name}</Text></TouchableOpacity>)}</View></View>
            </ScrollView>
            <TouchableOpacity style={styles.saveBlockBtn} onPress={handleAddMenuItem} activeOpacity={0.7}><Check color="#FFF" size={18} /><Text style={styles.saveBlockBtnText}>{editingMenuItem ? 'Update' : 'Add'}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
