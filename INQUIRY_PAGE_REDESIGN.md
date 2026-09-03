# DISCORA — INQUIRY EXPERIENCE REDESIGN SPECIFICATION

**Date**: 2026-09-03
**Status**: Proposal & Specification
**Target**: Inquiry Experience Architecture & User Interface

---

## 1. VISION & CORE PHILOSOPHY

The redesigned Inquiry Experience reinforces Discora's primary axiom: **"Questions before conclusions."**

Instead of treating questions as passive comments, the Inquiry system turns **uncertainty into an explicit reasoning workflow**:

$$\text{Question (Macro)} \longrightarrow \text{Claim (Assertion)} \longrightarrow \text{Inquiry (Micro Challenge)} \longrightarrow \text{Evidence / Response} \longrightarrow \text{Satisfaction}$$

---

## 2. REFINED INFORMATION HIERARCHY

The redesigned Inquiry Experience structures inquiries into three complementary presentation levels:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CONTEXTUAL CLAIM PANEL (Inline under Claim Cards)                  │
│    Shows active inquiries, inquiry type badges, and quick ask button.  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. ROOM UNCERTAINTY DASHBOARD (Inquiries Tab in Debates/Discussions)  │
│    Lists all room inquiries filtered by type & resolution status.      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. STANDALONE INQUIRY ROUTE (/inquiries/[id]) [NEW]                     │
│    Dedicated view for sharing, deep-linking, and full response thread.  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. INQUIRY TYPES & VISUAL IDENTIFIERS

The UI distinguishes the 3 core inquiry types using cognitive badges and icons:

| Inquiry Type | Visual Badge | Icon | Intent & Prompt |
| :--- | :--- | :--- | :--- |
| **Clarification** | `bg-amber-500/10 text-amber-400 border-amber-500/30` | `HelpCircle` | *"What do you mean by this statement?"* |
| **Evidence Request** | `bg-cyan-500/10 text-cyan-400 border-cyan-500/30` | `FileText` | *"What empirical source or data supports this claim?"* |
| **Assumption Check** | `bg-purple-500/10 text-purple-400 border-purple-500/30` | `AlertCircle` | *"What unstated assumptions are embedded in this claim?"* |

---

## 4. INQUIRY LIFECYCLE & SATISFACTION WORKFLOW

The lifecycle transitions are visually communicated through status pills:

```text
┌──────────┐     Respondent adds response     ┌───────────┐
│   OPEN   │ ───────────────────────────────> │ RESPONDED │
└──────────┘                                  └─────┬─────┘
     │                                              │
     │ Inquirer requests more                       │ Inquirer accepts
     v                                              v
┌─────────────┐                               ┌───────────┐
│ UNSATISFIED │ <──────────────────────────── │ SATISFIED │
└─────────────┘   Inquirer re-opens           └───────────┘
```

1. **OPEN** (`bg-blue-500/10 text-blue-400`): Question posted, awaiting response.
2. **RESPONDED** (`bg-amber-500/10 text-amber-400`): Response added by claim author or community.
3. **SATISFIED** (`bg-emerald-500/10 text-emerald-400`): Inquirer confirmed response resolved the question (+2 reputation).
4. **UNSATISFIED** (`bg-rose-500/10 text-rose-400`): Inquirer marked response insufficient.
5. **CLOSED** (`bg-muted/50 text-muted-foreground`): Inquirer closed question without satisfaction.

---

## 5. STANDALONE INQUIRY ROUTE SPECIFICATION (`/inquiries/[id]`)

To enable shareability and notification deep-linking, we propose a lightweight standalone route `/inquiries/[id]`:

### Layout Structure (`max-w-4xl`)
- **Breadcrumb Navigation**: `Rooms` → `[Room Title]` → `Inquiry #[id]`
- **Header**: Inquiry Question Content, Type Badge, Status Badge, Inquirer Avatar/Username, Creation Date.
- **Parent Claim Card**: Clickable card displaying the target `DiscussionClaim` with side indicator (`Proposition` / `Opposition`).
- **Response Thread**: Chronological list of `InquiryResponse` items with author trust badges and linked evidence references.
- **Action Bar**:
  - For Claim Author / Community: "Add Response" text area.
  - For Inquiry Creator: "Mark Satisfied" (Emerald button) and "Mark Unsatisfied" / "Close" buttons.

---

## 6. PROPOSED COMPONENT ARCHITECTURE

```text
src/features/inquiries/
├── components/
│   ├── inquiry-data-provider.tsx     # React context for inquiry state
│   ├── inquiry-card.tsx              # Reusable inquiry card
│   ├── inquiry-type-badge.tsx        # Type indicator badge
│   ├── inquiry-status-pill.tsx       # Status lifecycle pill
│   ├── inquiry-response-list.tsx     # Thread of responses
│   ├── inquiry-response-form.tsx     # Response input form
│   ├── inquiry-create-dialog.tsx     # Modal dialog to ask inquiry
│   └── inquiry-satisfaction-bar.tsx  # Creator satisfaction controls
├── hooks/
│   └── use-inquiries.ts              # Query & mutation hooks
└── services/
    └── inquiry-service.ts            # Supabase API queries & RPC callers
```

---

## 7. RESPONSIVE & ACCESSIBILITY SPECIFICATIONS

- **Mobile Viewports (375px, 390px)**: Single-column stack, full-width touch targets (`min-h-[44px]`), modal sheet drawer for inquiry creation.
- **Desktop Viewports (1024px, 1440px)**: Side-by-side claim context and response thread.
- **Accessibility**: ARIA `role="dialog"` for creation modal, `aria-live="polite"` for status updates, high-contrast dark mode badges.
