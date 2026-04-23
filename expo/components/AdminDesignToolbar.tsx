import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Animated, Platform, Image as RNImage, Alert,
} from 'react-native';
import {
  Paintbrush, Square, Maximize, Image as ImageIcon, Sparkles,
  FileText, ChevronDown, X, Minus, Plus, CircleDot,
  Upload, Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

const AC = {
  bg: '#0F1923',
  surface: '#1A2735',
  surfaceLight: '#243447',
  card: '#1E2D3D',
  accent: '#00D4AA',
  accentDim: 'rgba(0, 212, 170, 0.12)',
  blue: '#3B82F6',
  blueDim: 'rgba(59, 130, 246, 0.12)',
  orange: '#F59E0B',
  orangeDim: 'rgba(245, 158, 11, 0.12)',
  pink: '#EC4899',
  pinkDim: 'rgba(236, 72, 153, 0.12)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139, 92, 246, 0.12)',
  red: '#EF4444',
  cyan: '#06B6D4',
  cyanDim: 'rgba(6, 182, 212, 0.12)',
  text: '#E8EDF2',
  textSecondary: '#8899AA',
  textMuted: '#5A6A7A',
  border: '#2A3A4A',
  divider: '#1E2E3E',
  inputBg: '#162230',
};

export type PageId = 'home' | 'categories' | 'item-detail' | 'add-item' | 'settings' | 'menu' | 'login';

export type BorderStyleType = 'solid' | 'dashed' | 'dotted';
export type AnimationType = 'none' | 'fadeIn' | 'slideUp' | 'slideLeft' | 'pulse' | 'bounce' | 'scaleIn';

export interface BlockStyleExtended {
  bgColor?: string;
  textColor?: string;
  font?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  borderColor?: string;
  borderStyle?: BorderStyleType;
  borderWidth?: number;
  borderRadius?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  backgroundImage?: string;
  animation?: AnimationType;
  opacity?: number;
}

type ToolId = 'background' | 'border' | 'padding' | 'image' | 'animation';

interface ToolDef {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const TOOLS: ToolDef[] = [
  { id: 'background', label: 'Background', icon: <Paintbrush color={AC.orange} size={16} />, color: AC.orange, bgColor: AC.orangeDim },
  { id: 'border', label: 'Borders', icon: <Square color={AC.blue} size={16} />, color: AC.blue, bgColor: AC.blueDim },
  { id: 'padding', label: 'Padding', icon: <Maximize color={AC.accent} size={16} />, color: AC.accent, bgColor: AC.accentDim },
  { id: 'image', label: 'Images', icon: <ImageIcon color={AC.pink} size={16} />, color: AC.pink, bgColor: AC.pinkDim },
  { id: 'animation', label: 'Animation', icon: <Sparkles color={AC.purple} size={16} />, color: AC.purple, bgColor: AC.purpleDim },
];

const PAGE_LIST: { id: PageId; name: string }[] = [
  { id: 'home', name: 'Home' },
  { id: 'categories', name: 'Categories' },
  { id: 'item-detail', name: 'Item Detail' },
  { id: 'add-item', name: 'Add Item' },
  { id: 'settings', name: 'Settings' },
  { id: 'menu', name: 'Menu' },
  { id: 'login', name: 'Login' },
];

const BG_COLORS = [
  '', '#0F1923', '#1A2735', '#FFFFFF', '#F5F5F5', '#1E293B',
  '#FBF5EF', '#E8F5E9', '#FFF0E8', '#E3F2FD', '#EDE9FE',
  '#FFF5F5', '#F0FDF4', '#FEF3C7', '#FCE7F3', '#ECFEFF',
  '#1A1A2E', '#16213E', '#2D1B69', '#1B4332', '#7F1D1D',
];

const BORDER_COLORS = [
  '', '#FFFFFF', '#000000', '#E8EDF2', '#C4763B', '#B85C38',
  '#1A73E8', '#2E7D32', '#7C3AED', '#EF4444', '#EC4899',
  '#06B6D4', '#F59E0B', '#64748B', '#334155', '#00D4AA',
];

const BORDER_WIDTHS = [0, 0.5, 1, 1.5, 2, 3, 4, 5];
const BORDER_RADII = [0, 4, 8, 12, 16, 20, 24, 32, 50];
const PADDING_VALUES = [0, 4, 8, 12, 16, 20, 24, 32, 40];

const ANIMATIONS: { id: AnimationType; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'No animation' },
  { id: 'fadeIn', label: 'Fade In', desc: 'Smooth opacity transition' },
  { id: 'slideUp', label: 'Slide Up', desc: 'Slides up from below' },
  { id: 'slideLeft', label: 'Slide Left', desc: 'Slides in from right' },
  { id: 'pulse', label: 'Pulse', desc: 'Gentle pulse effect' },
  { id: 'bounce', label: 'Bounce', desc: 'Bouncy entrance' },
  { id: 'scaleIn', label: 'Scale In', desc: 'Grows from center' },
];

interface AdminDesignToolbarProps {
  selectedPage: PageId;
  onPageChange: (page: PageId) => void;
  blockStyle: BlockStyleExtended;
  onStyleChange: (style: BlockStyleExtended) => void;
  hasSelectedBlock: boolean;
}

export default function AdminDesignToolbar({
  selectedPage,
  onPageChange,
  blockStyle,
  onStyleChange,
  hasSelectedBlock,
}: AdminDesignToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const panelHeight = useRef(new Animated.Value(0)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const toggleTool = useCallback((toolId: ToolId) => {
    if (!hasSelectedBlock) {
      Alert.alert('Select a Block', 'Please select or create a content block first to use design tools.');
      return;
    }
    haptic();
    if (activeTool === toolId) {
      Animated.parallel([
        Animated.timing(panelHeight, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(panelOpacity, { toValue: 0, duration: 150, useNativeDriver: false }),
      ]).start(() => setActiveTool(null));
    } else {
      setActiveTool(toolId);
      Animated.parallel([
        Animated.timing(panelHeight, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(panelOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [activeTool, hasSelectedBlock, haptic, panelHeight, panelOpacity]);

  useEffect(() => {
    if (!hasSelectedBlock && activeTool) {
      Animated.parallel([
        Animated.timing(panelHeight, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(panelOpacity, { toValue: 0, duration: 150, useNativeDriver: false }),
      ]).start(() => setActiveTool(null));
    }
  }, [hasSelectedBlock, activeTool, panelHeight, panelOpacity]);

  const updateStyle = useCallback((key: keyof BlockStyleExtended, value: string | number | undefined) => {
    onStyleChange({ ...blockStyle, [key]: value });
    haptic();
  }, [blockStyle, onStyleChange, haptic]);

  const pickBackgroundImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        updateStyle('backgroundImage', result.assets[0].uri);
      }
    } catch (error) {
      console.log('Pick bg image error:', error);
    }
  }, [updateStyle]);

  const renderBackgroundPanel = () => (
    <View style={s.panelInner}>
      <Text style={s.panelLabel}>Block Background Color</Text>
      <View style={s.colorGrid}>
        {BG_COLORS.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={[
              s.colorSwatch,
              { backgroundColor: c || '#transparent' },
              !c && s.colorSwatchNone,
              blockStyle.bgColor === c && s.colorSwatchActive,
            ]}
            onPress={() => updateStyle('bgColor', c)}
            activeOpacity={0.7}
          >
            {!c && <X color={AC.textMuted} size={10} />}
            {blockStyle.bgColor === c && c && <Check color={c === '#FFFFFF' || c === '#F5F5F5' ? '#000' : '#FFF'} size={10} />}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[s.panelLabel, { marginTop: 12 }]}>Opacity: {Math.round((blockStyle.opacity ?? 1) * 100)}%</Text>
      <View style={s.sliderRow}>
        {[0.2, 0.4, 0.6, 0.8, 0.9, 1].map(val => (
          <TouchableOpacity
            key={val}
            style={[s.valueChip, (blockStyle.opacity ?? 1) === val && s.valueChipActive]}
            onPress={() => updateStyle('opacity', val)}
            activeOpacity={0.7}
          >
            <Text style={[s.valueChipText, (blockStyle.opacity ?? 1) === val && s.valueChipTextActive]}>
              {Math.round(val * 100)}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBorderPanel = () => (
    <View style={s.panelInner}>
      <Text style={s.panelLabel}>Border Style</Text>
      <View style={s.chipRow}>
        {(['solid', 'dashed', 'dotted'] as BorderStyleType[]).map(bs => (
          <TouchableOpacity
            key={bs}
            style={[s.styleChip, blockStyle.borderStyle === bs && s.styleChipActive]}
            onPress={() => updateStyle('borderStyle', bs)}
            activeOpacity={0.7}
          >
            <View style={[
              s.borderPreviewLine,
              {
                borderBottomWidth: 2,
                borderBottomColor: blockStyle.borderStyle === bs ? AC.accent : AC.textSecondary,
                borderStyle: bs,
              },
            ]} />
            <Text style={[s.styleChipLabel, blockStyle.borderStyle === bs && s.styleChipLabelActive]}>
              {bs.charAt(0).toUpperCase() + bs.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.panelLabel, { marginTop: 12 }]}>Border Color</Text>
      <View style={s.colorGrid}>
        {BORDER_COLORS.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={[
              s.colorSwatch,
              { backgroundColor: c || 'transparent' },
              !c && s.colorSwatchNone,
              blockStyle.borderColor === c && s.colorSwatchActive,
            ]}
            onPress={() => updateStyle('borderColor', c)}
            activeOpacity={0.7}
          >
            {!c && <X color={AC.textMuted} size={10} />}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.panelLabel, { marginTop: 12 }]}>Border Width</Text>
      <View style={s.chipRow}>
        {BORDER_WIDTHS.map(w => (
          <TouchableOpacity
            key={w}
            style={[s.valueChip, (blockStyle.borderWidth ?? 0) === w && s.valueChipActive]}
            onPress={() => updateStyle('borderWidth', w)}
            activeOpacity={0.7}
          >
            <Text style={[s.valueChipText, (blockStyle.borderWidth ?? 0) === w && s.valueChipTextActive]}>
              {w}px
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.panelLabel, { marginTop: 12 }]}>Corner Radius</Text>
      <View style={s.chipRow}>
        {BORDER_RADII.map(r => (
          <TouchableOpacity
            key={r}
            style={[s.valueChip, (blockStyle.borderRadius ?? 10) === r && s.valueChipActive]}
            onPress={() => updateStyle('borderRadius', r)}
            activeOpacity={0.7}
          >
            <Text style={[s.valueChipText, (blockStyle.borderRadius ?? 10) === r && s.valueChipTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPaddingPanel = () => {
    const sides: { key: keyof BlockStyleExtended; label: string }[] = [
      { key: 'paddingTop', label: 'Top' },
      { key: 'paddingRight', label: 'Right' },
      { key: 'paddingBottom', label: 'Bottom' },
      { key: 'paddingLeft', label: 'Left' },
    ];

    return (
      <View style={s.panelInner}>
        {sides.map(side => {
          const val = (blockStyle[side.key] as number | undefined) ?? 10;
          return (
            <View key={side.key} style={s.paddingRow}>
              <Text style={s.paddingSideLabel}>{side.label}</Text>
              <View style={s.paddingControls}>
                <TouchableOpacity
                  style={s.paddingStepBtn}
                  onPress={() => updateStyle(side.key, Math.max(0, val - 2))}
                  activeOpacity={0.7}
                >
                  <Minus color={AC.text} size={14} />
                </TouchableOpacity>
                <Text style={s.paddingValue}>{val}px</Text>
                <TouchableOpacity
                  style={s.paddingStepBtn}
                  onPress={() => updateStyle(side.key, Math.min(60, val + 2))}
                  activeOpacity={0.7}
                >
                  <Plus color={AC.text} size={14} />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.paddingQuickValues}>
                {PADDING_VALUES.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[s.paddingQuickChip, val === p && s.paddingQuickChipActive]}
                    onPress={() => updateStyle(side.key, p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.paddingQuickText, val === p && s.paddingQuickTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
        <TouchableOpacity
          style={s.applyAllBtn}
          onPress={() => {
            const v = (blockStyle.paddingTop as number | undefined) ?? 10;
            onStyleChange({
              ...blockStyle,
              paddingTop: v,
              paddingRight: v,
              paddingBottom: v,
              paddingLeft: v,
            });
            haptic();
          }}
          activeOpacity={0.7}
        >
          <Text style={s.applyAllBtnText}>Apply Top Value to All Sides</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderImagePanel = () => (
    <View style={s.panelInner}>
      <Text style={s.panelLabel}>Block Background Image</Text>
      {blockStyle.backgroundImage ? (
        <View style={s.bgImagePreview}>
          <RNImage source={{ uri: blockStyle.backgroundImage }} style={s.bgImageThumb} />
          <TouchableOpacity
            style={s.bgImageRemove}
            onPress={() => updateStyle('backgroundImage', '')}
            activeOpacity={0.7}
          >
            <X color={AC.red} size={14} />
            <Text style={s.bgImageRemoveText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <TouchableOpacity
        style={s.uploadImageBtn}
        onPress={pickBackgroundImage}
        activeOpacity={0.7}
      >
        <Upload color={AC.pink} size={16} />
        <Text style={s.uploadImageBtnText}>Upload Background Image</Text>
      </TouchableOpacity>
      <Text style={[s.panelLabel, { marginTop: 8 }]}>or enter URL</Text>
      <TextInput
        style={s.urlInput}
        value={blockStyle.backgroundImage ?? ''}
        onChangeText={(t) => updateStyle('backgroundImage', t)}
        placeholder="https://example.com/image.jpg"
        placeholderTextColor={AC.textMuted}
        autoCapitalize="none"
        keyboardType="url"
      />
    </View>
  );

  const renderAnimationPanel = () => (
    <View style={s.panelInner}>
      <Text style={s.panelLabel}>Block Animation</Text>
      <View style={s.animGrid}>
        {ANIMATIONS.map(anim => (
          <TouchableOpacity
            key={anim.id}
            style={[s.animCard, (blockStyle.animation ?? 'none') === anim.id && s.animCardActive]}
            onPress={() => updateStyle('animation', anim.id)}
            activeOpacity={0.7}
          >
            <View style={[s.animDot, (blockStyle.animation ?? 'none') === anim.id && s.animDotActive]}>
              {anim.id === 'none' ? (
                <X color={(blockStyle.animation ?? 'none') === anim.id ? AC.accent : AC.textMuted} size={12} />
              ) : (
                <Sparkles color={(blockStyle.animation ?? 'none') === anim.id ? AC.accent : AC.textMuted} size={12} />
              )}
            </View>
            <Text style={[s.animLabel, (blockStyle.animation ?? 'none') === anim.id && s.animLabelActive]}>
              {anim.label}
            </Text>
            <Text style={s.animDesc}>{anim.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPanel = () => {
    if (!activeTool) return null;
    switch (activeTool) {
      case 'background': return renderBackgroundPanel();
      case 'border': return renderBorderPanel();
      case 'padding': return renderPaddingPanel();
      case 'image': return renderImagePanel();
      case 'animation': return renderAnimationPanel();
      default: return null;
    }
  };

  return (
    <View style={s.wrapper}>
      <View style={s.pageRow}>
        <TouchableOpacity
          style={s.pageSelector}
          onPress={() => { setShowPagePicker(!showPagePicker); haptic(); }}
          activeOpacity={0.7}
        >
          <FileText color={AC.cyan} size={14} />
          <Text style={s.pageSelectorText}>{PAGE_LIST.find(p => p.id === selectedPage)?.name ?? 'Page'}</Text>
          <ChevronDown color={AC.textMuted} size={14} style={showPagePicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.toolScroll} contentContainerStyle={s.toolScrollContent}>
          {TOOLS.map(tool => {
            const isActive = activeTool === tool.id;
            return (
              <TouchableOpacity
                key={tool.id}
                style={[s.toolBtn, isActive && { backgroundColor: tool.bgColor, borderColor: tool.color }]}
                onPress={() => toggleTool(tool.id)}
                activeOpacity={0.7}
              >
                {tool.icon}
                <Text style={[s.toolBtnText, isActive && { color: tool.color }]}>{tool.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {showPagePicker && (
        <View style={s.pageDropdown}>
          {PAGE_LIST.map(page => (
            <TouchableOpacity
              key={page.id}
              style={[s.pageOption, selectedPage === page.id && s.pageOptionActive]}
              onPress={() => { onPageChange(page.id); setShowPagePicker(false); haptic(); }}
              activeOpacity={0.7}
            >
              <CircleDot color={selectedPage === page.id ? AC.accent : AC.textMuted} size={14} />
              <Text style={[s.pageOptionText, selectedPage === page.id && s.pageOptionTextActive]}>
                {page.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTool && (
        <Animated.View style={[s.panelContainer, { opacity: panelOpacity }]}>
          <ScrollView
            style={s.panelScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {renderPanel()}
          </ScrollView>
        </Animated.View>
      )}

      {!hasSelectedBlock && (
        <View style={s.hintBar}>
          <Text style={s.hintText}>Select or create a block below to use design tools</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    backgroundColor: AC.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AC.border,
    overflow: 'hidden',
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: AC.divider,
  },
  pageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: AC.cyanDim,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  pageSelectorText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AC.cyan,
  },
  toolScroll: {
    flex: 1,
  },
  toolScrollContent: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 10,
    paddingVertical: 2,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.border,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: AC.textSecondary,
  },
  pageDropdown: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: AC.surface,
    borderBottomWidth: 1,
    borderBottomColor: AC.divider,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: AC.card,
    borderWidth: 1,
    borderColor: AC.border,
  },
  pageOptionActive: {
    borderColor: AC.accent,
    backgroundColor: AC.accentDim,
  },
  pageOptionText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: AC.textSecondary,
  },
  pageOptionTextActive: {
    color: AC.accent,
    fontWeight: '600' as const,
  },
  panelContainer: {
    maxHeight: 280,
    borderBottomWidth: 1,
    borderBottomColor: AC.divider,
  },
  panelScroll: {
    flex: 1,
  },
  panelInner: {
    padding: 12,
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: AC.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: AC.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchNone: {
    borderStyle: 'dashed' as const,
    backgroundColor: AC.surface,
  },
  colorSwatchActive: {
    borderColor: AC.accent,
    borderWidth: 2.5,
  },
  sliderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  styleChip: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.border,
    gap: 6,
  },
  styleChipActive: {
    borderColor: AC.accent,
    backgroundColor: AC.accentDim,
  },
  borderPreviewLine: {
    width: 40,
    height: 0,
  },
  styleChipLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: AC.textSecondary,
  },
  styleChipLabelActive: {
    color: AC.accent,
  },
  valueChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.border,
  },
  valueChipActive: {
    borderColor: AC.accent,
    backgroundColor: AC.accentDim,
  },
  valueChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: AC.textSecondary,
  },
  valueChipTextActive: {
    color: AC.accent,
  },
  paddingRow: {
    marginBottom: 14,
  },
  paddingSideLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AC.text,
    marginBottom: 6,
  },
  paddingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  paddingStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: AC.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AC.border,
  },
  paddingValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: AC.text,
    minWidth: 40,
    textAlign: 'center' as const,
  },
  paddingQuickValues: {
    flexDirection: 'row',
  },
  paddingQuickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.border,
    marginRight: 5,
  },
  paddingQuickChipActive: {
    borderColor: AC.accent,
    backgroundColor: AC.accentDim,
  },
  paddingQuickText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: AC.textSecondary,
  },
  paddingQuickTextActive: {
    color: AC.accent,
  },
  applyAllBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AC.accentDim,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  applyAllBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AC.accent,
  },
  bgImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    padding: 8,
    backgroundColor: AC.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AC.border,
  },
  bgImageThumb: {
    width: 60,
    height: 44,
    borderRadius: 8,
  },
  bgImageRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  bgImageRemoveText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AC.red,
  },
  uploadImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: AC.pink,
    borderStyle: 'dashed' as const,
    gap: 8,
    marginBottom: 8,
  },
  uploadImageBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: AC.pink,
  },
  urlInput: {
    backgroundColor: AC.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: AC.text,
    borderWidth: 1,
    borderColor: AC.border,
  },
  animGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  animCard: {
    width: '47%' as unknown as number,
    padding: 10,
    borderRadius: 10,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.border,
    gap: 4,
  },
  animCardActive: {
    borderColor: AC.purple,
    backgroundColor: AC.purpleDim,
  },
  animDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: AC.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  animDotActive: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
  },
  animLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: AC.textSecondary,
  },
  animLabelActive: {
    color: AC.accent,
  },
  animDesc: {
    fontSize: 10,
    color: AC.textMuted,
  },
  hintBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: AC.orangeDim,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.15)',
  },
  hintText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: AC.orange,
    textAlign: 'center' as const,
  },
});
