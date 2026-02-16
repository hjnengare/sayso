'use client';

import React from 'react';

export interface ProfileInfoItemProps {
  label: string;
  value: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor?: 'coral' | 'sage' | 'default';
  showBorder?: boolean;
}

const iconColorClasses = {
  coral: 'bg-coral/10',
  sage: 'bg-card-bg/10',
  default: 'bg-charcoal/10',
};

const iconTextColors = {
  coral: 'text-coral',
  sage: 'text-sage',
  default: 'text-charcoal',
};

export const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = 'default',
  showBorder = true,
}) => {
  return (
    <div className={`flex justify-between items-center py-3 ${showBorder ? 'border-b border-charcoal/10' : ''}`}>
      <div>
        <p className="text-sm text-charcoal/70">{label}</p>
        <p className="text-base font-500 text-charcoal">{value}</p>
      </div>
      {Icon && (
        <div className={`grid h-8 w-8 place-items-center rounded-full ${iconColorClasses[iconColor]}`}>
          <Icon className={`w-4 h-4 ${iconTextColors[iconColor]}`} />
        </div>
      )}
    </div>
  );
};

