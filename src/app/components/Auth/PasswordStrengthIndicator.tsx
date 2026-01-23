"use client";

import { Circle } from "lucide-react";
import { PasswordStrength } from "../../utils/validation";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  showChecks?: boolean;
}

export function PasswordStrengthIndicator({ strength, showChecks = true }: PasswordStrengthIndicatorProps) {
  const { score, feedback, checks, color } = strength;

  // Only show green if all requirements are met and no warnings
  const allRequirementsMet = checks.length && checks.uppercase && checks.lowercase && checks.number;
  const isStrictSuccess = allRequirementsMet && (!color || color === 'text-sage');

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-charcoal/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              score === 0 ? 'w-0 bg-transparent' :
              score === 1 ? 'w-1/4 bg-red-500' :
              score === 2 ? 'w-1/2 bg-orange-500' :
              score === 3 ? 'w-3/4 bg-yellow-500' :
              isStrictSuccess ? 'w-full bg-sage' : 'w-full bg-yellow-500'
            }`}
          />
        </div>
        {feedback && (
          <span className={`text-sm sm:text-xs font-medium ${
            isStrictSuccess ? 'text-sage' : color || 'text-charcoal/60'
          }`}>
            {feedback}
          </span>
        )}
      </div>

      {/* Password Requirements Checklist */}
      {showChecks && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:text-xs">
          <div className={`flex items-center gap-1.5 ${checks.length ? 'text-sage' : 'text-charcoal/60'}`}>
            <Circle className={`w-3 h-3 ${checks.length ? 'fill-sage' : ''}`} />
            <span>8+ characters</span>
          </div>
          <div className={`flex items-center gap-1.5 ${checks.uppercase ? 'text-sage' : 'text-charcoal/60'}`}>
            <Circle className={`w-3 h-3 ${checks.uppercase ? 'fill-sage' : ''}`} />
            <span>Uppercase letter</span>
          </div>
          <div className={`flex items-center gap-1.5 ${checks.lowercase ? 'text-sage' : 'text-charcoal/60'}`}>
            <Circle className={`w-3 h-3 ${checks.lowercase ? 'fill-sage' : ''}`} />
            <span>Lowercase letter</span>
          </div>
          <div className={`flex items-center gap-1.5 ${checks.number ? 'text-sage' : 'text-charcoal/60'}`}>
            <Circle className={`w-3 h-3 ${checks.number ? 'fill-sage' : ''}`} />
            <span>Number</span>
          </div>
        </div>
      )}
    </div>
  );
}
