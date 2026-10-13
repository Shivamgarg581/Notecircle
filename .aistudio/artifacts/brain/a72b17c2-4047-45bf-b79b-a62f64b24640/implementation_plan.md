# NoteCircle — Neo-Brutalist Redesign: Audit, Risk Analysis & Phased Implementation Plan

> **Brand**: NoteCircle — Private Notes & Chat for Your Trusted Circle  
> **Brand Promise**: *Private by default. Temporary by design. Meaningful by choice.*  
> **Aesthetic**: Tactile Neo-Brutalist Social Notebook — tactile paper grain, bold ink outlines, hard offset drop shadows, expressive hand-drawn SVG stickers & washi-tape details, and responsive mobile-first typography.

---

## 1. Executive Summary & Aesthetic Architecture

NoteCircle is being redesigned into a bold, playful, tactile **Neo-Brutalist private social notebook**. Unlike generic dashboards or flat mobile templates, NoteCircle feels like a physical creative notebook/poster transformed into an encrypted digital companion.

### Color Tokens & Theme Presets
1. **Classic Cream** (*Default Light*):
   - Canvas: Warm Cream (`#FAF7F0`)
   - Primary Ink: Jet Black (`#111111`)
   - Accent: Electric Yellow (`#FFCA05`)
   - Secondary Accent: Soft Mint (`#D8F3DC`), Coral (`#FF6B6B`), Sky Blue (`#4D96FF`)
   - Borders: Ink Black (`#111111`, 2px/2.5px solid)
   - Shadows: Hard offset `shadow-[3px_3px_0px_#111111]` and `shadow-[4px_4px_0px_#111111]`
2. **Dark Ink Notebook** (*Separately Considered Dark Mode*):
   - Canvas: Deep Charcoal / Ink Black (`#111111` / `#16161B`)
   - Paper Cards: Deep Slate (`#1E1E24` / `#22222A`)
   - Text: Cream / Bone (`#F5F2EB`)
   - Highlights: Electric Yellow (`#FFCA05`)
   - Borders: Bone / Slate (`#3E3E4A` / `#D4CEBF`)
   - Shadows: Deep offset `shadow-[3px_3px_0px_#000000]`
3. **Electric Yellow** (*Vibrant Highlight Preset*):
   - Canvas: Electric Yellow (`#FFCA05`)
   - Paper Cards: Crisp Warm Cream (`#FAF7F0`)
   - Text & Outlines: Dense Ink (`#111111`)
   - Accent: Hot Coral (`#FF6B6B`) and Mint (`#D8F3DC`)
4. **Soft Mint** (*Botanical Calm Preset*):
   - Canvas: Soft Mint (`#D8F3DC`)
   - Paper Cards: Warm Cream (`#FAF7F0`)
   - Text & Outlines: Dense Ink (`#111111`)
   - Accent: Electric Yellow (`#FFCA05`) and Sage Forest

---

## 2. Comprehensive Repository Audit & Architecture Inventory

### A. Frontend Architecture
- **Framework & Build**: React 19 + TypeScript + Vite 8.
- **Styling**: Tailwind CSS v4 with custom utility tokens.
- **Component Inventory**:
  - `App.tsx`: Top-level orchestrator, active tab routing, header actions, modal triggers, theme switcher, offline banner.
  - `Navigation.tsx`: 5-item bottom dock (`STREAM`, `NOTES`, `+`, `CHAT`, `CIRCLE`) + desktop floating dock.
  - `HomeFeed.tsx`: Main stream with availability carousel, broadcast cards, reaction badges, and inline reply drawers.
  - `CreateNoteModal.tsx`: Note authoring canvas, character counter, mood chips, audience selector (Circle vs Close Friends), expiry controls, and offline IndexedDB draft queue.
  - `NotesHistory.tsx`: Notebook archive with segmented tabs (`Active`, `Scheduled`, `Drafts`, `Expired`, `Templates`, `Inner Circle`), batch actions, and reposting.
  - `ChatView.tsx`: 1:1 conversation drawer, real-time message bubble list, reaction dock, reply previews, and cryptographic safety-number modal.
  - `SearchAndConnections.tsx`: Trusted circle management with tabs (`Find People`, `Requests`, `My Circle`), exact username queries, and follow/accept/reject handlers.
  - `ProfileView.tsx`: User cover, avatar badge, display name, username, bio, active broadcast note, connection status, and edit-profile modal.
  - `SettingsView.tsx`: Grouped settings (`Account`, `Appearance`, `Privacy`, `Security`, `Alerts`, `Storage`, `Android Companion Mode`).
  - `AvailabilityModal.tsx`: 9 presence cards (`Available`, `DND`, `Busy`, `Travelling`, etc.), custom emoji/note, and expiration timer.
  - `NotificationsModal.tsx`: Activity drawer with unread indicators, mark-as-read, and request navigation.
  - `BugReportModal.tsx`: Bug ticket submission with error code identifiers, device info, and screenshot attachment.
  - `SupportModal.tsx`: Privacy & security FAQ, encryption explainer, and direct inquiry form.
  - `AdminPanel.tsx`: Server-verified administration panel with real database counters, abuse report moderation queue, and ticket handling.
  - `AndroidFrame.tsx`: Responsive companion frame simulating mobile viewports for preview testing.

