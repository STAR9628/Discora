import type { Metadata } from "next";
import Link from "next/link";
import { OperatorPlaceholder, LegalCallout } from "@/components/legal/legal-components";

export const metadata: Metadata = {
  title: "Terms of Service (Draft)",
  description:
    "Terms of Service, user agreement, and platform participation contract for Discora Public Beta.",
};

export default function TermsOfServicePage() {
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
          Discora — Terms of Service
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          User Agreement & Platform Participation Contract
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Operating Entity:</span>{" "}
            Animesh Tripathi (individual operator)
          </div>
          <div>
            <span className="font-medium text-foreground">Operating Jurisdiction:</span>{" "}
            <OperatorPlaceholder>[CITY, STATE, INDIA — OPERATOR TO PROVIDE]</OperatorPlaceholder>
          </div>
          <div className="sm:col-span-2">
            <span className="font-medium text-foreground">Contact:</span>{" "}
            <a
              href="mailto:hello@discora.in"
              className="text-primary underline underline-offset-4 hover:opacity-80"
            >
              hello@discora.in
            </a>
          </div>
        </div>
      </header>

      {/* Important Notice */}
      <LegalCallout type="info" title="Important Notice to All Users">
        <p>
          Please read these Terms of Service (&quot;Terms&quot;, &quot;Agreement&quot;) carefully before accessing or
          using Discora (the &quot;Service&quot;, &quot;Platform&quot;). By registering for an account, accessing, or
          using any part of Discora, you agree to be bound by these Terms. If you do not agree to all terms and
          conditions of this Agreement, you may not access or use the Platform.
        </p>
        <p className="mt-2">
          Discora is designed to cultivate reasoned discussion, rigorous evidence evaluation, and structured inquiry.
          Discora is <strong>not</strong> a social media network, a popularity contest, or an automated arbiter of
          truth. Your use of the Platform must align with these epistemic and community standards.
        </p>
      </LegalCallout>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. Description of the Service
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora provides a structured epistemic discourse platform that enables registered users and guest visitors
          to explore, map, and participate in structured discussions and debates. Key architectural capabilities include:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Discussion and Debate Rooms:</strong> Collaborative spaces organized around specific propositions,
            questions, and inquiries.
          </li>
          <li>
            <strong>Claims and Evidence Grounding:</strong> Structured decomposition of arguments into falsifiable
            propositions supported or challenged by cited evidence and external sources.
          </li>
          <li>
            <strong>Structured Inquiries:</strong> Targeted clarification mechanisms attached to specific claims.
          </li>
          <li>
            <strong>State of Understanding:</strong> Algorithmic syntheses categorizing discussion nodes into areas of
            support, contestation, and unresolved inquiry without imposing definitive conclusions, scorecards, or truth
            scores.
          </li>
          <li>
            <strong>Identity Modes:</strong> Option for registered users to contribute either under their public profile
            username or anonymously within individual discussion contexts.
          </li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. Eligibility & 18+ Public Beta Requirement
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>2.1. Minimum Age Requirement:</strong> Discora is currently operating in Public Beta. You must be at
          least <strong>eighteen (18) years of age</strong> to register an account, contribute content, submit evidence,
          vote, or otherwise interact with the Platform.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>2.2. No Minor Accounts:</strong> By creating an account or clicking &quot;Register&quot;, you expressly
          represent and warrant that you are at least 18 years of age and possess the legal capacity to enter into this
          binding Agreement under applicable law, including the Indian Contract Act, 1872.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>2.3. Data Minimization on Age:</strong> In adherence to Discora&apos;s data minimization principles, we
          do not require or collect your exact date of birth or government identification during registration. However,
          if we become aware or have reasonable grounds to suspect that an account is registered or operated by an
          individual under 18 years of age, we reserve the right to immediately suspend or permanently terminate the
          account and purge associated personal data.
        </p>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. Account Registration, Credentials & Security
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>3.1. Registration:</strong> To access interactive features (posting, voting, inquiry creation, saving
          rooms), you must register using a valid email address and password, or through an authorized third-party
          authentication provider (such as Google OAuth).
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>3.2. Credential Confidentiality:</strong> You are solely responsible for maintaining the confidentiality
          of your login credentials and for all activities that occur under your account. You agree to notify Discora
          immediately upon discovering or suspecting any unauthorized access to or security breach of your account.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>3.3. Single Identity:</strong> Creating multiple automated, deceptive, or abusive accounts
          (&quot;sockpuppets&quot;) to manipulate debate positions, vote distributions, or reputation signals is
          strictly prohibited.
        </p>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. Acceptable Use & Prohibited Conduct (Intermediary Due Diligence)
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          As an intermediary hosting user-generated discourse under Section 79 of the Information Technology Act, 2000
          and Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules,
          2021, Discora requires all users to refrain from uploading, hosting, displaying, modifying, publishing,
          transmitting, storing, updating, or sharing any information that:
        </p>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Belongs to another person and to which you do not have any right;</li>
          <li>
            Is obscene, pornographic, pedophilic, invasive of another&apos;s bodily privacy, insulting or harassing on the
            basis of gender, racially or ethnically objectionable, relating or encouraging money laundering or gambling,
            or otherwise inconsistent with or contrary to the laws in force;
          </li>
          <li>Is harmful to children or minors;</li>
          <li>Infringes any patent, trademark, copyright, trade secret, or other proprietary rights;</li>
          <li>
            Deceives or misleads the addressee about the origin of the message or knowingly and intentionally
            communicates any misinformation or information which is patently false and untrue or misleading in nature;
          </li>
          <li>Impersonates another person or entity;</li>
          <li>
            Threatens the unity, integrity, defense, security or sovereignty of India, friendly relations with foreign
            States, or public order, or causes incitement to the commission of any cognizable offense, or prevents
            investigation of any offense, or is insulting to other nations;
          </li>
          <li>
            Contains software viruses or any other computer code, files, or programs designed to interrupt, destroy, or
            limit the functionality of any computer resource;
          </li>
          <li>Violates any law for the time being in force.</li>
        </ol>
        <p className="text-sm leading-relaxed text-muted-foreground pt-2">
          Furthermore, within Discora&apos;s epistemic environment, you agree <strong>not</strong> to:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>Fabricate, forge, or deliberately misquote source materials or citations;</li>
          <li>Deploy automated bots, scrapers, or crawlers without prior written authorization;</li>
          <li>Engage in vote brigades, coordinated brigading, or reputation gaming;</li>
          <li>Doxx, harass, or threaten any user, contributor, or moderator.</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Intellectual Property & User Content License
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>5.1. Ownership of Your Content:</strong> You retain all copyrights and proprietary rights in the
          original text, arguments, claims, evidence descriptions, and feedback you submit to Discora (&quot;User
          Content&quot;).
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>5.2. License to Discora:</strong> By submitting User Content to public rooms or publicly accessible
          areas of the Platform, you grant Discora an irrevocable, perpetual, non-exclusive, worldwide, royalty-free,
          transferable license (with the right to sublicense) to host, store, cache, reproduce, format, display,
          distribute, index, and organize your User Content into Discora&apos;s structured knowledge graphs, search
          indexes, and epistemic summaries. This license exists solely for operating, developing, and providing the
          Platform&apos;s core discourse features.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>5.3. Responsibility for Citations:</strong> When submitting evidence, URLs, or excerpts from
          third-party works, you warrant that your citation constitutes lawful fair dealing, fair use, or quotation under
          applicable copyright law, and that proper source attribution is provided.
        </p>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          6. Public vs. Private Discourse & Anonymous Participation
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>6.1. Public Discourse:</strong> Discussion rooms, public debate rooms, claims, evidence, questions,
          inquiries, and the State of Understanding summaries are public. They are readable by any guest on the
          internet and indexed by search engines.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>6.2. Private Debate Rooms:</strong> When participating in a debate designated as &quot;Private&quot;,
          access is restricted to individuals entering a valid room access code. However, Discora platform administrators
          maintain audit-logged oversight capabilities to inspect private rooms exclusively for moderation emergencies,
          illegal content investigations, or platform safety enforcement.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>6.3. Anonymous Identity Mode:</strong> Discora enables contributors to submit messages and questions
          under an &quot;Anonymous&quot; label. In this mode, your public profile handle and avatar are detached from the
          contribution in public views. However, backend database records retain cryptographic linkage to your account to
          prevent abuse, enforce moderation guidelines, and comply with statutory legal orders. Anonymous participation
          is a privacy feature, not an instrument for unlawful evasion.
        </p>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          7. Epistemic Philosophy, AI Features & Limitation of Authority
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>7.1. No Guarantee of Truth or Accuracy:</strong> User Content represents the opinions, claims, and
          evidence submitted by individual participants. Discora does <strong>not</strong> endorse, verify, guarantee,
          or represent the truth, accuracy, completeness, or reliability of any claim, argument, source, or synthesis
          displayed on the Platform.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>7.2. Votes Are Not Truth:</strong> Community stance indicators (such as agreement or disagreement on
          claims) reflect collective participant perspectives within a room; they do <strong>not</strong> establish
          factual veracity or empirical proof. Discora does not employ evidence-voting scorecards, winner/loser
          determinations, or truth-scoring algorithms. You must exercise independent critical judgment before relying on
          any information found on Discora.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>7.3. Assistive, Non-Authoritative AI:</strong> Discora may, where assistive AI features are enabled by
          the platform, employ artificial intelligence models (such as large language models) to assist participants in
          structuring arguments, exploring inquiry angles, or organizing epistemic summaries. To the extent any AI
          features are deployed, you expressly acknowledge and agree that:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
          <li>
            AI on Discora is strictly <strong>assistive</strong>, never authoritative.
          </li>
          <li>AI is not an arbitrator, judge, or oracle of truth.</li>
          <li>AI outputs may contain errors, simplifications, or omissions.</li>
          <li>Ultimate epistemic evaluation and intellectual judgment rest entirely with human participants.</li>
        </ul>
      </section>

      {/* Section 8 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          8. Moderation, Reporting & Grievance Mechanism
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>8.1. Community Moderation:</strong> Users may report content that violates these Terms or our{" "}
          <Link href="/guidelines" className="text-primary underline underline-offset-4 hover:opacity-80">
            Community Guidelines
          </Link>{" "}
          using the built-in &quot;Report&quot; action.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>8.2. Moderator Actions:</strong> Authorized moderators and administrators may review reported items via
          an anonymity-preserving moderation queue. Discora reserves the right, at its sole discretion, to hide,
          restrict, lock, archive, or remove any content that breaches this Agreement.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>8.3. Grievance Redressal:</strong> If you believe your content was wrongly removed, or if you wish to
          report a statutory grievance (including intellectual property infringement or prohibited content under Indian
          IT Rules), you may submit a formal complaint to our Grievance Officer in accordance with our{" "}
          <Link href="/grievance" className="text-primary underline underline-offset-4 hover:opacity-80">
            Grievance Redressal Policy
          </Link>.
        </p>
      </section>

      {/* Section 9 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          9. Account Deletion & Epistemic Graph Retention
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>9.1. Account Deletion Mechanism:</strong> Discora provides a self-service account deletion flow
          directly within user settings (<code>Settings &gt; Danger Zone</code>), currently available in the beta
          application and subject to ongoing rollout. Where self-service is unavailable, users may submit an account
          deletion request through our designated privacy contact at{" "}
            <a
              href="mailto:privacy@discora.in"
              className="text-primary underline underline-offset-4 hover:opacity-80"
            >
              privacy@discora.in
            </a>.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>9.2. Eradication of Personal Data:</strong> When account deletion is executed (whether upon verified
          request or via the intended self-service mechanism), all personal and identity records—including your login
          credentials, email address, profile handle, display name, bio, avatar image, private preferences, saved
          bookmarks, votes, and reactions—will be permanently deleted from our primary application databases, subject to
          technical backups and legal retention requirements.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>9.3. Anonymized Retention of Published Discourse:</strong> To preserve the structural integrity and
          intelligibility of public discussions and debates, you agree that your published epistemic
          contributions—including claims, evidence citations, questions, inquiries, and messages—
          <strong>may be retained in anonymized form where permitted or required by applicable law</strong>. Following
          deletion, all public attribution associated with your contributions will display permanently as{" "}
          <strong>&quot;Deleted User&quot;</strong>. This prevents public discussions from becoming nonsensical or broken
          while completely stripping your personal identity.
        </p>
      </section>

      {/* Section 10 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          10. Third-Party Integrations & Subprocessors
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The Platform relies on trusted infrastructure providers to deliver its services:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Supabase Inc.:</strong> Database hosting, user authentication, and file storage.
          </li>
          <li>
            <strong>Google Cloud (OAuth):</strong> Optional third-party federated login.
          </li>
          <li>
            <strong>Resend Inc.:</strong> Transactional email delivery (verification and password resets).
          </li>
          <li>
            <strong>Functional Software Inc. (Sentry):</strong> Crash and exception diagnostics (when enabled, scrubbed
            of personal identifiers).
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your interactions with third-party authentication providers are subject to their respective terms and privacy
          policies.
        </p>
      </section>

      {/* Section 11 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          11. Disclaimer of Warranties & Limitation of Liability
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>11.1. &quot;As-Is&quot; and &quot;As-Available&quot;:</strong> Discora is provided on an &quot;AS IS&quot;
          and &quot;AS AVAILABLE&quot; basis during Public Beta, without warranties of any kind, whether express,
          implied, statutory, or otherwise, including implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong>11.2. Limitation of Liability:</strong> To the maximum extent permitted by applicable law, in no event
          shall Discora, its founders, operators, employees, or agents be liable for any indirect, incidental, special,
          consequential, or punitive damages, including loss of profits, data, goodwill, or other intangible losses,
          resulting from (a) your access to or inability to access the Platform; (b) any conduct or content of any third
          party; or (c) unauthorized access, use, or alteration of your content.
        </p>
      </section>

      {/* Section 12 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          12. Changes to Service & Terms
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We reserve the right to modify, suspend, or discontinue any feature of Discora at any time during Public Beta.
          We may update these Terms periodically. When material modifications occur, we will provide notice by updating
          the &quot;Effective Date&quot; at the top of these Terms and, where feasible, posting an announcement within the
          Platform. Your continued use of the Platform after such changes constitutes your acceptance of the revised
          Terms.
        </p>
      </section>

      {/* Section 13 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          13. Governing Law & Jurisdiction
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These Terms and any dispute or claim arising out of or in connection with them shall be governed by and
          construed in accordance with the laws of <strong>India</strong>, without giving effect to any principles of
          conflicts of law. Subject to applicable statutory grievance escalation procedures, the courts of competent
          jurisdiction located in{" "}
          <OperatorPlaceholder>[CITY / STATE, INDIA — OPERATOR TO PROVIDE]</OperatorPlaceholder> shall have exclusive
          jurisdiction over any disputes arising under this Agreement.
        </p>
      </section>

      {/* Section 14 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          14. Contact & Inquiries
        </h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>General Inquiries:</strong>{" "}
            <a
              href="mailto:hello@discora.in"
              className="text-primary underline underline-offset-4 hover:opacity-80"
            >
              hello@discora.in
            </a>
          </p>
          <p>
            <strong>Statutory Grievances:</strong> Please refer to our{" "}
            <Link href="/grievance" className="text-primary underline underline-offset-4 hover:opacity-80">
              Grievance Redressal Policy
            </Link>.
          </p>
        </div>
      </section>
    </article>
  );
}
