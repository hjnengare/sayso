# Error Page Implementation Examples

This document provides practical code examples for implementing the unified error page design system across the KLIO platform.

## Quick Start

### Import the Component

```typescript
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import { IoArrowBack, IoHome } from "react-icons/io5";
```

## Standard Error Implementations

### 1. 404 - Page Not Found

#### Option A: Default Configuration
```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import { IoArrowBack } from "react-icons/io5";

export default function NotFound() {
  return (
    <ErrorPage
      errorType="404"
      secondaryAction={{
        label: "Go Back",
        onClick: () => window.history.back(),
        icon: <IoArrowBack className="w-5 h-5" />,
      }}
    />
  );
}
```

#### Option B: Custom Configuration
```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import Link from "next/link";

export default function NotFound() {
  return (
    <ErrorPage
      errorType="404"
      title="Page Not Found"
      description="The page you're looking for doesn't exist. It might have been moved or deleted."
      primaryAction={{
        label: "Explore Categories",
        href: "/interests",
        icon: <IoHome className="w-5 h-5" />,
      }}
      secondaryAction={{
        label: "Go Back",
        onClick: () => window.history.back(),
        icon: <IoArrowBack className="w-5 h-5" />,
      }}
    />
  );
}
```

### 2. 401 - Authentication Required

```typescript
"use client";

import { useSearchParams } from "next/navigation";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import { IoArrowBack } from "react-icons/io5";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Authentication failed';

  return (
    <ErrorPage
      errorType="401"
      title="Authentication Required"
      description={error}
      secondaryAction={{
        label: "Try Again",
        onClick: () => window.history.back(),
        icon: <IoArrowBack className="w-5 h-5" />,
      }}
    />
  );
}
```

### 3. 403 - Access Denied

```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function AccessDeniedPage() {
  return (
    <ErrorPage
      errorType="403"
      title="Access Denied"
      description="You don't have permission to access this resource. If you believe this is an error, please contact support."
      primaryAction={{
        label: "Go Home",
        href: "/interests",
      }}
    />
  );
}
```

### 4. 500 - Server Error

```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function ServerErrorPage() {
  return (
    <ErrorPage
      errorType="500"
      description="Something went wrong on our end. Our team has been automatically notified and is investigating."
      primaryAction={{
        label: "Go Home",
        href: "/",
      }}
    />
  );
}
```

### 5. 503 - Service Unavailable

```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function MaintenancePage() {
  return (
    <ErrorPage
      errorType="503"
      description="We're currently performing scheduled maintenance. We expect to be back online shortly. Thank you for your patience!"
      primaryAction={{
        label: "Check Status",
        href: "https://status.sayso.com",
      }}
    />
  );
}
```

## Error Boundary Usage

### Basic Setup

```typescript
"use client";

import { ErrorBoundary } from "@/app/components/ErrorBoundary/ErrorBoundary";
import MyComponent from "./MyComponent";

export default function Page() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### With Custom Fallback

```typescript
"use client";

import { ErrorBoundary } from "@/app/components/ErrorBoundary/ErrorBoundary";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function Page() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorPage
          errorType="error"
          title="Component Loading Error"
          description="This component encountered an issue. Try refreshing the page."
        />
      }
    >
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### With Error Logging

```typescript
"use client";

import { ErrorBoundary } from "@/app/components/ErrorBoundary/ErrorBoundary";
import { ErrorInfo } from "react";

export default function Page() {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Send to error tracking service (Sentry, LogRocket, etc.)
    console.error('Component Error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Onboarding Error Boundary

```typescript
"use client";

import { OnboardingErrorBoundary } from "@/app/components/Onboarding";
import OnboardingFlow from "./OnboardingFlow";

export default function OnboardingPage() {
  return (
    <OnboardingErrorBoundary>
      <OnboardingFlow />
    </OnboardingErrorBoundary>
  );
}
```

## Advanced Patterns

### Custom Error Handling with State

```typescript
"use client";

import { useState } from "react";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function DynamicErrorPage() {
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleError = (code: number, message: string) => {
    setErrorCode(code);
    setErrorMessage(message);
  };

  if (errorCode) {
    return (
      <ErrorPage
        errorType={
          errorCode === 404
            ? "404"
            : errorCode === 401
            ? "401"
            : errorCode === 403
            ? "403"
            : errorCode === 500
            ? "500"
            : errorCode === 503
            ? "503"
            : "error"
        }
        description={errorMessage}
        primaryAction={{
          label: "Retry",
          href: "/",
          onClick: () => setErrorCode(null),
        }}
      />
    );
  }

  return <YourComponent onError={handleError} />;
}
```

### Conditional Error Display

```typescript
"use client";

import { useEffect, useState } from "react";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import LoadingComponent from "@/app/components/UI/Loader";

export default function DataPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchData()
      .then(() => setStatus("success"))
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return <LoadingComponent />;
  }

  if (status === "error") {
    return (
      <ErrorPage
        errorType="500"
        description={error || "Failed to load data. Please try again."}
        primaryAction={{
          label: "Retry",
          href: "/",
        }}
      />
    );
  }

  return <SuccessContent />;
}
```

### Error with Recovery Action

```typescript
"use client";

