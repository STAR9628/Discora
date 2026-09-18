# Discora — Privacy Policy (Draft)
## Data Processing, Epistemic Privacy & Device Storage Notice

**Draft Status:** DRAFT — FOR INTERNAL & LEGAL REVIEW ONLY (NOT YET PUBLISHED)  
**Version:** 0.1-beta  
**Effective Date:** [EFFECTIVE DATE UPON PUBLIC BETA LAUNCH]  
**Data Fiduciary / Operator:** [OPERATING ENTITY NAME / PROPRIETOR — OPERATOR TO PROVIDE]  
**Operating Address:** [OFFICIAL POSTAL ADDRESS — OPERATOR TO PROVIDE]  
**Privacy Contact:** [OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]  

---

### Introduction & Epistemic Philosophy

Discora ("we", "us", "our") operates the Discora structured discourse and debate platform. This Privacy Policy outlines how we collect, process, store, retain, and protect your information when you access or use Discora.

Our architectural philosophy is founded on **data minimization, intellectual clarity, and epistemic privacy**:
- We collect only the data necessary to provide structured discussion and authenticated account access.
- We do **not** sell, rent, or broker your personal data to third parties.
- We do **not** deploy third-party advertising networks, tracking pixels, or cross-site surveillance scripts.
- We do **not** use dark patterns to coerce consent.

This Privacy Policy is designed to comply with applicable data protection legislation, including the Information Technology Act, 2000 and Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and is structured to align with the principles of India's Digital Personal Data Protection Act, 2023 (DPDP Act).

---

### 1. The Personal Data We Actually Collect

We only collect data that enters the system through explicit user actions, authenticated sessions, or functional device interactions:

#### A. Identity & Account Data
- **Email Address:** Collected when you register using email and password, or received from Google when you choose Google OAuth. Used solely for authentication, account recovery, security notices, and transactional communications.
- **Hashed Password:** If you register with email/password, your password is cryptographically hashed (using Argon2/Bcrypt via Supabase Auth) before storage. Plaintext passwords are never accessible to Discora or stored on disk.
- **Authentication Identifiers:** A unique, non-reversible user UUID assigned by the authentication system to link your contributions and settings.
- **Public Profile Information:** Your chosen username (mandatory), display name (optional), biography (optional, max 500 characters), and avatar URL (optional).
- **Founding Participant Status:** A descriptive profile-level boolean flag granted by the platform to acknowledge early contributors. It carries no authoritative or commercial value.

#### B. Discourse & Epistemic Data
- **Discussions & Debates:** Room titles, propositions, descriptions, and context submitted when creating discussion or debate rooms.
- **Messages & Contributions:** Text contributions submitted to room conversations.
- **Claims:** Explicit propositions submitted to the epistemic claim tree, including claim text, epistemic category, and falsifiability confidence.
- **Evidence & Citations:** Cited quotes, source URLs, evidence types, and supporting/challenging stances submitted to ground claims.
- **Questions & Inquiries:** Exploratory questions attached to rooms, and targeted structured inquiries scoped to specific claims.
- **Anonymous Contributions:** Messages and questions submitted under the "Anonymous" setting. In this mode, public views detach your username and avatar, displaying the contribution as "Anonymous".

#### C. Interaction & Preference Data
- **Votes & Stances:** Stances on claims (agreement or disagreement) and lightweight message reactions. Stances are aggregated into local consensus ratios; individual user stances and reactions are private to your account. Discora does not conduct evidence-quality voting.
- **Bookmarks / Saved Rooms:** Private references to rooms you have saved to your personal library.
- **Privacy Display Preferences:** User-controlled toggles configured in Settings > Privacy (whether to display your reputation score, expertise areas, or side-switch history on your public profile).

#### D. Moderation & Feedback Data
- **Abuse Reports:** Reports you submit regarding content violations, including target entity and explanation. Reports are visible only to moderators and system administrators.
- **User Feedback:** Bug reports, UX suggestions, or general feedback submitted via the in-app feedback dialog, including category, description, and optional active URL.
- **Admin Audit Logs:** Operational logs recording privileged administrator actions (such as inspecting a private room or resolving moderation flags).

---

### 2. How and Why We Process Your Data (Purposes & Legal Bases)

We process your data exclusively for defined, legitimate purposes:

| Category of Data | Processing Purpose | Applicable Legal Basis (Indian IT / DPDP Context) |
|---|---|---|
| **Email & Credentials** | Create and authenticate accounts, deliver verification emails, process password resets, and protect account security. | Contractual necessity (fulfilling your request to operate an account). |
| **Profile Metadata** | Attribute contributions, render your public profile (`/u/[username]`), and support community recognition. | User consent / voluntary submission. |
| **Discourse Contributions** | Host, format, link, index, and display public discussions, debate graphs, and State of Understanding syntheses. | Performance of service requested by user / legitimate discourse operation. |
| **Preferences & Saves** | Provide personalized library access and respect profile visibility choices. | User configuration and consent. |
| **Moderation Reports** | Investigate policy breaches, detect illegal content, and maintain community safety. | Compliance with statutory due diligence (IT Rules 2021 Rule 3). |
| **System & Security Logs** | Prevent abuse, mitigate cyber attacks, enforce rate limits, and maintain auditability. | Legitimate security interests & compliance with CERT-In directions. |

