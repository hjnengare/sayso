# Business Verification System – Minimal Test Plan

Use this as a checklist for manual or automated tests. Run after applying migration `20260130_business_verification_otp_docs_admin.sql` and creating the `business-verification` storage bucket if needed.

## 1. OTP rate limits and expiry

- **Send OTP**  
  - Call `POST /api/verification/otp/send` with `{ claimId }` as claimant (or admin).  
  - Expect `200` with `ok: true`, `maskedPhone`, `expiresInSeconds`.  
  - Without SMS configured (dev), send may still return success (placeholder logs).
- **Rate limit**  
  - Send OTP 4 times within 30 minutes for the same claim.  
  - 4th request should return `429` and message about 30 minutes.
- **Expiry and attempts**  
  - Request OTP, then call `POST /api/verification/otp/verify` with wrong code 5 times.  
  - 6th attempt (or first after 5 wrong) should return `429` (too many attempts).  
  - After 10+ minutes, verify with correct code should return “No valid verification code” (expired); request new OTP and verify with correct code should succeed.

## 2. Document type/size enforcement

- **Upload**  
  - `POST /api/verification/docs/upload` (multipart: `claimId`, `docType`, `file`) as claimant, claim status `action_required`.  
  - Allowed: PDF, JPG, PNG; max 5MB.  
- **Reject type**  
  - Send `docType: "letterhead_authorization"` with a `.txt` or disallowed type; expect `400` (only PDF, JPG, PNG).
- **Reject size**  
  - Send file &gt; 5MB; expect `400` (max 5MB).

## 3. Admin-only doc access

- **Signed URL**  
  - As non-admin: `GET /api/admin/docs/{docId}/signed-url` → `403`.  
  - As admin: same request → `200` with `url` (or `404` if doc missing).  
- **Admin claims list/detail**  
  - As non-admin: `GET /api/admin/claims` and `GET /api/admin/claims/{claimId}` → `403`.  
  - As admin: list and detail return data.

## 4. Auto-delete and immediate delete on approve/reject

- **Immediate delete on finalize**  
  - Create a claim, request docs, upload a document.  
  - Approve or reject the claim via admin API.  
  - Confirm `business_claim_documents` has no rows for that claim and storage object is removed (or 404 via signed URL).
- **Daily cleanup**  
  - Call `GET /api/cron/cleanup-claim-docs` with `Authorization: Bearer <CRON_SECRET>`.  
  - For rows with `delete_after < now()`, confirm they are deleted and storage objects removed.  
  - Optionally call RPC `cleanup_expired_business_claim_otp()` (or via cron route if wired) and confirm expired OTP rows are removed.

## 5. Notifications and emails

- **In-app**  
  - After OTP send, docs requested, docs received, approve, reject: confirm a row in `notifications` for the claimant with correct `type` and `claim_id`.  
  - Bell/dropdown shows new notification (and mark-read works).
- **Email**  
  - OTP sent, OTP verified, docs requested, docs received, claim status changed (e.g. rejected): confirm claimant receives the corresponding email (no change to existing “claim received” / “claim approved” templates).

## 6. Existing behaviour unchanged

- Submit new claim via existing claim modal/API → still works; “claim received” email unchanged.  
- Admin approve via existing approve API → still works; “claim approved” email unchanged; documents for that claim are deleted from storage and table.  
- Auth and middleware: no new redirects or broken routes for non-admin users.
