"use client";

interface PasswordStrengthProps {
  password: string;
  strength: {
    score: number;
    feedback: string;
    checks: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
    };
  };
}

export default function PasswordStrength({ password, strength }: PasswordStrengthProps) {
  if (password.length === 0) return null;

  // Only show green if all requirements are met and no warnings
  const allRequirementsMet = strength.checks.length && strength.checks.uppercase && strength.checks.lowercase && strength.checks.number;
  const isStrictSuccess = allRequirementsMet && (!strength.color || strength.color === 'text-sage' || strength.color === 'text-blue-500');

  return (
    <div className="h-5 mt-1 flex items-center gap-2">
      <div className="flex-1 flex gap-1" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={4}>
        {[1, 2, 3, 4].map((level) => {
          let barColor = 'bg-gray-200';
          if (level <= strength.score) {
            if (isStrictSuccess) {
              barColor = 'bg-sage';
            } else if (level === 1) {
              barColor = 'bg-error-500';
            } else if (level === 2) {
              barColor = 'bg-orange-400';
            } else if (level === 3) {
              barColor = 'bg-yellow-400';
            } else {
              barColor = 'bg-yellow-400';
            }
          }
          return (
            <div
              key={level}
              className={`h-1 flex-1 transition-all duration-300 ${barColor}`}
            />
          );
        })}
      </div>
    </div>
  );
}
