'use client';

import React from 'react';

export interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-9 h-5',
  md: 'w-11 h-6',
  lg: 'w-14 h-7',
};

const dotSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const translateClasses = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-7',
};

export const Toggle: React.FC<ToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex ${sizeClasses[size]} flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-coral' : 'bg-charcoal/20'
      } ${className}`}
      role="switch"
      aria-checked={enabled}
      aria-label="Toggle notification"
    >
      <span
        className={`inline-block ${dotSizeClasses[size]} transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
          enabled ? translateClasses[size] : 'translate-x-0'
        }`}
      />
    </button>
  );
};

