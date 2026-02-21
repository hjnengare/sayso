'use client';

import React, { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { IconSearch, IconX } from '@/components/atoms/Icon';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSearch,
  onClear,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(value);
    }
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('');
    }
    onChange?.('');
    onClear?.();
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        leftIcon={<IconSearch size="sm" />}
        rightIcon={
          value ? (
            <button
              type="button"
              onClick={handleClear}
              className="hover:bg-light-gray rounded-full p-1 transition-colors"
              aria-label="Clear search"
            >
              <IconX size="sm" />
            </button>
          ) : undefined
        }
        fullWidth
      />
    </div>
  );
};
