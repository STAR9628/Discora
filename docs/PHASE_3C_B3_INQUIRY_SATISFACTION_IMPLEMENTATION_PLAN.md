# PHASE 3C-B.3: INQUIRY RESPONSE SATISFACTION IMPLEMENTATION PLAN

**Status**: DEFERRED SPECIFICATION — ZERO-CODE PASS  
**Date**: September 2026  
**Implementation Decision**: **DEFER**  
**Prerequisite Requirement**: Data-model migration introducing response-level satisfaction attribution (`satisfied_response_id`, `satisfied_at`).

---

## 1. Decision Statement

Based on the empirical audit of the Discora repository and live Supabase schema:
- **Phase 3C-B.3 is DEFERRED.**
- Zero application source code is modified in this pass.
- Zero database migrations are applied in this pass.
- Zero git commits are created in this pass.

This document serves as the **executable implementation blueprint** for the future milestone when the necessary schema migration is approved.

---

## 2. Target Scope (When Unblocked)

When scheduled, Phase 3C-B.3 will implement:
1. One additive database migration adding response-level satisfaction attribution and defining the secure RPC `get_my_resolved_inquiries`.
2. Service functions in `src/features/homepage/services/homepage-personal-service.ts`.
3. Hook integration in `src/features/homepage/hooks/use-homepage.ts`.
4. Card rendering in `src/features/homepage/components/logged-in-homepage.tsx`.

---

## 3. Files to Create & Modify (Future Milestone)

### Files to Create:
1. `supabase/migrations/202606180003_add_inquiry_satisfaction_attribution.sql`
   - Add columns `satisfied_response_id` and `satisfied_at` to `public.inquiry_items`.
   - Update `satisfy_inquiry` RPC to record the specific satisfying response.
   - Define `get_my_resolved_inquiries(p_limit int)`.

### Files to Modify:
1. `src/features/homepage/services/homepage-personal-service.ts`
   - Define `ResolvedInquiry` interface.
   - Add `getMyResolvedInquiries(limit?: number)`.
2. `src/features/homepage/hooks/use-homepage.ts`
   - Add `useMyResolvedInquiries(limit?: number)`.
3. `src/features/homepage/components/logged-in-homepage.tsx`
   - Add `ResolvedInquiries` component and place it within `PersonalizedUpdates`.
4. `src/features/inquiries/services/inquiry-service.ts` & `inquiry-satisfaction-bar.tsx`
   - Pass optional `responseId` when calling `satisfyInquiry`.

---

## 4. Database Migration Specification (Future)

