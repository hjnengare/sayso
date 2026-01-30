# Business Verification System (3 Tiers)

Multi-layer business verification with clear trust levels, privacy protection, and minimal personal data collection.

## Verification Tiers

### Tier 1 — Primary (Automated Where Possible)

1. **Business Email Verification (Preferred)**
   - User enters a business email during claim.
   - If the email domain matches the official business website domain → **auto-verify**.
   - Example: `info@abcplumbing.co.za` ↔ `www.abcplumbing.co.za`
   - Free personal domains (Gmail, Yahoo, Outlook, iCloud, etc.) **cannot** auto-verify.
   - Personal emails can still be used but require additional verification (phone OTP or CIPC).

2. **Phone OTP Verification**
   - OTP sent to the **public business phone number** listed on the profile.
   - User enters OTP → verification passes.
   - Phone must match the number on the business listing.

### Tier 2 — CIPC (Business Registration)

- Used for registered businesses.
- User provides: **Company Registration Number**, **Company Name**.
- No document uploads. Verification handled manually by admins (future: CIPC API).
- Only company existence and name match are checked.

### Tier 3 — Documents (Last Resort Only)

- Triggered only if: no business email, phone cannot be verified, business not registered, or claim disputed.
- **Allowed documents (2 types only):**
  - Letter on official business letterhead (business name/logo, contact details, statement authorizing claimant).
  - Lease agreement (first page only; business name; all personal info removed).
- **Prohibited:** ID books/cards, full utility bills, anything with ID numbers, bank details, account numbers.
- Documents: stored securely, admin-only access, **deleted after 30 days or immediately after verification** (whichever first). After deletion, only verification status, method, and date are stored.

## Status States (UI)

| Status              | Meaning                                      |
|---------------------|----------------------------------------------|
| Pending Verification | System checking methods / evaluating claim  |
| Action Required     | User must complete OTP or upload docs        |
| Under Review        | Admin reviewing CIPC or documents            |
| Verified            | Business approved                            |
| Rejected            | Claim denied (with reason)                    |

Mapping to DB: `draft` → user filling; `pending` → Pending Verification / Action Required / Under Review (by method); `verified` → Verified; `rejected` → Rejected.

## Verification Method Detection (After Submit)

| Condition                          | Action                |
|-----------------------------------|------------------------|
| Business email domain matches website | Auto-verify           |
| Personal email                    | Require phone OTP or CIPC |
| Valid business phone              | Send OTP               |
| CIPC provided                     | Move to manual CIPC review |

## Data Privacy & Retention

- Uploaded documents: secure storage, admin-only, deleted after **30 days** OR immediately after verification (whichever first).
- After deletion we store only: verification status, verification method (email / phone / cipc / documents), date of verification. No documents, no personal data, no IDs.

## Public Trust Signal

- Once verified: show **Verification Badge** on the business profile.
- Badge indicates business legitimacy (claimed and verified), not legal certification.

## Admin Panel

- Admins can: view claims, see verification method attempts, approve/reject, request documents (only if Tier 3 triggered).

## Technical Notes

- Claims live in `business_claims`; RPCs: `start_business_claim`, `verify_business_claim`.
- OTP: `claim_verification_otps`; documents: `claim_documents` (types: `authorisation_letter`, `lease` only for new uploads).
- Businesses: `owner_id`, `owner_verified`, `owner_verification_method`, `owner_verified_at`.
