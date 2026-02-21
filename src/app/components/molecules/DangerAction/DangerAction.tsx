'use client';

import React from 'react';

export interface DangerActionProps {
  title: string;
  description: string;
  buttonText: string;
  onAction: () => void;
  variant?: 'primary' | 'secondary';
  showBorder?: boolean;
}

export const DangerAction: React.FC<DangerActionProps> = ({
  title,
  description,
  buttonText,
  onAction,
  variant = 'primary',
  showBorder = true,
}) => {
  const buttonClasses = variant === 'primary'
    ? 'px-6 py-2 rounded-full text-sm font-600 bg-coral text-white hover:bg-coral/90 transition-all duration-300 shadow-lg'
    : 'px-6 py-2 rounded-full text-sm font-600 bg-white/40 text-coral border border-coral hover:bg-coral hover:text-white transition-all duration-300';

  const titleColor = variant === 'secondary' ? 'text-coral' : 'text-charcoal';

  return (
    <div className={`${showBorder ? 'border-t border-coral/20 pt-4' : ''}`}>
      <h3 className={`text-base font-600 ${titleColor} mb-2`} style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{title}</h3>
      <p className="text-sm text-charcoal/70 mb-4" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}>{description}</p>
      <button onClick={onAction} className={buttonClasses} style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}>
        {buttonText}
      </button>
    </div>
  );
};

