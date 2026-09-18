import type { Metadata } from "next";
import Link from "next/link";
import { OperatorPlaceholder, ResponsiveTable } from "@/components/legal/legal-components";

export const metadata: Metadata = {
  title: "Privacy Policy (Draft) — Discora",
  description:
    "Data processing, epistemic privacy, device storage, and subprocessor notice for Discora Public Beta.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="space-y-8 text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 pb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Version 0.1-beta</span>
          <span>·</span>
          <span>
            Effective Date: <OperatorPlaceholder>[EFFECTIVE DATE UPON PUBLIC BETA LAUNCH]</OperatorPlaceholder>
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Discora — Privacy Policy
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Data Processing, Epistemic Privacy & Device Storage Notice
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Data Fiduciary / Operator:</span>{" "}
            <OperatorPlaceholder>[OPERATING ENTITY NAME / PROPRIETOR — OPERATOR TO PROVIDE]</OperatorPlaceholder>
          </div>
          <div>
            <span className="font-medium text-foreground">Operating Address:</span>{" "}
            <OperatorPlaceholder>[OFFICIAL POSTAL ADDRESS — OPERATOR TO PROVIDE]</OperatorPlaceholder>
          </div>
          <div className="sm:col-span-2">
            <span className="font-medium text-foreground">Privacy Contact:</span>{" "}
            <OperatorPlaceholder>[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]</OperatorPlaceholder>
          </div>
        </div>
      </header>

      {/* Introduction */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          Introduction & Epistemic Philosophy
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Discora structured discourse and debate
          platform. This Privacy Policy outlines how we collect, process, store, retain, and protect your information
          when you access or use Discora.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Our architectural philosophy is founded on <strong>data minimization, intellectual clarity, and epistemic privacy</strong>:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>We collect only the data necessary to provide structured discussion and authenticated account access.</li>
          <li>We do <strong>not</strong> sell, rent, or broker your personal data to third parties.</li>
          <li>We do <strong>not</strong> deploy third-party advertising networks, tracking pixels, or cross-site surveillance scripts.</li>
          <li>We do <strong>not</strong> use dark patterns to coerce consent.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground pt-1">
          This Privacy Policy is designed to comply with applicable data protection legislation, including the Information
          Technology Act, 2000 and Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules,
          2021, and is structured to align with the principles of India&apos;s Digital Personal Data Protection Act, 2023
          (DPDP Act).
        </p>
      </section>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. The Personal Data We Actually Collect
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We only collect data that enters the system through explicit user actions, authenticated sessions, or functional
          device interactions:
        </p>

        <div className="space-y-3">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">A. Identity & Account Data</h3>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Email Address:</strong> Collected when you register using email and password, or received from Google
              when you choose Google OAuth. Used solely for authentication, account recovery, security notices, and
              transactional communications.
            </li>
            <li>
              <strong>Hashed Password:</strong> If you register with email/password, your password is cryptographically
              hashed (using Argon2/Bcrypt via Supabase Auth) before storage. Plaintext passwords are never accessible to
              Discora or stored on disk.
            </li>
            <li>
              <strong>Authentication Identifiers:</strong> A unique, non-reversible user UUID assigned by the
              authentication system to link your contributions and settings.
            </li>
            <li>
              <strong>Public Profile Information:</strong> Your chosen username (mandatory), display name (optional),
              biography (optional, max 500 characters), and avatar URL (optional).
            </li>
            <li>
              <strong>Founding Participant Status:</strong> A descriptive profile-level boolean flag granted by the platform
              to acknowledge early contributors. It carries no authoritative or commercial value.
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">B. Discourse & Epistemic Data</h3>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Discussions & Debates:</strong> Room titles, propositions, descriptions, and context submitted when
              creating discussion or debate rooms.
            </li>
            <li>
              <strong>Messages & Contributions:</strong> Text contributions submitted to room conversations.
            </li>
            <li>
              <strong>Claims:</strong> Explicit propositions submitted to the epistemic claim tree, including claim text,
              epistemic category, and falsifiability confidence.
            </li>
            <li>
              <strong>Evidence & Citations:</strong> Cited quotes, source URLs, evidence types, and supporting/challenging
              stances submitted to ground claims.
            </li>
            <li>
              <strong>Questions & Inquiries:</strong> Exploratory questions attached to rooms, and targeted structured
              inquiries scoped to specific claims.
            </li>
            <li>
              <strong>Anonymous Contributions:</strong> Messages and questions submitted under the &quot;Anonymous&quot;
              setting. In this mode, public views detach your username and avatar, displaying the contribution as
              &quot;Anonymous&quot;.
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">C. Interaction & Preference Data</h3>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Votes & Stances:</strong> Stances on claims (agreement or disagreement) and lightweight message
              reactions. Stances are aggregated into local consensus ratios; individual user stances and reactions are
              private to your account. Discora does not conduct evidence-quality voting.
            </li>
            <li>
              <strong>Bookmarks / Saved Rooms:</strong> Private references to rooms you have saved to your personal library.
            </li>
            <li>
              <strong>Privacy Display Preferences:</strong> User-controlled toggles configured in Settings &gt; Privacy
              (whether to display your reputation score, expertise areas, or side-switch history on your public profile).
            </li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">D. Moderation & Feedback Data</h3>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Abuse Reports:</strong> Reports you submit regarding content violations, including target entity and
              explanation. Reports are visible only to moderators and system administrators.
            </li>
            <li>
              <strong>User Feedback:</strong> Bug reports, UX suggestions, or general feedback submitted via the in-app
              feedback dialog, including category, description, and optional active URL.
            </li>
            <li>
              <strong>Admin Audit Logs:</strong> Operational logs recording privileged administrator actions (such as
              inspecting a private room or resolving moderation flags).
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. How and Why We Process Your Data (Purposes & Legal Bases)
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We process your data exclusively for defined, legitimate purposes:
        </p>

        <ResponsiveTable>
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-foreground font-semibold">
              <tr>
                <th className="p-3">Category of Data</th>
                <th className="p-3">Processing Purpose</th>
                <th className="p-3">Applicable Legal Basis (Indian IT / DPDP Context)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-muted-foreground">
              <tr>
                <td className="p-3 font-medium text-foreground">Email & Credentials</td>
                <td className="p-3">Create and authenticate accounts, deliver verification emails, process password resets, and protect account security.</td>
                <td className="p-3">Contractual necessity (fulfilling your request to operate an account).</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Profile Metadata</td>
                <td className="p-3">Attribute contributions, render your public profile (<code>/u/[username]</code>), and support community recognition.</td>
                <td className="p-3">User consent / voluntary submission.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Discourse Contributions</td>
                <td className="p-3">Host, format, link, index, and display public discussions, debate graphs, and State of Understanding syntheses.</td>
                <td className="p-3">Performance of service requested by user / legitimate discourse operation.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Preferences & Saves</td>
                <td className="p-3">Provide personalized library access and respect profile visibility choices.</td>
                <td className="p-3">User configuration and consent.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Moderation Reports</td>
                <td className="p-3">Investigate policy breaches, detect illegal content, and maintain community safety.</td>
                <td className="p-3">Compliance with statutory due diligence (IT Rules 2021 Rule 3).</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">System & Security Logs</td>
                <td className="p-3">Prevent abuse, mitigate cyber attacks, enforce rate limits, and maintain auditability.</td>
                <td className="p-3">Legitimate security interests & compliance with CERT-In directions.</td>
              </tr>
            </tbody>
          </table>
        </ResponsiveTable>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. Cookies and Browser Device Storage
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora maintains a clean, minimal device storage footprint. We do not use third-party cookies, tracking
          cookies, advertising pixels, or cross-site analytics.
        </p>

        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">A. Cookies Actually Present</h3>
          <ResponsiveTable>
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-foreground font-semibold">
                <tr>
                  <th className="p-3">Cookie Name</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Domain</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">HttpOnly</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-muted-foreground">
                <tr>
                  <td className="p-3 font-mono text-foreground">discora_visited</td>
                  <td className="p-3">First-party (Discora)</td>
                  <td className="p-3">Discora host</td>
                  <td className="p-3">365 days</td>
                  <td className="p-3">False</td>
                  <td className="p-3 font-medium text-foreground">Functional Routing</td>
                  <td className="p-3">
                    Informs Next.js middleware whether a guest has visited Discora previously. On a first visit, routes the guest to <code>/about</code> to view the platform guide. Contains only the string <code>&quot;true&quot;</code>. Zero PII.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-foreground">sb-&lt;ref&gt;-auth-token</td>
                  <td className="p-3">First-party (Supabase Auth)</td>
                  <td className="p-3">Discora host</td>
                  <td className="p-3">Session / 1 yr refresh</td>
                  <td className="p-3 font-medium text-foreground">True</td>
                  <td className="p-3 font-medium text-foreground">Strictly Necessary</td>
                  <td className="p-3">
                    Stores encrypted authentication JWT session tokens to keep you securely signed in as you navigate between pages.
                  </td>
                </tr>
              </tbody>
            </table>
          </ResponsiveTable>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">B. Local and Session Browser Storage</h3>
          <ResponsiveTable>
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-foreground font-semibold">
                <tr>
                  <th className="p-3">Storage Key</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Stored Content</th>
                  <th className="p-3">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-muted-foreground">
                <tr>
                  <td className="p-3 font-mono text-foreground">discora_onboarding_v1</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3">Functional</td>
                  <td className="p-3">JSON object (completion status, dismissed guide cards, topic selections)</td>
                  <td className="p-3">Remembers your progress through the interactive discovery guide so cards do not repeat.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-foreground">discora_sidebar_collapsed</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3">Preference</td>
                  <td className="p-3">String (<code>&quot;true&quot;</code> / <code>&quot;false&quot;</code>)</td>
                  <td className="p-3">Remembers whether you collapsed or expanded the navigation sidebar.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-foreground">theme</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3">Preference</td>
                  <td className="p-3">String (<code>&quot;dark&quot;</code> / <code>&quot;light&quot;</code> / <code>&quot;system&quot;</code>)</td>
                  <td className="p-3">Remembers your chosen color scheme preference via <code>next-themes</code>.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-foreground">discora_intelligence_collapsed</td>
                  <td className="p-3">sessionStorage</td>
                  <td className="p-3">Preference</td>
                  <td className="p-3">JSON array of section IDs</td>
                  <td className="p-3">Remembers which discussion intelligence cards you collapsed during the active session. Cleared when tab closes.</td>
                </tr>
              </tbody>
            </table>
          </ResponsiveTable>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">C. Assessed Posture on Cookie Banners</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Based on our current legal and technical assessment under the European ePrivacy Directive (Directive 2002/58/EC
            as amended, Article 5(3)) and Indian digital data protection standards, cookies that are strictly necessary to
            deliver an information society service explicitly requested by the user (such as session authentication
            tokens) are recognized as exempt from prior consent requirements. Furthermore, Discora&apos;s first-party routing
            cookie (<code>discora_visited</code>) and browser storage keys maintain purely functional UI and navigation states
            without cross-site tracking or profiling. Because Discora employs <strong>zero advertising pixels, cross-site trackers, or third-party analytics cookies</strong>,
            Discora does not present an intrusive third-party cookie consent banner. We remain committed to ongoing review
            by legal counsel as regulatory standards evolve.
          </p>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. Third-Party Processors and Subprocessors
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We transmit data only to verified cloud infrastructure providers necessary to run the Platform:
        </p>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Supabase Inc. (USA / Singapore):</strong> Provides our primary database infrastructure, authentication
            system (GoTrue), object storage for profile avatars, and real-time synchronization. Data stored includes account
            credentials, profile data, discourse contributions, and database audit logs.
          </li>
          <li>
            <strong>Google Cloud / Alphabet Inc. (USA):</strong> Used solely if you elect to sign in via Google OAuth.
            Processes authentication authorization codes. Discora receives your basic OpenID profile data; we do not access
            your contacts, files, or external Google services.
          </li>
          <li>
            <strong>Resend Inc. (USA):</strong> Delivers transactional authentication emails (email confirmation, password
            resets) via Supabase SMTP integration. Receives only recipient email addresses and delivery verification tokens.
          </li>
          <li>
            <strong>Functional Software Inc. / Sentry (USA):</strong> Optional error diagnostics service. When enabled by
            the platform operator, Sentry receives runtime stack traces and technical exception details.{" "}
            <strong>Epistemic privacy filtering is strictly applied:</strong> Sentry DOM session replay is disabled (
            <code>replaysSessionSampleRate: 0</code>), default PII is disabled (<code>sendDefaultPii: false</code>), and our{" "}
            <code>beforeSend</code> filter automatically scrubs IP addresses, email addresses, usernames, cookies, and
            authorization headers before transmission. When DSN environment variables are unset, Sentry is completely
            inactive.
          </li>
          <li>
            <strong>Vercel Inc. (USA):</strong> Web application hosting and content delivery network (CDN). Processes
            standard HTTP request logs (IP addresses, request headers) at the network edge for security and routing.
          </li>
        </ol>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Public Exposure of Your Contributions
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Before posting, you should be aware of what is publicly accessible:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Public Room Content:</strong> All discussions, claims, evidence submissions, questions, inquiries, and
            public debate messages are readable by any guest on the internet and will be indexed by public search engines.
          </li>
          <li>
            <strong>Author Attribution:</strong> Unless you select &quot;Anonymous Mode&quot; for a message or question,
            your username and avatar will be displayed alongside your contribution and will link to your public profile (
            <code>/u/[username]</code>).
          </li>
          <li>
            <strong>Profile Page:</strong> Your public profile displays your username, display name, bio, avatar, and join
            date. Whether your reputation score, topic expertise, or debate side-switches appear is controlled by you in
            your Privacy Settings.
          </li>
          <li>
            <strong>Private Debates:</strong> Content inside private debate rooms is accessible only to users entering a
            valid access code. However, platform administrators may inspect private rooms under strict audit-logged
            conditions to enforce safety or investigate illegal content.
          </li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          6. Data Retention Policy
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora adheres to practical retention practices aligned with regulatory obligations:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Active User Accounts:</strong> Account credentials, profile data, and user preferences are retained for
            as long as your account remains active.
          </li>
          <li>
            <strong>Published Discourse:</strong> Public claims, evidence citations, and discussion threads are retained
            indefinitely as part of the public knowledge graph to maintain conversational coherence for the community
            (subject to anonymized attribution upon account deletion).
          </li>
          <li>
            <strong>Administrative & Moderation Logs:</strong> Moderation reports and audit logs in{" "}
            <code>public.admin_audit_logs</code> are preserved in accordance with Indian Computer Emergency Response Team
            (CERT-In) directions (requiring at least <strong>180 days</strong> of log retention for cybersecurity
            auditability), after which they may be archived or pruned.
          </li>
          <li>
            <strong>User Feedback Submissions:</strong> Retained until the reported issue is investigated, resolved, or
            archived.
          </li>
        </ul>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          7. Account Deletion & Epistemic Retention
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora provides a self-service account deletion flow directly within user settings (
          <code>Settings &gt; Danger Zone</code>), currently available in the beta application and subject to ongoing
          rollout. Users have the right to request deletion of their account and personal data at any time, including by
          contacting our privacy team at{" "}
          <OperatorPlaceholder>[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]</OperatorPlaceholder>.
        </p>

        <div className="space-y-2 pt-1">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            A. Permanent Eradication of Personal Identity Data
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            When an account deletion is executed (whether upon verified request or via the intended self-service mechanism):
          </p>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>Your authentication credentials and email address in <code>auth.users</code> are permanently deleted.</li>
            <li>
              Your public profile (<code>public.profiles</code>), display name, bio, user preferences (
              <code>public.user_preferences</code>), saved rooms (<code>public.user_saves</code>), votes, and reactions are
              permanently purged via database cascades.
            </li>
            <li>Your uploaded avatar image in object storage will be permanently deleted.</li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            B. Anonymized Retention of Published Discourse
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            In alignment with Discora’s epistemic mission to preserve collective understanding and avoid broken knowledge
            structures, your published contributions (claims, evidence citations, discussions, messages, and inquiries){" "}
            <strong>may be retained in anonymized form where permitted or required by applicable law</strong>.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">Upon account deletion:</p>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>Your authorship linkage is detached (<code>ON DELETE SET NULL</code>).</li>
            <li>
              All public views will replace your attribution with the neutral label <strong>&quot;Deleted User&quot;</strong>.
            </li>
            <li>Your personal identity will no longer be visible, searchable, or linkable to the retained contribution.</li>
          </ul>
        </div>
      </section>

      {/* Section 8 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          8. Age Eligibility & Protection of Minors
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora Public Beta is strictly restricted to individuals who are <strong>at least eighteen (18) years of age</strong>.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We do not knowingly solicit, collect, or process personal data from children under 18 years old. If you are under
          18, you are not permitted to register an account or submit personal information on Discora. If we discover that
          personal data of a minor has been submitted, we will take immediate steps to delete the account and associated
          personal identifiers.
        </p>
      </section>

      {/* Section 9 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          9. International Data Transfers & Assessed Regulatory Posture
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora operates cloud infrastructure hosted primarily in the United States and Singapore via our cloud
          processors (Supabase, Vercel, Resend). If you access Discora from outside these territories, your data will be
          transmitted across international borders to these service providers.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>Regarding the European Economic Area (GDPR):</strong>  
          Based on our current operational posture, Discora does not actively market services, conduct commercial
          transactions, or deliberately target data subjects located in the European Union under Article 3(2)(a) of
          Regulation (EU) 2016/679 (GDPR), nor does it engage in cross-site behavioral monitoring under Article 3(2)(b).
          However, because public discourse is globally viewable on the open web, statutory applicability remains subject
          to future factual developments, potential regional targeting, or legal counsel determination.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Regardless of formal jurisdictional scope, Discora voluntarily adopts core international privacy principles—including
          data minimization, purpose limitation, transparency, and intended self-service account deletion—as standard
          engineering practice. We distinguish our voluntary privacy standards from statutory obligations that may apply in
          specific jurisdictions.
        </p>
      </section>

      {/* Section 10 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          10. Security Measures & CERT-In Compliance
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We implement administrative, technical, and physical safeguards designed to protect personal data against
          accidental loss, unauthorized access, destruction, or disclosure:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>Encrypted data transmission via HTTPS/TLS 1.3 across all endpoints.</li>
          <li>PostgreSQL Row-Level Security (RLS) enforcing strict authorization at the database layer.</li>
          <li>Server-side environment variable cloaking to prevent credential leakage.</li>
          <li>
            In accordance with the Cyber Security Directions issued by the Indian Computer Emergency Response Team (CERT-In),
            material cybersecurity incidents will be documented and reported to the authorities within statutory timelines.
          </li>
        </ul>
      </section>

      {/* Section 11 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          11. Your Privacy Rights & Contact Information
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Under applicable data protection frameworks, you have the right to:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
          <li>Access your public profile and contribution history.</li>
          <li>Correct or update your username, display name, bio, and avatar.</li>
          <li>Control your public profile privacy toggles via Settings &gt; Privacy.</li>
          <li>
            Request deletion of your account and personal data via our designated privacy contact (with automated
            self-service deletion planned for <code>Settings &gt; Danger Zone</code> in an upcoming release).
          </li>
          <li>Inquire about our data processing practices or lodge a grievance.</li>
        </ul>
        <div className="space-y-2 pt-2 text-sm text-muted-foreground">
          <p>
            <strong>Privacy Contact Email:</strong>{" "}
            <OperatorPlaceholder>[OFFICIAL PRIVACY CONTACT EMAIL — OPERATOR TO PROVIDE]</OperatorPlaceholder>
          </p>
          <p>
            <strong>Postal Address:</strong>{" "}
            <OperatorPlaceholder>[OFFICIAL POSTAL ADDRESS — OPERATOR TO PROVIDE]</OperatorPlaceholder>
          </p>
          <p>
            <strong>Formal Grievance Escalation:</strong> Please refer to our{" "}
            <Link href="/grievance" className="text-primary underline underline-offset-4 hover:opacity-80">
              Grievance Redressal Policy
            </Link>.
          </p>
        </div>
      </section>
    </article>
  );
}
