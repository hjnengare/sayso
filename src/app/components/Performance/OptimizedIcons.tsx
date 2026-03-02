"use client";

import React from 'react';
import type { IconType } from 'react-icons';
import * as icons from '@/app/lib/icons';

// Icon lookup map — populated from the central registry.
// Tree-shaking still works because bundlers only include icons actually used
// across the app via their direct named imports in each component.
const iconMap: Record<string, IconType> = {
  search:        icons.Search        as unknown as IconType,
  user:          icons.User          as unknown as IconType,
  heart:         icons.Heart         as unknown as IconType,
  star:          icons.Star          as unknown as IconType,
  menu:          icons.Menu          as unknown as IconType,
  x:             icons.X             as unknown as IconType,
  'arrow-right': icons.ArrowRight    as unknown as IconType,
  'arrow-left':  icons.ArrowLeft     as unknown as IconType,
  'chevron-down': icons.ChevronDown  as unknown as IconType,
  'chevron-up':   icons.ChevronUp    as unknown as IconType,
  'chevron-right': icons.ChevronRight as unknown as IconType,
  'chevron-left':  icons.ChevronLeft  as unknown as IconType,
  home:          icons.Home          as unknown as IconType,
  settings:      icons.Settings      as unknown as IconType,
  mail:          icons.Mail          as unknown as IconType,
  phone:         icons.Phone         as unknown as IconType,
  camera:        icons.Camera        as unknown as IconType,
  edit:          icons.Edit          as unknown as IconType,
  trash:         icons.Trash2        as unknown as IconType,
  lock:          icons.Lock          as unknown as IconType,
  eye:           icons.Eye           as unknown as IconType,
  'eye-off':     icons.EyeOff        as unknown as IconType,
  check:         icons.Check         as unknown as IconType,
  'check-circle': icons.CheckCircle  as unknown as IconType,
  'alert-circle': icons.AlertCircle  as unknown as IconType,
  info:          icons.Info          as unknown as IconType,
  plus:          icons.Plus          as unknown as IconType,
  map:           icons.MapPin        as unknown as IconType,
  calendar:      icons.Calendar      as unknown as IconType,
  clock:         icons.Clock         as unknown as IconType,
  zap:           icons.Zap           as unknown as IconType,
  sparkles:      icons.Sparkles      as unknown as IconType,
  trophy:        icons.Trophy        as unknown as IconType,
};

interface OptimizedIconProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * OptimizedIcon — renders a named icon from the central registry.
 *
 * Performance note: icons are static SVG components rendered server-side.
 * There is no dynamic import or ssr:false here — icons are tiny (~400B each)
 * and the previous dynamic approach caused unnecessary CLS.
 *
 * Prefer direct named imports (e.g. `import { Search } from '@/app/lib/icons'`)
 * for new code. Use this component when the icon name is determined at runtime.
 */
export function OptimizedIcon({
  name,
  size = 20,
  className = '',
}: OptimizedIconProps) {
  const IconComponent = iconMap[name.toLowerCase()];

  if (!IconComponent) {
    // Unknown name — render an empty placeholder with the same dimensions
    return (
      <span
        style={{ width: size, height: size }}
        className={`inline-block ${className}`}
        aria-hidden="true"
      />
    );
  }

  return <IconComponent size={size} className={className} />;
}
