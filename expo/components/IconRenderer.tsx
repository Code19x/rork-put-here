import React from 'react';
import {
  Package, Cpu, FileText, Shirt, Wrench, Gem, CookingPot, BookOpen,
  Dumbbell, Bed, Car, DoorOpen, Warehouse, Sofa, Monitor, Bath, Home,
  ArrowDown, Plus, Search, X, Trash2, Edit, Camera, Image as ImageIcon,
  ChevronRight, MapPin, Tag, StickyNote, Clock, Grid3x3, Filter,
} from 'lucide-react-native';

const iconMap: Record<string, React.ComponentType<{ color?: string; size?: number }>> = {
  Package, Cpu, FileText, Shirt, Wrench, Gem, CookingPot, BookOpen,
  Dumbbell, Bed, Car, DoorOpen, Warehouse, Sofa, Monitor, Bath, Home,
  ArrowDown, Plus, Search, X, Trash2, Edit, Camera, Image: ImageIcon,
  ChevronRight, MapPin, Tag, StickyNote, Clock, Grid3x3, Filter,
};

interface IconRendererProps {
  name: string;
  color?: string;
  size?: number;
}

export default function IconRenderer({ name, color = '#000', size = 20 }: IconRendererProps) {
  const Icon = iconMap[name] ?? Package;
  return <Icon color={color} size={size} />;
}
