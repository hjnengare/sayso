'use client';

import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Search,
  User,
  Mail,
  Heart,
  Star,
  Briefcase,
  Edit,
  Trash2,
} from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconColor = 'current' | 'sage' | 'coral' | 'charcoal' | 'white' | 'gray';

export interface IconProps {
  size?: IconSize;
  color?: IconColor;
  className?: string;
}

const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const colorStyles: Record<IconColor, string> = {
  current: 'text-current',
  sage: 'text-sage',
  coral: 'text-coral',
  charcoal: 'text-charcoal',
  white: 'text-white',
  gray: 'text-charcoal/70',
};

// Common icon components using lucide-react
export const IconChevronRight: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <ChevronRight size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconChevronLeft: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <ChevronLeft size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconChevronDown: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <ChevronDown size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconChevronUp: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <ChevronUp size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconCheck: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Check size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconX: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <X size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconSearch: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Search size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconUser: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <User size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconMail: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Mail size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconHeart: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Heart size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconStar: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Star size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconBriefcase: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Briefcase size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconEdit: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Edit size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);

export const IconTrash: React.FC<IconProps> = ({ size = 'md', color = 'current', className = '' }) => (
  <Trash2 size={sizeMap[size]} className={`${colorStyles[color]} flex-shrink-0 ${className}`} />
);
