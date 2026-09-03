# DISCORA — INQUIRY EXPERIENCE IMPLEMENTATION PLAN

**Date**: 2026-09-03
**Status**: Plan Only — Awaiting User Approval
**Target**: Inquiry Experience Architecture Implementation

---

## 1. PHASED EXECUTION ROADMAP

### Phase 1 — Service & Context Provider Foundation
- **Files**:
  - `src/features/inquiries/services/inquiry-service.ts` `[NEW]`
  - `src/features/inquiries/hooks/use-inquiries.ts` `[NEW]`
  - `src/features/inquiries/components/inquiry-data-provider.tsx` `[NEW]`
- **Changes**: Consolidate inquiry API calls and TanStack Query hooks under `src/features/inquiries/`.
- **Validation**: `npm run lint` pass.

### Phase 2 — Standalone Inquiry Route (`/inquiries/[id]`)
- **Files**:
  - `src/app/inquiries/[id]/page.tsx` `[NEW]`
  - `src/features/inquiries/components/inquiry-detail.tsx` `[NEW]`
- **Changes**: Build standalone page for shareable inquiry links, displaying parent claim context, response thread, and creator satisfaction controls.
- **Validation**: Direct navigation to `/inquiries/[id]` renders cleanly.

### Phase 3 — Component Extraction & Refactoring
- **Files**:
  - `src/features/inquiries/components/inquiry-card.tsx` `[NEW]`
  - `src/features/inquiries/components/inquiry-response-list.tsx` `[NEW]`
  - `src/features/inquiries/components/inquiry-satisfaction-bar.tsx` `[NEW]`
- **Changes**: Extract inline components from `src/features/debates/components/inquiry-item.tsx` into modular reusable components.
- **Validation**: Zero breaking changes to `DebateInquiriesTab`.

### Phase 4 — Discussion & Debate Integration
- **Files**:
  - `src/features/discussions/components/room-questions-tab.tsx` `[MODIFY]`
  - `src/features/debates/components/debate-inquiries-tab.tsx` `[MODIFY]`
- **Changes**: Wire extracted inquiry components into Discussion and Debate detail pages.
- **Validation**: Existing Discussion and Debate pages function seamlessly.

### Phase 5 — Mobile & Accessibility Optimization
- **Files**:
  - `src/features/inquiries/components/inquiry-create-dialog.tsx` `[MODIFY]`
- **Changes**: Add responsive mobile bottom-sheet styling, minimum touch targets (44px), and keyboard focus rings.
- **Validation**: Test viewports at 375px, 390px, 768px, 1024px, 1440px.

### Phase 6 — Build & Verification Pass
- **Commands**:
  - `npm run lint`
  - `npm run build`
- **Validation**: 0 lint errors, 0 build errors.

---

## 2. RISK MITIGATION & CONSTRAINTS

1. **Database Immutability**: No database schema modifications or migrations allowed during UI implementation.
2. **Backwards Compatibility**: Do not modify existing `questions` or `inquiry_items` RPC signatures.
3. **Zero Fake Data**: Use real Supabase query responses exclusively.