---

### 3. Cookies and Browser Device Storage

Discora maintains a clean, minimal device storage footprint. We do not use third-party cookies, tracking cookies, advertising pixels, or cross-site analytics.

#### A. Cookies Actually Present

| Cookie Name | Provider | Domain | Expiry | HttpOnly | Category | Purpose |
|---|---|---|---|---|---|---|
| `discora_visited` | First-party (Discora) | Discora host | 365 days | False | **Functional Routing** | Informs Next.js middleware whether a guest has visited Discora previously. On a first visit, routes the guest to `/about` so they can read the epistemic guide before exploring rooms. Contains only the string `"true"`. Zero PII. |
| `sb-<ref>-auth-token` (and chunked parts) | First-party (Supabase Auth) | Discora host | Session / 1 year refresh | **True** | **Strictly Necessary** | Stores encrypted authentication JWT session tokens to keep you securely signed in as you navigate between pages. |

#### B. Local and Session Browser Storage

| Storage Key | Type | Category | Stored Content | Purpose |
|---|---|---|---|---|
| `discora_onboarding_v1` | `localStorage` | Functional | JSON object (completion status, dismissed guide cards, topic selections) | Remembers your progress through the interactive "How Discora Works" discovery guide so cards do not repeat. |
| `discora_sidebar_collapsed` | `localStorage` | Preference | String (`"true"` / `"false"`) | Remembers whether you collapsed or expanded the navigation sidebar. |
| `theme` | `localStorage` | Preference | String (`"dark"` / `"light"` / `"system"`) | Remembers your chosen color scheme preference via `next-themes`. |
| `discora_intelligence_collapsed` | `sessionStorage` | Preference | JSON array of section IDs | Remembers which discussion intelligence cards you collapsed during the active browser session. Cleared when the tab is closed. |

#### C. Assessed Posture on Cookie Banners
Based on our current legal and technical assessment under the European ePrivacy Directive (Directive 2002/58/EC as amended, Article 5(3)) and Indian digital data protection standards, cookies that are strictly necessary to deliver an information society service explicitly requested by the user (such as session authentication tokens) are recognized as exempt from prior consent requirements. Furthermore, Discora's first-party routing cookie (`discora_visited`) and browser storage keys maintain purely functional UI and navigation states without cross-site tracking or profiling. Because Discora employs **zero advertising pixels, cross-site trackers, or third-party analytics cookies**, Discora does not present an intrusive third-party cookie consent banner. We remain committed to ongoing review by legal counsel as regulatory standards evolve.

---

### 4. Third-Party Processors and Subprocessors

We transmit data only to verified cloud infrastructure providers necessary to run the Platform:

1. **Supabase Inc. (USA / Singapore):** Provides our primary database infrastructure, authentication system (GoTrue), object storage for profile avatars, and real-time synchronization. Data stored includes account credentials, profile data, discourse contributions, and database audit logs.
2. **Google Cloud / Alphabet Inc. (USA):** Used solely if you elect to sign in via Google OAuth. Processes authentication authorization codes. Discora receives your basic OpenID profile data; we do not access your contacts, files, or external Google services.
3. **Resend Inc. (USA):** Delivers transactional authentication emails (email confirmation, password resets) via Supabase SMTP integration. Receives only recipient email addresses and delivery verification tokens.
4. **Functional Software Inc. / Sentry (USA):** Optional error diagnostics service. When enabled by the platform operator, Sentry receives runtime stack traces and technical exception details. **Epistemic privacy filtering is strictly applied:** Sentry DOM session replay is disabled (`replaysSessionSampleRate: 0`), default PII is disabled (`sendDefaultPii: false`), and our `beforeSend` filter automatically scrubs IP addresses, email addresses, usernames, cookies, and authorization headers before transmission. When DSN environment variables are unset, Sentry is completely inactive.
5. **Vercel Inc. (USA):** Web application hosting and content delivery network (CDN). Processes standard HTTP request logs (IP addresses, request headers) at the network edge for security and routing.

---

### 5. Public Exposure of Your Contributions

Before posting, you should be aware of what is publicly accessible:
- **Public Room Content:** All discussions, claims, evidence submissions, questions, inquiries, and public debate messages are readable by any guest on the internet and will be indexed by public search engines.
- **Author Attribution:** Unless you select "Anonymous Mode" for a message or question, your username and avatar will be displayed alongside your contribution and will link to your public profile (`/u/[username]`).
- **Profile Page:** Your public profile displays your username, display name, bio, avatar, and join date. Whether your reputation score, topic expertise, or debate side-switches appear is controlled by you in your Privacy Settings.
- **Private Debates:** Content inside private debate rooms is accessible only to users entering a valid access code. However, platform administrators may inspect private rooms under strict audit-logged conditions to enforce safety or investigate illegal content.