### B. Backend API & Real Database Architecture
- **Runtime Server**: Express 4 server (`server.ts`) running on port 3000 with Vite middleware integration.
- **Database**: Real Supabase PostgreSQL database with **20 authoritative relational tables**:
  1. `users`, 2. `user_keys`, 3. `user_preferences`, 4. `user_availability`, 5. `notes`, 6. `note_reactions`, 7. `note_replies`, 8. `note_drafts`, 9. `note_templates`, 10. `conversations`, 11. `messages`, 12. `message_reactions`, 13. `connections`, 14. `close_friends`, 15. `notifications`, 16. `sessions`, 17. `registration_otps`, 18. `bug_reports`, 19. `support_tickets`, 20. `audit_logs`.
- **Database Security (RLS)**:
  - Row Level Security policies active across all tables.
  - Direct anonymous reads of sensitive tables (`audit_logs`, `sessions`, `registration_otps`) strictly rejected.
  - Server endpoints authenticate requests via session cookies and server-side bearer tokens.

### C. Cryptography & Security Subsystem
- **Client-Side E2EE (`crypto.ts`)**:
  - Key pairs generated in browser using Web Crypto API (ECDH / AES-GCM 256-bit).
  - Private keys never leave user's local browser / IndexedDB (`localDb.ts`).
  - Server only stores and delivers encrypted payloads (`ciphertext`, `nonce`, `salt`).
  - Server strictly rejects unencrypted chat payloads (validated in security test suite).
  - SHA-256 Safety Number computation for out-of-band key verification.

### D. Authentication & Anti-Abuse
- **Registration**: Direct registration protected by Turnstile CAPTCHA and Gmail address normalization (preventing duplicate alias signups).
- **Session Management**: Cryptographically random session tokens stored in HTTP-only/secure cookies and tracked in Supabase `sessions` table.
- **Admin Verification**: Strict server-side verification using database roles; client-side flags are never trusted.

---

## 3. Identified Risks & Architectural Mitigations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **E2EE Key or Ciphertext Degradation** | Compromises user privacy and breaks message delivery. | Maintain strict separation of ciphertext handling; never touch `crypto.ts` or message payload formats during styling passes. |
| **Server-Side Security & RLS Regressions** | Data leakage or unauthorized cross-user modifications. | Run the 28-point end-to-end security audit suite (`npm run test:security`) after every component batch. |
| **Mobile Layout Overflow & Touch Targets** | Broken UI on small phone screens (320px–390px). | Enforce strict `overflow-x-hidden`, minimum 44px touch targets, responsive font scales, and bottom navigation safe-area padding. |
| **Dark Mode Contrast Issues** | Illegible text or low contrast on hard shadows. | Distinct dark theme design tokens (`#F5F2EB` text on `#1E1E24` surfaces with bone borders `#D4CEBF`); no simple CSS inversion. |
| **Demo / Mock Data Reintroduction** | Violates privacy and production guidelines. | Strict policy: Zero fake data, zero hardcoded mock arrays. Always render real database records with polished empty-state illustrations. |

---

## 4. Phased Implementation Plan

### Phase 1: Design Tokens, Typography & Original SVG Asset Suite
- Standardize Neo-Brutalist CSS tokens in `index.css`:
  - Outlines (`border-2 border-[#111111]`)
  - Hard offset drop shadows (`shadow-[3px_3px_0px_#111111]`, `shadow-[5px_5px_0px_#111111]`)
  - Tactile spring press classes (`active:translate-x-[2px] active:translate-y-[2px]`)
  - Washi-tape stickers, binder ring motifs, and paper texture patterns.
- Create SVG assets:
  - Animated 'N' notebook badge.
  - Empty notebook feather-pen illustration.
  - Washi-tape headers and pushpin stickers.
  - Verified check stamps and mood stickers.
- Milestone validation: `npm run lint` & verify visual token exports.

### Phase 2: Navigation Dock, Top Bar & Onboarding Flow
- **Navigation Dock (`Navigation.tsx`)**:
  - 5-item dock (`STREAM`, `NOTES`, `+`, `CHAT`, `CIRCLE`).
  - Mobile bottom bar with safe-area spacing and active indicator.
  - Desktop floating dock integration.