```sql
-- Migration: 202606180003_add_inquiry_satisfaction_attribution.sql
-- Add response-level attribution columns
alter table public.inquiry_items
  add column if not exists satisfied_response_id uuid references public.inquiry_responses(id) on delete set null,
  add column if not exists satisfied_at timestamptz;

-- Update satisfy_inquiry to accept optional satisfying response id
create or replace function public.satisfy_inquiry(
  p_inquiry_item_id uuid,
  p_response_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.inquiry_items
    where id = p_inquiry_item_id and created_by = v_user_id
  ) then
    raise exception 'only_inquirer' using hint = 'Only the inquiry creator can mark it as satisfied.';
  end if;

  select room_id into v_room_id
  from public.inquiry_items
  where id = p_inquiry_item_id;

  update public.inquiry_items
  set status = 'satisfied',
      satisfied_response_id = p_response_id,
      satisfied_at = now(),
      updated_at = now()
  where id = p_inquiry_item_id and status = 'responded';

  if not found then
    raise exception 'invalid_state' using hint = 'Inquiry must be in responded state.';
  end if;

  perform public.create_reputation_event(
    v_user_id,
    'INQUIRY_SATISFIED',
    2,
    jsonb_build_object(
      'inquiry_item_id', p_inquiry_item_id,
      'response_id', p_response_id,
      'room_id', v_room_id
    )
  );
end;
$$;

-- Create personal RPC for responders
create or replace function public.get_my_resolved_inquiries(p_limit int default 5)
returns json[]
language sql
security definer
stable
set search_path = public
as $$
select coalesce(
  array(
    select json_build_object(
      'inquiry_id', ii.id,
      'inquiry_content', ii.content,
      'inquiry_type', ii.inquiry_type,
      'satisfied_at', ii.satisfied_at,
      'response_id', ir.id,
      'response_content', ir.content,
      'target_claim_id', c.id,
      'target_claim_content', c.content,
      'room_id', r.id,
      'room_title', r.title,
      'room_slug', r.slug,
      'room_type', r.room_type,
      'inquirer_username', coalesce(p.username, 'Contributor'),
      'inquirer_avatar_url', p.avatar_url
    )
    from inquiry_items ii
    join inquiry_responses ir on ir.id = ii.satisfied_response_id
    join claims c on c.id = ii.target_claim_id
    join rooms r on r.id = ii.room_id
    left join profiles p on p.id = ii.created_by
    where ir.created_by = auth.uid()
      and ii.status = 'satisfied'
      and ii.satisfied_at >= now() - interval '14 days'
      and c.is_retracted = false
      and (
        (r.visibility = 'public' and r.status <> 'archived')
        or r.created_by = auth.uid()
      )
      and not exists (
        select 1 from moderation_flags mf
        where mf.claim_id = c.id and mf.status = 'resolved_hidden'
      )
    order by ii.satisfied_at desc
    limit least(greatest(coalesce(p_limit, 5), 1), 20)
  ),
  '{}'::json[]
);
$$;

revoke all on function public.get_my_resolved_inquiries(int) from public, anon;
grant execute on function public.get_my_resolved_inquiries(int) to authenticated;
```

---

## 5. Frontend Integration Plan (Future)

### Service Layer (`homepage-personal-service.ts`):
```typescript
export interface ResolvedInquiry {
  inquiryId: string;
  inquiryContent: string;
  inquiryType: string;
  satisfiedAt: string;
  responseId: string;
  responseContent: string;
  targetClaimId: string;
  targetClaimContent: string;
  roomId: string;
  roomTitle: string;
  roomSlug: string;
  roomType: string;
  inquirerUsername: string;
  inquirerAvatarUrl: string | null;
}
```

### Hook Layer (`use-homepage.ts`):
```typescript
export function useMyResolvedInquiries(limit = 5) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["homepage", "my-resolved-inquiries", limit],
    queryFn: () => getMyResolvedInquiries(limit),
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}
```

### UI Component (`logged-in-homepage.tsx`):
- Render card with `border-emerald-500/30 bg-emerald-950/10`.
- Label: `Resolved Inquiry`
- Headline: *"A response you provided resolved an open inquiry"*
- Target Claim snippet: *"On claim: '[claimContent]' in [roomTitle]"*
- User response excerpt: *"[responseContent]"*
- Destination link: `/inquiries/[inquiryId]#response-[responseId]`

---

## 6. QA & Verification Strategy (Future Execution)

### Static Validation:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Responsive Browser QA:
- 1440px (Desktop), 1024px (Tablet Landscape), 768px (Tablet Portrait), 390px (Mobile), 375px (Small Mobile).
- Verify zero horizontal overflow, no clipping, correct badge styling.

### Security QA:
- Verify `auth.uid()` cannot be spoofed.
- Verify private/archived rooms are completely omitted from results.
- Verify moderation-hidden content is excluded.

---

## 7. Explicit Non-Goals

The future Phase 3C-B.3 implementation will NOT include:
- Notification center, badge counters, or unread toggles.
- Email or push alerts.
- Gamification mechanics, trophies, or winner banners.
- Merging Questions with Structured Inquiries.
- Client-side user ID parameters in RPCs.
- Speculative ungrounded temporal windows.
