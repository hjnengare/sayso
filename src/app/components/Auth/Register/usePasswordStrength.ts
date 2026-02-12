import { useMemo } from "react";

interface PasswordStrength {
  score: number;
  feedback: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
  };
  color?: string;
}

export function usePasswordStrength(password: string, email: string = ""): PasswordStrength {
  return useMemo(() => {
    // Only length is required (6 chars minimum), other checks stay true for UI compatibility.
    const checks = {
      length: password.length >= 6,
      uppercase: true,
      lowercase: true,
      number: true,
    };

    let score = 0;
    let feedback = "";
    let color = "";

    if (password.length === 0) {
      feedback = "";
      color = "";
    } else if (password.length < 6) {
      score = 1;
      feedback = "Needs a few more characters";
      color = "text-error-500";
    } else if (password.length < 8) {
      score = 2;
      feedback = "Good";
      color = "text-yellow-500";
    } else if (password.length < 12) {
      score = 3;
      feedback = "Strong";
      color = "text-sage";
    } else {
      score = 4;
      feedback = "Very strong";
      color = "text-sage";
    }

    return { score, feedback, checks, color };
  }, [password, email]);
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "Use at least 6 characters for your password.";
  return null;
}

