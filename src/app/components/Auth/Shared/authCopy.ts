const normalize = (message: string): string => message.replace(/\s+/g, " ").trim();

const withPeriod = (message: string): string => {
  const cleaned = normalize(message).replace(/!+$/g, ".");
  if (!cleaned) return "";
  return /[.?!]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

const has = (value: string, patterns: string[]): boolean =>
  patterns.some((pattern) => value.includes(pattern));

export const authCopy = {
  requiredFields: "Please complete all required fields.",
  usernameRequired: "Please enter your username.",
  usernameMin: "Use at least 3 characters for your username.",
  usernameMax: "Use 20 characters or fewer for your username.",
  usernameFormat: "Use letters, numbers, or underscores in your username.",
  publicBusinessNameRequired: "Please enter your public business name.",
  publicBusinessNameInvalid: "Use 2 to 80 characters for your public business name.",
  emailRequired: "Please enter your email address.",
  emailInvalid: "Please enter a valid email address.",
  emailTooLong: "Please use an email address under 255 characters.",
  emailFormatInvalid: "Please check your email address format and try again.",
  passwordRequired: "Please enter your password.",
  passwordMin: "Use at least 6 characters for your password.",
  passwordConfirmRequired: "Please confirm your password.",
  passwordMismatch: "Passwords do not match. Please check and try again.",
  passwordStrength: "Please choose a stronger password.",
  consentRequired: "Please accept the Terms and Privacy Policy to continue.",
  offline: "You're offline. Please reconnect and try again.",
  rateLimited: "Too many attempts right now. Please wait a moment and try again.",
  loginInvalidCredentials: "We couldn't sign you in with those details. Please try again.",
  registrationFailed: "We couldn't create your account right now. Please try again.",
  authRequestFailed: "We couldn't complete your request right now. Please try again.",
  resetLinkInvalid: "This reset link is no longer valid. Please request a new one.",
  resetLinkVerifyFailed: "We couldn't verify this reset link. Please request a new one.",
  resetRequestFailed: "We couldn't send the reset link right now. Please try again.",
  resetPasswordFailed: "We couldn't reset your password right now. Please try again.",
  connectionIssue: "We couldn't connect right now. Please check your connection and try again.",
} as const;

const accountWithArticle = (label: string): string => {
  const normalized = normalize(label) || "Personal";
  const article = /^[aeiou]/i.test(normalized) ? "an" : "a";
  return `${article} ${normalized}`;
};

export const existingAccountMessage = (label: string): string =>
  `This email is already linked to ${accountWithArticle(label)} account. Please sign in or use a different email.`;

export const formatAuthMessage = (message: string, fallback: string): string => {
  const normalized = normalize(message || "");
  if (!normalized) return withPeriod(fallback);

  const lower = normalized.toLowerCase();

  if (has(lower, ["too many", "rate limit", "too many requests", "too many attempts"])) {
    return authCopy.rateLimited;
  }

  if (has(lower, ["fetch", "network", "connection", "failed to fetch"])) {
    return authCopy.connectionIssue;
  }

  if (has(lower, ["invalid email", "email address", "email format"]) && has(lower, ["invalid", "format"])) {
    return authCopy.emailInvalid;
  }

  if (has(lower, ["already in use", "already registered", "already exists", "already taken", "duplicate", "user_exists"])) {
    return existingAccountMessage("Personal");
  }

  if (has(lower, ["invalid login credentials", "invalid credentials", "incorrect email or password", "email or password is incorrect"])) {
    return authCopy.loginInvalidCredentials;
  }

  if (has(lower, ["password"]) && has(lower, ["weak", "requirements", "at least 6"])) {
    return authCopy.passwordMin;
  }

  if (has(lower, ["invalid", "expired"]) && has(lower, ["reset link", "link"])) {
    return authCopy.resetLinkInvalid;
  }

  return withPeriod(normalized);
};