---

### 6. Data Retention Policy

Discora adheres to practical retention practices aligned with regulatory obligations:
- **Active User Accounts:** Account credentials, profile data, and user preferences are retained for as long as your account remains active.
- **Published Discourse:** Public claims, evidence citations, and discussion threads are retained indefinitely as part of the public knowledge graph to maintain conversational coherence for the community (subject to anonymized attribution upon account deletion).
- **Administrative & Moderation Logs:** Moderation reports and audit logs in `public.admin_audit_logs` are preserved in accordance with Indian Computer Emergency Response Team (CERT-In) directions (requiring at least **180 days** of log retention for cybersecurity auditability), after which they may be archived or pruned.
- **User Feedback Submissions:** Retained until the reported issue is investigated, resolved, or archived.

---

### 7. Account Deletion & Epistemic Retention

Discora intends to provide an automated self-service account deletion mechanism directly within user settings (`Settings > Danger Zone`). Until that automated feature is deployed and activated in the live application, users have the right to request deletion of their account and personal data at any time by contacting our privacy team at `[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]`.

#### A. Permanent Eradication of Personal Identity Data
When an account deletion is executed (whether upon verified request or via the intended self-service mechanism):
- Your authentication credentials and email address in `auth.users` are permanently deleted.
- Your public profile (`public.profiles`), display name, bio, user preferences (`public.user_preferences`), saved rooms (`public.user_saves`), votes, and reactions are permanently purged via database cascades.
- Your uploaded avatar image in object storage will be permanently deleted.

#### B. Anonymized Retention of Published Discourse
In alignment with Discora’s epistemic mission to preserve collective understanding and avoid broken knowledge structures, your published contributions (claims, evidence citations, discussions, messages, and inquiries) **may be retained in anonymized form where permitted or required by applicable law**.

Upon account deletion:
- Your authorship linkage is detached (`ON DELETE SET NULL`).
- All public views will replace your attribution with the neutral label **"Deleted User"**.
- Your personal identity will no longer be visible, searchable, or linkable to the retained contribution.

---

### 8. Age Eligibility & Protection of Minors

Discora Public Beta is strictly restricted to individuals who are **at least eighteen (18) years of age**. 

We do not knowingly solicit, collect, or process personal data from children under 18 years old. If you are under 18, you are not permitted to register an account or submit personal information on Discora. If we discover that personal data of a minor has been submitted, we will take immediate steps to delete the account and associated personal identifiers.

---

### 9. International Data Transfers & Assessed Regulatory Posture

Discora operates cloud infrastructure hosted primarily in the United States and Singapore via our cloud processors (Supabase, Vercel, Resend). If you access Discora from outside these territories, your data will be transmitted across international borders to these service providers.

**Regarding the European Economic Area (GDPR):**  
Based on our current operational posture, Discora does not actively market services, conduct commercial transactions, or deliberately target data subjects located in the European Union under Article 3(2)(a) of Regulation (EU) 2016/679 (GDPR), nor does it engage in cross-site behavioral monitoring under Article 3(2)(b). However, because public discourse is globally viewable on the open web, statutory applicability remains subject to future factual developments, potential regional targeting, or legal counsel determination. 

Regardless of formal jurisdictional scope, Discora voluntarily adopts core international privacy principles—including data minimization, purpose limitation, transparency, and intended self-service account deletion—as standard engineering practice. We distinguish our voluntary privacy standards from statutory obligations that may apply in specific jurisdictions.

---

### 10. Security Measures & CERT-In Compliance

We implement administrative, technical, and physical safeguards designed to protect personal data against accidental loss, unauthorized access, destruction, or disclosure:
- Encrypted data transmission via HTTPS/TLS 1.3 across all endpoints.
- PostgreSQL Row-Level Security (RLS) enforcing strict authorization at the database layer.
- Server-side environment variable cloaking to prevent credential leakage.
- In accordance with the Cyber Security Directions issued by the Indian Computer Emergency Response Team (CERT-In), material cybersecurity incidents will be documented and reported to the authorities within statutory timelines.

---

### 11. Your Privacy Rights & Contact Information

Under applicable data protection frameworks, you have the right to:
- Access your public profile and contribution history.
- Correct or update your username, display name, bio, and avatar.
- Control your public profile privacy toggles via Settings > Privacy.
- Request deletion of your account and personal data via our designated privacy contact (with automated self-service deletion planned for `Settings > Danger Zone` in an upcoming release).
- Inquire about our data processing practices or lodge a grievance.

For any privacy-related inquiries, requests, or questions:
- **Privacy Contact Email:** [OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]
- **Postal Address:** [OFFICIAL POSTAL ADDRESS — OPERATOR TO PROVIDE]
- **Formal Grievance Escalation:** Please refer to our Grievance Policy (accessible at `/grievance` or draft [`GRIEVANCE_POLICY_DRAFT.md`](docs/legal/GRIEVANCE_POLICY_DRAFT.md)).