import { useState } from "react";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function PageWithRecovery() {
  const [recovered, setRecovered] = useState(false);

  const handleRecovery = async () => {
    try {
      await recoverData();
      setRecovered(true);
      // Redirect or refresh
      window.location.reload();
    } catch (err) {
      console.error("Recovery failed:", err);
    }
  };

  if (!recovered && someErrorCondition) {
    return (
      <ErrorPage
        errorType="500"
        title="Data Recovery Needed"
        description="There was an issue processing your request. We can try to recover your data."
        primaryAction={{
          label: "Recover Data",
          href: "#",
          onClick: (e) => {
            e.preventDefault();
            handleRecovery();
          },
        }}
      />
    );
  }

  return <NormalContent />;
}
```

## Integration with API Responses

### Fetch Error Handling

```typescript
"use client";

import { useState, useEffect } from "react";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function DataPage() {
  const [data, setData] = useState(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/data");

        if (!response.ok) {
          switch (response.status) {
            case 401:
              setErrorType("401");
              break;
            case 403:
              setErrorType("403");
              break;
            case 404:
              setErrorType("404");
              break;
            case 500:
              setErrorType("500");
              break;
            case 503:
              setErrorType("503");
              break;
            default:
              setErrorType("error");
          }
          return;
        }

        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Fetch error:", error);
        setErrorType("error");
      }
    };

    fetchData();
  }, []);

  if (errorType) {
    return (
      <ErrorPage
        errorType={errorType as any}
        primaryAction={{
          label: "Retry",
          href: "/",
        }}
      />
    );
  }

  if (!data) {
    return <LoadingComponent />;
  }

  return <DataContent data={data} />;
}
```

## Styling Customization

### Using Design Tokens

Error pages automatically use design tokens from the system. To extend or customize:

```typescript
// In component or page
import { colors, typography, spacing } from "@/app/design-system/tokens";

// Use in custom error page
const customStyle = {
  color: colors.neutral.charcoal.DEFAULT,
  fontSize: typography.fontSize["heading-lg"][0],
  padding: spacing[6],
};
```

### CSS Module Approach (if needed)

```css
/* ErrorPage.module.css */
.errorContainer {
  background-color: #E5E0E5; /* off-white */
  padding: 2rem;
  border-radius: 1rem;
}

.errorTitle {
  color: #2D2D2D; /* charcoal */
  font-family: "Urbanist", sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
}

.primaryButton {
  background-color: #7D9B76; /* sage */
  color: white;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.primaryButton:hover {
  background-color: #6d8b66;
  box-shadow: 0 8px 16px rgba(125, 155, 118, 0.2);
}
```

## Testing Error Pages

### Manual Testing Script

```typescript
// pages/test/errors.tsx
"use client";

import Link from "next/link";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import { useState } from "react";

export default function ErrorTestPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const errors = [
    { type: "404", label: "404 - Not Found" },
    { type: "401", label: "401 - Unauthorized" },
    { type: "403", label: "403 - Forbidden" },
    { type: "500", label: "500 - Server Error" },
    { type: "503", label: "503 - Service Unavailable" },
    { type: "error", label: "Generic Error" },
  ];

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-sage text-white rounded"
        >
          Back to Test Menu
        </button>
        <ErrorPage errorType={selected as any} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-charcoal mb-8">
          Error Page Test Suite
        </h1>

        <div className="grid gap-4">
          {errors.map((error) => (
            <button
              key={error.type}
              onClick={() => setSelected(error.type)}
              className="p-4 bg-white border border-sage/20 rounded-lg text-left hover:bg-sage/5 transition"
            >
              <h2 className="font-bold text-charcoal">{error.label}</h2>
              <p className="text-sm text-charcoal/70">Click to preview</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Accessibility Checklist

When implementing error pages, ensure:

- [ ] Text has sufficient contrast (WCAG AA: 4.5:1 for body text)
- [ ] Focus states are visible (sage-colored ring)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Error messages are clear and descriptive
- [ ] Icons have alternative text or are decorative
- [ ] Page is responsive on all screen sizes
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Color is not the only way to convey information

## Performance Considerations

- Error pages are static/simple - no data fetching needed
- Animations use CSS transforms and opacity (performant)
- Minimal JavaScript required
- Bundle size: ~5KB (component only, icons from react-icons)

## Best Practices Summary

1. **Keep it simple**: Error pages should be fast and easy to understand
2. **Be specific**: Explain what went wrong and why
3. **Provide action**: Always give users a clear next step
4. **Match brand**: Use consistent colors, typography, spacing
5. **Test thoroughly**: Check on all device sizes and browsers
6. **Monitor errors**: Track which errors users encounter most
7. **Iterate**: Use data to improve error messaging

---

For questions or additional examples, refer to [ERROR_DESIGN_SYSTEM.md](./ERROR_DESIGN_SYSTEM.md)
