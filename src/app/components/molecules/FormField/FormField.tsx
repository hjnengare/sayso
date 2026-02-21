'use client';

import React from 'react';
import { Input, InputProps } from '@/components/atoms/Input';
import { Text } from '@/components/atoms/Text';

export interface FormFieldProps extends Omit<InputProps, 'label'> {
  label: string;
  required?: boolean;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  description,
  error,
  helperText,
  ...inputProps
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1 mb-1.5">
        <Text variant="label" color="primary">
          {label}
        </Text>
        {required && (
          <Text variant="label" color="coral">
            *
          </Text>
        )}
      </div>

      {description && (
        <Text variant="caption" color="secondary" className="mb-2">
          {description}
        </Text>
      )}

      <Input
        error={error}
        helperText={helperText}
        fullWidth
        {...inputProps}
      />
    </div>
  );
};
