"use client";

import { CheckCircle, Circle } from "@/app/lib/icons";

interface ProgressIndicatorProps {
  username: { value: string; isValid: boolean; error: string };
  email: { value: string; isValid: boolean; error: string };
  password: { strength: number };
  consent: boolean;
}

export default function ProgressIndicator({ username, email, password, consent }: ProgressIndicatorProps) {
  const steps = [
    { key: 'username', label: 'Username', completed: username.value && !username.error },
    { key: 'email', label: 'Email', completed: email.value && !email.error },
    { key: 'password', label: 'Password', completed: password.strength >= 3 },
    { key: 'consent', label: 'Terms', completed: consent }
  ];

  return (
    <div className="text-center space-y-2 pt-4">
      <div className="flex items-center justify-center gap-3 text-sm sm:text-xs">
        {steps.map((step) => (
          <div key={step.key} className={`flex items-center gap-1 min-w-0 ${step.completed ? 'text-sage' : 'text-gray-400'}`}>
            {step.completed ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
            <span className="text-truncate">{step.label}</span>
          </div>
        ))}
      </div>
      <p className="text-sm sm:text-xs text-charcoal/60">
        Next - Pick your interests
      </p>
    </div>
  );
}
