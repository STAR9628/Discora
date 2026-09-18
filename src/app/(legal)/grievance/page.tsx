import type { Metadata } from "next";
import Link from "next/link";
import { OperatorPlaceholder, LegalCallout, ResponsiveTable } from "@/components/legal/legal-components";

export const metadata: Metadata = {
  title: "Grievance Redressal Policy (Draft) — Discora",
  description:
    "Statutory grievance redressal mechanism under Rule 3(2) of the Information Technology Rules, 2021.",
};

export default function GrievancePolicyPage() {
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
          <span>Statutory Framework: Rule 3(2) of IT Rules, 2021</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Discora — Grievance Redressal Policy
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Statutory Grievance Mechanism under Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital
          Media Ethics Code) Rules, 2021
        </p>
      </header>

      {/* Operator Placeholder Notice */}
      <LegalCallout type="caution" title="Operator Placeholder Notice (Draft Document)">
        <p>
          This document contains draft procedural rules for statutory compliance under Indian law. It{" "}
          <strong>cannot</strong> be published or activated until the platform operator purchases the production domain,
          provisions an official grievance email address, and formally designates an individual Grievance Officer with an
          operational physical address in India.
        </p>
      </LegalCallout>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. Purpose & Scope of Grievance Redressal
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In accordance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics
          Code) Rules, 2021, Discora establishes this draft Grievance Redressal Policy (subject to operator adoption and
          formal appointment of the designated officer) to address user complaints regarding:
        </p>
        <ol className="list-decimal list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Content that violates our{" "}
            <Link href="/terms" className="text-primary underline underline-offset-4 hover:opacity-80">
              Terms of Service
            </Link>{" "}
            or{" "}
            <Link href="/guidelines" className="text-primary underline underline-offset-4 hover:opacity-80">
              Community Guidelines
            </Link>;
          </li>
          <li>Content that is illegal, defamatory, obscene, invasive of bodily privacy, or infringing intellectual property;</li>
          <li>Impersonation of an individual or entity;</li>
          <li>Non-consensual sharing of intimate or sexually explicit imagery;</li>
          <li>Content that threatens national security, public order, or the sovereignty and integrity of India;</li>
          <li>Appeals by users whose content or accounts have been suspended, blocked, or removed.</li>
        </ol>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. Designated Grievance Officer Details
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In compliance with Rule 3(2)(a) of the Information Technology Rules, 2021, the contact details of the designated
          Grievance Officer are as follows:
        </p>

        <ResponsiveTable>
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-foreground font-semibold">
              <tr>
                <th className="p-3 w-1/3">Field</th>
                <th className="p-3">Official Statutory Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-muted-foreground">
              <tr>
                <td className="p-3 font-medium text-foreground">Designation / Title</td>
                <td className="p-3">Grievance Officer, Discora Platform</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Officer Name</td>
                <td className="p-3">
                  <OperatorPlaceholder>[GRIEVANCE OFFICER NAME — OPERATOR TO PROVIDE]</OperatorPlaceholder>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Operating Entity</td>
                <td className="p-3">
                  <OperatorPlaceholder>[OPERATING ENTITY NAME / PROPRIETOR — OPERATOR TO PROVIDE]</OperatorPlaceholder>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Official Contact Email</td>
                <td className="p-3">
                  <OperatorPlaceholder>[OFFICIAL CONTACT EMAIL (e.g., grievance@discora.com) — OPERATOR TO PROVIDE]</OperatorPlaceholder>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Official Postal Address</td>
                <td className="p-3">
                  <OperatorPlaceholder>[PHYSICAL OPERATING ADDRESS IN INDIA — OPERATOR TO PROVIDE]</OperatorPlaceholder>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-foreground">Designated Working Hours</td>
                <td className="p-3">Monday to Friday, 10:00 AM – 6:00 PM IST (Excluding Public Holidays)</td>
              </tr>
            </tbody>
          </table>
        </ResponsiveTable>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. How to Submit a Grievance
        </h2>

        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            A. Standard In-App Reporting (First Line of Review)
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For regular community violations (such as uncivil conduct, ungrounded assertions, or spam), users are
            encouraged to use the built-in <strong>&quot;Report&quot;</strong> feature available on every message, claim,
            question, and evidence item. In-app reports are routed directly to our anonymity-preserving moderation queue.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            B. Formal Written Grievance (Statutory Escalation)
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If an issue requires formal statutory intervention, intellectual property notice, emergency removal, or an
            appeal of an administrative action, you must submit a formal written grievance via email to the Grievance
            Officer at{" "}
            <OperatorPlaceholder>[OFFICIAL CONTACT EMAIL — OPERATOR TO PROVIDE]</OperatorPlaceholder>.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            To ensure prompt investigation, your formal grievance must include:
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong>Complainant Information:</strong> Your full name, registered Discora username (if applicable), and
              contact email address.
            </li>
            <li>
              <strong>Identification of Content:</strong> Exact URL(s) to the discussion room, debate, claim, message, or
              user profile in question.
            </li>
            <li>
              <strong>Specific Nature of Complaint:</strong> A clear statement specifying how the content violates these
              Terms, Community Guidelines, or Indian law.
            </li>
            <li>
              <strong>Supporting Documentation:</strong> In cases of copyright infringement, proof of ownership or
              authorization; in cases of impersonation, proof of identity.
            </li>
            <li>
              <strong>Declaration of Good Faith:</strong> A statement that the information provided in the complaint is
              accurate and true to the best of your knowledge.
            </li>
          </ol>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. Statutory Timelines for Acknowledgment and Resolution
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In strict adherence to the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules,
          2021:
        </p>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Acknowledgment Timeline (Rule 3(2)(a)):</strong> Every formal grievance received by the Grievance
            Officer will be acknowledged within <strong>twenty-four (24) hours</strong> of receipt, providing the
            complainant with a unique complaint ticket reference number.
          </li>
          <li>
            <strong>Standard Disposal Timeline (Rule 3(2)(a)):</strong> Every complaint will be investigated, redressed,
            and formally responded to within <strong>fifteen (15) days</strong> from the date of its receipt.
          </li>
          <li>
            <strong>Expedited Removal of Sexually Explicit / Nude Content (Rule 3(2)(b)):</strong> Where a grievance relates
            to content that prima facie exposes the private areas of any person, shows such person in full or partial
            nudity, depicts any sexual act, or involves impersonation or manipulated imagery (deepfakes) of an individual,
            Discora will take all reasonable and practicable measures to remove or disable access to such content within{" "}
            <strong>twenty-four (24) hours</strong> from the receipt of the complaint.
          </li>
        </ol>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Investigation Procedure & User Appeals
        </h2>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Review by Human Operators:</strong> Formal grievances and appeals are evaluated by human administrators.
            Discora does not use autonomous AI systems to make final grievance determination decisions.
          </li>
          <li>
            <strong>Right to Fair Hearing (Appeals):</strong> If a user&apos;s content is removed or their account is
            suspended, the user may submit an appeal to the Grievance Officer within thirty (30) days of the enforcement
            action. The user may provide clarifying context or evidence of lawful authority.
          </li>
          <li>
            <strong>Communication of Decision:</strong> The Grievance Officer will communicate the reasoned decision in
            writing to the complainant and affected user, stating whether the content remains removed, is restored, or if
            alternative corrective actions were taken.
          </li>
        </ol>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          6. Escalation to the Grievance Appellate Committee (GAC)
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In accordance with Rule 3A of the Information Technology Rules, 2021 (as amended), any user who is aggrieved by
          a decision of the Discora Grievance Officer, or who does not receive a response within the statutory 15-day
          timeline, has the statutory right to prefer an appeal to the <strong>Grievance Appellate Committee (GAC)</strong>{" "}
          established by the Central Government of India:
        </p>
        <ul className="list-disc list-outside pl-5 space-y-1 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Appeal Window:</strong> Within thirty (30) days from the date of receipt of the decision from Discora’s
            Grievance Officer.
          </li>
          <li>
            <strong>Online Portal:</strong> Appeals may be submitted electronically through the official GAC portal (
            <code>https://gac.gov.in</code>).
          </li>
          <li>
            <strong>Compliance:</strong> Discora will comply with any lawful direction or order issued by the Grievance
            Appellate Committee.
          </li>
        </ul>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">
          7. Record Keeping, Confidentiality & CERT-In Coordination
        </h2>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Confidentiality:</strong> Details of complainants and grievances are treated with strict
            confidentiality and shared only with personnel directly involved in resolving the complaint or as required by
            law enforcement authorities.
          </li>
          <li>
            <strong>Log Preservation:</strong> In compliance with the Cyber Security Directions issued by CERT-In (Direction
            20(6)), system logs and audit records relating to verified security violations or unauthorized access will be
            preserved for a rolling period of <strong>180 days</strong>.
          </li>
          <li>
            <strong>Frivolous or Abusive Grievances:</strong> The submission of repeatedly false, malicious, forged, or
            automated bad-faith grievances designed to harass contributors or suppress legitimate inquiry constitutes a
            breach of our Terms of Service and may result in account termination.
          </li>
        </ol>
      </section>
    </article>
  );
}
