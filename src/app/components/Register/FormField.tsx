"use client";

import { AlertCircle, CheckCircle, Mail, Lock, User as UserIcon, Eye, EyeOff } from "@/app/lib/icons";

interface FormFieldProps {
  type: "text" | "email" | "password";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string;
  isValid: boolean;
  touched: boolean;
  disabled: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function FormField({
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  isValid,
  touched,
  disabled,
  showPassword,
  onTogglePassword,
  icon: IconComponent
}: FormFieldProps) {
  const getIcon = () => {
    if (error) return <AlertCircle className="w-5 h-5" />;
    if (value && isValid && touched) return <CheckCircle className="w-5 h-5" />;
    if (IconComponent) return <IconComponent className="w-5 h-5" />;
    
    // Default icons
    switch (type) {
      case "email": return <Mail className="w-5 h-5" />;
      case "password": return <Lock className="w-5 h-5" />;
      default: return <UserIcon className="w-5 h-5" />;
    }
  };

  const getIconColor = () => {
    if (error) return 'text-error-500';
    if (value && isValid && touched) return 'text-sage';
    return 'text-charcoal/60 group-focus-within:text-sage';
  };

  const getInputClasses = () => {
    const baseClasses = "w-full bg-cultured-1/50 border pl-12 sm:pl-14 pr-4 py-3 sm:py-4 md:py-5 font-urbanist text-body font-600 text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full";

    if (error) {
      return `${baseClasses} border-error-100 focus:border-error-500 focus:ring-error-500/20`;
    }
    if (value && isValid && touched) {
      return `${baseClasses} border-sage/40 focus:border-sage focus:ring-sage/20`;
    }
    return `${baseClasses} border-light-gray/50 focus:ring-sage/30 focus:border-sage focus:bg-off-white`;
  };

  return (
    <div className="relative group">
      <div className={`absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 z-10 ${getIconColor()}`}>
        {getIcon()}
      </div>
      
      <input
        type={type === "password" && showPassword ? "text" : type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={getInputClasses()}
        disabled={disabled}
      />
      
      {type === "password" && onTogglePassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2 text-charcoal/60 hover:text-charcoal transition-colors duration-300 p-1 z-10 rounded-full"
          disabled={disabled}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
