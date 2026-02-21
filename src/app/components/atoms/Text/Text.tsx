'use client';

import React from 'react';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body-lg' | 'body' | 'body-sm' | 'caption' | 'label';
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'sage' | 'coral' | 'white' | 'error' | 'success';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: TextAlign;
  className?: string;
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

const variantStyles: Record<TextVariant, string> = {
  h1: 'text-lg md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight',
  h2: 'text-lg md:text-lg lg:text-4xl font-bold leading-tight tracking-tight',
  h3: 'text-xl md:text-lg lg:text-lg font-bold leading-snug',
  h4: 'text-lg md:text-xl font-semibold leading-snug',
  h5: 'text-base md:text-lg font-semibold leading-normal',
  h6: 'text-base font-semibold leading-normal',
  'body-lg': 'text-lg leading-relaxed',
  'body': 'text-base leading-normal',
  'body-sm': 'text-sm leading-normal',
  'caption': 'text-xs leading-normal',
  'label': 'text-sm font-medium leading-normal',
};

const colorStyles: Record<TextColor, string> = {
  primary: 'text-charcoal',
  secondary: 'text-charcoal/70',
  tertiary: 'text-charcoal/70',
  disabled: 'text-charcoal/30',
  sage: 'text-sage',
  coral: 'text-coral',
  white: 'text-white',
  error: 'text-red-500',
  success: 'text-green-500',
};

const alignStyles: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const defaultElements: Record<TextVariant, TextProps['as']> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  'body-lg': 'p',
  'body': 'p',
  'body-sm': 'p',
  'caption': 'span',
  'label': 'span',
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  align = 'left',
  className = '',
  children,
  as,
}) => {
  const Component = as || defaultElements[variant];

  return (
    <Component
      className={`
        ${variantStyles[variant]}
        ${colorStyles[color]}
        ${alignStyles[align]}
        ${className}
      `}
    >
      {children}
    </Component>
  );
};