- **Top Bar (`App.tsx`)**:
  - Tactile brand badge, availability mood pill, theme preset dropdown, notifications bell, and settings gear.
- **Splash & Onboarding (`AuthModal.tsx` & Welcome)**:
  - Animated 'N' notebook reveal with immediate skip.
  - 3-card onboarding explaining private circles, temporary notes, and E2EE chat.
  - Celebration sticker splash on account activation.
- Milestone validation: `npm run lint` & `compile_applet`.

### Phase 3: Main Stream & Note Creation System
- **Main Feed (`HomeFeed.tsx`)**:
  - Notebook header with live date stamp.
  - Circle availability carousel with status stickers.
  - Expressive note cards with varied pastel card tones, expiration countdown, reaction badges, and inline reply drawers.
  - Tactile empty state when circle has no active notes.
- **Create Note Canvas (`CreateNoteModal.tsx`)**:
  - Notebook writing card with washi-tape corners.
  - Mood & activity sticker selectors.
  - Character counter (280 max) and audience toggle (Entire Circle vs Close Friends).
  - Tactile "Publish Note" button with spring press feedback.
- Milestone validation: Verify note creation, draft saving, and reaction persistence.

### Phase 4: Encrypted Chat & Safety Center
- **Chat Inbox & View (`ChatView.tsx`)**:
  - Conversation list with online status pips and unread badges.
  - Outgoing bubbles in Electric Yellow with ink outline; Incoming bubbles in Cream Paper with hard drop shadow.
  - E2EE Lock indicator and SHA-256 Safety Number verification dialog.
  - Reaction dock, reply drawer, and mobile keyboard-safe composer.
  - Automatic bottom navigation hiding during active chat.
- Milestone validation: Run `npm run test:security` for E2EE delivery and unauthorized access checks.

### Phase 5: Circle, Profile & Settings Views
- **Circle & Connections (`SearchAndConnections.tsx`)**:
  - Segmented notebook tabs: Find People, Requests, My Circle.
  - Privacy notices (zero public search discovery).
  - Tactile Accept/Decline action buttons.
- **Profile & Edit Profile (`ProfileView.tsx`)**:
  - Notebook cover header with sticker pins.
  - Circular avatar with status ring and native gallery upload picker.
  - Broadcast note preview and quick reply trigger.
- **Settings View (`SettingsView.tsx`)**:
  - Grouped sections: Account, Appearance (4 theme presets), Privacy, Security, Alerts, Storage, Companion Frame.
- **Modals (`AvailabilityModal.tsx`, `NotificationsModal.tsx`, `BugReportModal.tsx`, `SupportModal.tsx`, `AdminPanel.tsx`)**:
  - Consistent tactile Neo-Brutalist cards, high contrast, and smooth transitions.
- Milestone validation: `npm run lint` & `compile_applet`.

### Phase 6: Full QA & Comprehensive Verification
- Execute `npm run lint` across all components (0 errors).
- Execute `compile_applet` (clean production build).
- Execute `npm run test:security` (all 28 automated checks passing).
- Validate responsive layouts at 320px, 375px, 768px, 1024px, and 1440px.
- Validate all 4 theme presets in high contrast.

---

## 5. Non-Negotiable Core Architecture Preservation

- **Real Supabase PostgreSQL Database**: No local mock data; all 20 tables and RLS security rules are preserved.
- **Authoritative Server Persistence**: Private chat history, notes, reactions, and connections reside securely in Supabase.
- **Zero Mock Policy**: Genuine empty states ("No active conversations yet", "Your circle has no notes today") instead of fake seeded demo users or cards.
- **Client-Side E2EE Cryptography**: Unbroken AES-GCM and ECDH cryptographic pipeline.
- **Email Normalization & CAPTCHA**: Direct registration security with Turnstile protection and Gmail alias deduplication.

---

## 6. Verification Checklist

1. [x] **Lint & Type Safety**: `npm run lint` passes with 0 errors.
2. [x] **Production Compilation**: `compile_applet` succeeds cleanly.
3. [x] **Security Audit Suite**: `npm run test:security` passes all 28 automated checks:
   - Supabase RLS policies (audit logs, sessions, OTPs, notes, users)
   - Admin authentication & authorization
   - Turnstile CAPTCHA enforcement
   - Gmail dot/plus normalization deduplication
   - Avatar upload & magic bytes validation
   - E2EE ciphertext persistence and delivery verification
4. [ ] **User Acceptance**: Review implementation plan and proceed with incremental screen-by-screen refinements.
