# Error Page Design System

## Overview

This document outlines the unified, consistent error page design system for the KLIO platform. All error states now use a premium, minimal, intentional design that feels like a natural extension of the product rather than an afterthought.

## Design Principles

### 1. **Premium & Minimal**
- Clean, spacious layouts with purposeful whitespace
- No visual clutter or over-decoration
- Sophisticated typography and spacing hierarchy
- Subtle animations that enhance rather than distract

### 2. **Intentional Visual Language**
- Every element serves a purpose
- Consistent iconography and visual patterns
- Thoughtful use of color and contrast
- Premium feel through restraint, not excess

### 3. **Brand Cohesion**
- All error pages feel like natural extensions of the product
- Typography, spacing, and layout align with site design language
- Consistent use of brand colors and design tokens
- Same quality and care as main application

## Color Palette

The error design system uses three core brand colors:

```
Sage          #7D9B76  - Primary brand color (buttons, accents)
Navbar-bg     #722F37  - Secondary brand color (reserved for special emphasis)
Off-white     #E5E0E5  - Background color (page backgrounds)
Charcoal      #2D2D2D  - Primary text color
```

### Color Usage Guidelines

- **Sage (#7D9B76)**: Primary CTAs, interactive elements, accents, focus states
- **Charcoal (#2D2D2D)**: Body text, headings, icons
- **Off-white (#E5E0E5)**: Page backgrounds, subtle borders
- **Navbar-bg (#722F37)**: Reserved for special emphasis (rarely used in error pages)

### Accessibility

- All text meets WCAG AA contrast ratios
- Color is never the only means of conveying information
- Focus states are clearly visible with sage-colored rings

## Typography

Uses the Urbanist font family for consistency with the main application.

### Type Scale

| Element | Mobile | Desktop | Weight | Usage |
|---------|--------|---------|--------|-------|
| Error Code (404, 500, etc) | 56px | 64px | 800 | Large display of error numbers |
| Title | 24px | 32px | 700 | Main error heading |
| Description | 16px | 18px | 500 | Error context and explanation |
| Button Text | 16px | 16px | 600 | CTA labels |
| Support Text | 14px | 14px | 500 | Help and contact info |

### Line Heights

- Display elements: 1.2
- Body text: 1.6
- Tight text: 1.4

## Spacing System

Follows a consistent 4px grid system for predictable, harmonious layouts.

```
Micro:   4px
Tight:   8px
Small:   12px
Base:    16px
Medium:  20px
Large:   24px
XL:      32px
XXL:     48px
```

### Layout Spacing

- Page content padding: 16px (mobile), 24px (tablet), 32px (desktop)
- Component internal spacing: 16-24px
- Gap between elements: 16-20px
- Vertical rhythm: 8px increments

## Component Structure

### Standard Error Page Anatomy

```
┌─────────────────────────────────────┐
│   Subtle Background Gradients       │
│   (Sage/5 opacity)                  │
├─────────────────────────────────────┤
│                                     │
│         Error Icon/Code             │
│         (animated entrance)          │
│                                     │
│         Error Title                 │
│         (24-32px bold)              │
│                                     │
│         Error Description           │
│         (16-18px regular)           │
│                                     │
│    ┌────────────────────────────┐  │
│    │ Primary CTA (Sage button)  │  │
│    └────────────────────────────┘  │
│                                     │
│    ┌────────────────────────────┐  │
│    │ Secondary CTA (if needed)  │  │
│    └────────────────────────────┘  │
│                                     │
│    ────────────────────────────    │
│         Support Contact Info        │
│                                     │
└─────────────────────────────────────┘
```

## Error Types

### 404 - Page Not Found

```typescript
<ErrorPage
  errorType="404"
  secondaryAction={{
    label: "Go Back",
    onClick: () => window.history.back(),
    icon: <IoArrowBack className="w-5 h-5" />,
  }}
/>
```

**Display**: Shows "404" in gradient text with back button option

### 401 - Authentication Required

```typescript
<ErrorPage
  errorType="401"
  secondaryAction={{
    label: "Try Again",
    onClick: () => window.history.back(),
    icon: <IoArrowBack className="w-5 h-5" />,
  }}
/>
```

**Display**: Directs user to login, explains authentication is needed

### 403 - Access Denied

```typescript
<ErrorPage
  errorType="403"
  title="Access Denied"
  description="You don't have permission to access this resource."
/>
```

**Display**: Clear explanation of permission restriction

### 500 - Server Error

```typescript
<ErrorPage
  errorType="500"
  description="Something went wrong on our end. Our team has been notified and is working on it."
/>
```

**Display**: Reassures user issue is being addressed

### 503 - Service Unavailable

```typescript
<ErrorPage
  errorType="503"
  description="We're temporarily down for maintenance. We'll be back shortly."
/>
```

**Display**: Explains temporary nature of issue

### Generic Error

```typescript
<ErrorPage
  errorType="error"
  title="Custom Title"
  description="Custom error message"
/>
```

**Display**: Flexible fallback for custom error scenarios

## Error Boundary Usage

### Main Application Error Boundary

Located in: [src/app/components/ErrorBoundary/ErrorBoundary.tsx](../ErrorBoundary/ErrorBoundary.tsx)

Catches unexpected errors throughout the application with:
- Automatic retry mechanism
- Development mode error details
- Repeated error detection
- Support contact information

### Onboarding Error Boundary

Located in: [src/app/components/Onboarding/OnboardingErrorBoundary.tsx](../Onboarding/OnboardingErrorBoundary.tsx)

Specialized boundary for onboarding flow with:
- Soft error recovery UI
- Refresh page option
- Context-aware messaging
- Development error details

## Animation & Motion

All error pages include subtle, premium animations:

### Entrance Animation (FadeInUp)
- 0.5s duration
- Sequential delay for elements (0.1s, 0.2s, 0.3s, etc.)
- Easing: ease-out

### Micro-interactions
- Button hover states with slight scale (1.02x)
- Shadow elevation on hover
- Smooth transitions (300ms)
- Focus rings with sage color

### Loading Spinners
- Rotating circular borders
- Sage color (#7D9B76)
- 2px border width
- Smooth, continuous rotation

## Implementation Guide

### Using the ErrorPage Component

```tsx
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import { IoArrowBack } from "react-icons/io5";

export default function CustomErrorPage() {
  return (
    <ErrorPage
      errorType="404"
      title="Custom Title (optional)"
      description="Custom description (optional)"
      primaryAction={{
        label: "Custom Button",
        href: "/custom-path",
        icon: <CustomIcon />,
      }}
      secondaryAction={{
        label: "Back",
        onClick: () => window.history.back(),
        icon: <IoArrowBack className="w-5 h-5" />,
      }}
      showContactSupport={true}
      supportEmail="support@sayso.com"
    />
  );
}
```

### Props Reference

```typescript
interface ErrorPageProps {
  errorType?: "404" | "401" | "403" | "500" | "503" | "error";
  title?: string;                          // Override default title
  description?: string;                    // Override default description
  icon?: React.ReactNode;                  // Custom icon
  primaryAction?: {                        // Override default primary button
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
  secondaryAction?: {                      // Optional secondary button
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  showContactSupport?: boolean;            // Show support contact (default: true)
  supportEmail?: string;                   // Custom support email
}
```

### Using Error Boundaries

```tsx
import { ErrorBoundary } from "@/app/components/ErrorBoundary/ErrorBoundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. **Be Specific, Not Generic**
- Provide clear, specific error messages
- Explain what went wrong and why
- Help users understand the context

### 2. **Provide Clear Action**
- Always include at least one primary CTA
- Make recovery paths obvious
- Consider including "go back" for navigation errors

### 3. **Maintain Tone**
- Professional but approachable
- Empathetic without being overly casual
- Consistent with brand voice

### 4. **Consider Context**
- 404: User navigated to wrong place → navigation focus
- 401: User needs authentication → login focus
- 500: System issue → reassurance focus
- 503: Temporary downtime → wait/check status focus

### 5. **Accessibility**
- Ensure sufficient color contrast (WCAG AA minimum)
- Provide alternative text for icons
- Make focus states clearly visible
- Don't rely on color alone to convey meaning

## Common Error Page Scenarios

### Authentication Errors
**Path**: [src/app/auth/auth-code-error/page.tsx](../auth/auth-code-error/page.tsx)

Uses ErrorPage component with 401 type, directs to login.

### Page Not Found Errors
**Path**: [src/app/not-found.tsx](../not-found.tsx)

Uses ErrorPage component with 404 type, includes go-back option.

### Application Errors
Caught by ErrorBoundary component in page layouts. User sees:
- Error message
- Retry option
- Home page link
- Development error details (dev mode only)

### Onboarding Errors
Caught by OnboardingErrorBoundary in onboarding flow. User sees:
- Soft error UI within modal
- Retry and refresh options
- Continues onboarding flow after recovery

## Responsive Design

### Mobile (< 640px)
- Full-width buttons stacked vertically
- Larger touch targets (48px minimum)
- Optimized spacing for small screens
- Smaller typography (but readable)

### Tablet (640px - 1024px)
- Side-by-side buttons if space allows
- Increased padding around content
- Balanced typography sizes

### Desktop (> 1024px)
- Optimal spacing with centered content
- Larger typography for better hierarchy
- Maximum width constraint (448px for content)

## Dark Mode

Currently not implemented. Error pages lock to light mode to match application design. If dark mode is added in future:

- Adapt backgrounds to dark-friendly palette
- Increase text color brightness for contrast
- Maintain color relationships in dark palette
- Test WCAG contrast ratios for dark theme

## Testing

### Manual Testing Checklist
- [ ] Error page displays correctly on mobile, tablet, desktop
- [ ] All buttons navigate/trigger correctly
- [ ] Animations run smoothly without jank
- [ ] Text is readable with sufficient contrast
- [ ] Focus states are visible for keyboard navigation
- [ ] Support email link works correctly
- [ ] Error boundary catches errors gracefully
- [ ] Dev error details appear only in development

### Error Simulation
To test error pages in development:

1. **404 Page**: Navigate to non-existent route (e.g., `/nonexistent`)
2. **Error Boundary**: Throw error in component (dev testing only)
3. **Auth Error**: Navigate to `/auth/auth-code-error?error=Custom%20Error`

## Future Enhancements

1. **Error Analytics**: Track which errors users encounter most
2. **Contextual Help**: Link to relevant help articles
3. **Automatic Recovery**: Detect transient errors and auto-retry
4. **Error Reporting**: User-initiated error reports with context
5. **Multi-language Support**: Translate error messages
6. **Custom Branding**: Allow customization per application section

## Files Reference

- **Component**: [src/app/components/ErrorPages/ErrorPage.tsx](./ErrorPage.tsx)
- **Error Boundary**: [src/app/components/ErrorBoundary/ErrorBoundary.tsx](../ErrorBoundary/ErrorBoundary.tsx)
- **Onboarding Boundary**: [src/app/components/Onboarding/OnboardingErrorBoundary.tsx](../Onboarding/OnboardingErrorBoundary.tsx)
- **404 Page**: [src/app/not-found.tsx](../../not-found.tsx)
- **Auth Error**: [src/app/auth/auth-code-error/page.tsx](../../auth/auth-code-error/page.tsx)

## Support

For questions or inconsistencies with error pages, please:
1. Review this documentation
2. Check component props and usage patterns
3. Ensure design tokens are used correctly
4. Verify color contrast and accessibility
5. Test across device sizes

---

Last Updated: January 2026
Design System Version: 1.0
