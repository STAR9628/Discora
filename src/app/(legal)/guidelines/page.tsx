import type { Metadata } from "next";
import Link from "next/link";
import { OperatorPlaceholder, LegalCallout } from "@/components/legal/legal-components";

export const metadata: Metadata = {
  title: "Community Guidelines (Draft)",
  description:
    "Standards of epistemic integrity, constructive disagreement, and discourse safety on Discora.",
};

export default function CommunityGuidelinesPage() {
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
          <span>·</span>
          <span>Applies To: All registered users, contributors, moderators, and guest visitors</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Discora — Community Guidelines
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Standards of Epistemic Integrity, Constructive Disagreement & Discourse Safety
        </p>
      </header>

      {/* Foundational Principles */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          Foundational Principles
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora exists to advance <strong>understanding over engagement</strong>, <strong>evidence over popularity</strong>,
          and <strong>reasoning over tribalism</strong>. Unlike conventional platforms that reward emotional outrage,
          rapid-fire virality, and polarization, Discora is designed to map disagreements rigorously and thoughtfully.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These Community Guidelines establish the standards of intellectual honesty and mutual respect required of every
          participant.
        </p>

        <LegalCallout type="info" title="Discora Is Not an Arbiter of Absolute Truth">
          <p>
            Moderation on Discora exists to protect discourse integrity, platform safety, and statutory legality. Discora
            does <strong>not</strong> adjudicate scientific, historical, philosophical, or political truth. We do not censor
            hypotheses or non-conformist ideas simply because they are controversial or unpopular. We moderate{" "}
            <strong>conduct, grounding, citation integrity, and safety</strong>, not orthodox consensus.
          </p>
        </LegalCallout>
      </section>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. Epistemic Standards for Contributions
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          To ensure discussions remain constructive and intelligible, participants are expected to uphold the following
          epistemic norms:
        </p>

        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">A. Structured Claims</h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Clarity & Precision:</strong> Formulate claims as clear, falsifiable propositions that can be
              supported, questioned, or challenged by others.
            </li>
            <li>
              <strong>Good Faith Formulation:</strong> State opposing claims charitably rather than creating weak straw-man
              distortions.
            </li>
            <li>
              <strong>One Proposition at a Time:</strong> Avoid compound or rambling claims that combine multiple
              unverified assertions into a single node.
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">B. Evidence & Citations</h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Grounded Assertions:</strong> Provide verifiable citations, empirical data, peer-reviewed research,
              official records, or documented historical sources when introducing factual claims.
            </li>
            <li>
              <strong>Honest Quotation:</strong> Quotes and excerpts must accurately reflect the meaning of the cited author
              or source in context. Misleading selective quoting (&quot;quote mining&quot;) violates our integrity standards.
            </li>
            <li>
              <strong>No Fabricated Evidence:</strong> Fabricating sources, inventing nonexistent papers, generating synthetic
              fraudulent citations, or linking to known malware/phishing domains is grounds for immediate account
              suspension.
            </li>
            <li>
              <strong>Distinguish Facts from Interpretation:</strong> Clearly demarcate empirical evidence from your personal
              commentary or deductive inference.
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">C. Socratic Inquiries & Questions</h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Genuine Curiosity:</strong> Inquiries attached to claims should seek genuine clarification, underlying
              assumptions, or missing definitions.
            </li>
            <li>
              <strong>No Badgering or Sealioning:</strong> Repeatedly demanding evidence with disingenuous, bad-faith
              inquiries intended to exhaust another contributor rather than understand their perspective is prohibited.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. Prohibited Conduct & Safety Standards
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In compliance with Rule 3(1)(b) of the Indian Information Technology (Intermediary Guidelines and Digital Media
          Ethics Code) Rules, 2021, and to ensure a safe environment for all participants, the following behaviors and
          content types are strictly prohibited:
        </p>

        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">A. Harassment, Threats & Hate Speech</h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Targeted Harassment:</strong> Directing insults, abuse, derogatory slurs, or sustained hostility at
              another individual.
            </li>
            <li>
              <strong>Violence & Threats:</strong> Making threats of violence, bodily harm, physical injury, or destruction of
              property against any person or group.
            </li>
            <li>
              <strong>Hate Speech:</strong> Inciting hatred, discrimination, disparagement, or violence against individuals
              or protected groups based on religion, race, caste, ethnicity, gender, sexual orientation, disability, or
              nationality.
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">B. Illegal, Dangerous & Harmful Content</h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Child Sexual Exploitation & Abuse (CSAM):</strong> Any content depicting, promoting, or facilitating
              child sexual exploitation or abuse is subject to immediate zero-tolerance account termination, content
              removal, and mandatory reporting to law enforcement authorities.
            </li>
            <li>
              <strong>Non-Consensual Sexual Imagery:</strong> Uploading or threatening to share intimate, nude, or sexually
              explicit imagery without the subject&apos;s explicit consent.
            </li>
            <li>
              <strong>Terrorism & Violent Extremism:</strong> Promoting, glorifying, or recruiting for designated terrorist
              organizations or violent extremist movements.
            </li>
            <li>
              <strong>Illegal Acts & Substances:</strong> Facilitating or encouraging illegal transactions, prohibited
              weapons sales, money laundering, or illegal gambling.
            </li>
            <li>
              <strong>National Security Violations:</strong> Content that threatens the unity, integrity, defense, security,
              or sovereignty of India, friendly relations with foreign states, or public order.
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">C. Privacy Violations & Impersonation</h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Doxxing:</strong> Publishing another individual&apos;s private, non-public personal information—such as
              private phone numbers, residential addresses, personal email addresses, financial details, or national identity
              documents—without their express consent.
            </li>
            <li>
              <strong>Impersonation:</strong> Creating an account or publishing contributions intended to deceive others into
              believing you are another person, public official, entity, or organization.
            </li>
          </ul>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">D. System Manipulation & Abuse</h3>
          <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Spam & Commercial Promotion:</strong> Posting repetitive messages, unsolicited advertisements,
              affiliate links, or promotional campaigns.
            </li>
            <li>
              <strong>Coordinated Brigading:</strong> Organizing off-platform campaigns to overwhelm rooms with mass-downvoting,
              coordinated stance switching, or report flooding.
            </li>
            <li>
              <strong>Sockpuppetry & Sybil Attacks:</strong> Operating multiple accounts to artificially manufacture consensus,
              skew agreement ratios, or manipulate reputation metrics.
            </li>
            <li>
              <strong>Malicious Automation:</strong> Deploying unauthorized automated scripts, web scrapers, or bot accounts
              to interact with rooms.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. Understanding Epistemic Signals on Discora
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          To prevent misunderstandings, participants should recognize how Discora interprets platform metrics:
        </p>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Votes Are Stances, Not Truth:</strong> Clicking &quot;Agree&quot; or &quot;Disagree&quot; registers your
            perspective within the room&apos;s current participant pool. A 90% agreement ratio indicates local consensus; it
            does <strong>not</strong> prove objective fact.
          </li>
          <li>
            <strong>Reputation Reflects Grounding, Not Authority:</strong> User credibility signals and topic expertise
            reflect consistency in providing verifiable citations and engaging in good-faith inquiry; they do not grant
            infallibility or administrative superiority.
          </li>
          <li>
            <strong>Founding Participant Recognition:</strong> The &quot;Founding Participant&quot; badge is a descriptive
            marker of early platform participation. It confers zero moderation authority, zero epistemic weight, and no
            special privileges.
          </li>
        </ol>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. Moderation Workflow & Discretionary Enforcement
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Discora maintains a phased moderation process designed to preserve community safety and discourse integrity:
        </p>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Reporting:</strong> Any registered user may flag a message, claim, question, or evidence item using the
            &quot;Report&quot; button, selecting an appropriate reason (e.g. Harassment, Misinformation, Prohibited Content,
            Spam).
          </li>
          <li>
            <strong>Anonymity-Preserving Queue:</strong> Reports enter an administrative queue (<code>moderation_queue</code>)
            where authorized moderators review the flagged content and context. To prevent retaliation, the identity of the
            reporting user is not disclosed to moderators.
          </li>
          <li>
            <strong>Discretionary Enforcement Actions:</strong> Depending on the nature, severity, and context of the
            violation, platform administrators and moderators may take corrective actions, which may include:
            <ul className="list-disc list-outside pl-5 mt-2 space-y-1 text-xs sm:text-sm">
              <li>
                <strong>Content Obfuscation:</strong> Hiding an infringing contribution from public views, replacing it with a
                notice such as <code>[Message hidden by moderator]</code>.
              </li>
              <li>
                <strong>Tombstoning:</strong> Neutralizing an invalid or infringing claim while preserving conversational child
                nodes to prevent thread breakage.
              </li>
              <li>
                <strong>Administrative Warnings & Temporary Restrictions:</strong> In appropriate circumstances,
                administrators may issue direct warnings or temporarily restrict posting capabilities.
              </li>
              <li>
                <strong>Permanent Account Termination:</strong> Complete ban and credential revocation for severe or repeated
                violations (such as threats, CSAM, doxxing, or malicious bot automation).
              </li>
            </ul>
          </li>
        </ol>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Appeals & Grievance Escalation
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you believe your content was moderated in error, or if you believe an urgent safety concern was improperly
          resolved:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>
            You may submit an appeal or statutory grievance directly to our designated Grievance Officer in accordance with
            our{" "}
            <Link href="/grievance" className="text-primary underline underline-offset-4 hover:opacity-80">
              Grievance Redressal Policy
            </Link>.
          </li>
          <li>Grievances are reviewed by human operators under defined statutory timelines.</li>
        </ul>
      </section>
    </article>
  );
}
