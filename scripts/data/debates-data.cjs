/**
 * Locked Beta Debates (B01 - B50)
 * Exact titles approved by Product Owner.
 * Neutral descriptions generated per Section 11.
 * Opening statements follow Section 12 requirements:
 * 1. Establish current context.
 * 2. Explain proposition precisely.
 * 3. Present strongest commonly stated reasoning for one side.
 * 4. Present strongest commonly stated reasoning for the opposing side.
 * 5. Identify relevant evidence/questions.
 * 6. End with a clear debate question.
 */

module.exports = [
  // --- UPI / ECONOMICS (B01 - B03) ---
  {
    code: "B01",
    title: "Should UPI Charges Exist?",
    propositionTitle: "Yes: Sustainable digital payment infrastructure requires explicit transaction fees",
    oppositionTitle: "No: Core digital payment rails should remain entirely free to maximize inclusion",
    description: "Examines whether UPI transactions should carry explicit user or merchant fees to ensure infrastructure sustainability, or remain entirely free as a public utility.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
India's Unified Payments Interface processes billions of transactions monthly, yet payment aggregators and banks bear substantial infrastructure, fraud-prevention, and operational expenses.

THE PROPOSITION:
The question is whether UPI transactions should be subject to explicit service charges, interchange fees, or user transaction fees rather than being sustained by state subsidies and zero-MDR mandates.

COMMON ARGUMENTS FOR CHARGES:
Proponents argue that digital payment networks require continuous private capital investment in servers, security, and customer service. Without sustainable fee models, innovation stagnates, reliability degrades during peak loads, and costs are merely hidden and passed on through other retail banking penalties.

COMMON ARGUMENTS AGAINST CHARGES:
Opponents maintain that zero-cost UPI has been India's most transformative financial inclusion engine, onboarding hundreds of millions of low-income citizens and street vendors into the formal economy. Introducing fees risks driving users back to cash, reducing economic velocity and tax transparency.

KEY QUESTIONS:
Can financial institutions maintain 99.99% payment uptime and robust cybersecurity indefinitely under government subsidies alone, or does long-term resilience require market-driven pricing?

DEBATE QUESTION:
Should UPI transactions carry explicit service charges to fund network operations, or should zero-cost access remain an inviolable public standard?`
  },
  {
    code: "B02",
    title: "Should Merchants Pay for UPI?",
    propositionTitle: "Yes: Commercial merchants should pay a standard discount rate for payment processing",
    oppositionTitle: "No: Forcing merchant discount rates on UPI creates cash leakage and hurts retail formalization",
    description: "Considers whether commercial retailers should be subject to merchant discount rates (MDR) for accepting UPI, similar to traditional credit card processing.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Merchant acceptance of UPI has expanded from roadside vendors to multi-billion-dollar retail conglomerates, intensifying debates over whether commercial businesses should pay processing fees.

THE PROPOSITION:
Whether commercial enterprises accepting UPI payments should be mandated to pay a standard Merchant Discount Rate (MDR) to compensate banks and payment aggregators for payment terminal maintenance and settlement infrastructure.

COMMON ARGUMENTS FOR MERCHANT MDR:
Supporters argue that commercial retailers derive enormous benefits from instantaneous settlement, eliminated cash-handling shrinkage, and digitized bookkeeping. Just as businesses pay for electricity, logistics, and credit card processing, paying a fractional fee for payment settlement is standard commercial overhead.

COMMON ARGUMENTS AGAINST MERCHANT MDR:
Critics argue that imposing MDR on merchants, especially micro and small businesses, creates immediate friction that incentivizes cash-only transactions, tax evasion, and merchant resistance, ultimately reversing years of hard-won digital formalization.

KEY QUESTIONS:
Can a regulatory distinction between high-turnover corporate chains and neighborhood small vendors be sustainably enforced without creating market distortions or loopholes?

DEBATE QUESTION:
Should commercial merchants be required to pay processing fees for receiving UPI payments, or should zero-MDR protections be preserved?`
  },
  {
    code: "B03",
    title: "Should Digital Payments Stay Free?",
    propositionTitle: "Yes: Universal zero-cost digital transactions represent an essential modern public utility",
    oppositionTitle: "No: Market realities require that users and businesses pay for the infrastructure they consume",
    description: "Analyzes whether digital payments should be treated as a zero-cost public utility funded by taxation or as a commercial service subject to user fees.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Central banks and governments worldwide are piloting digital currencies and real-time payment rails, prompting fundamental philosophical questions about who should pay for digital money movement.

THE PROPOSITION:
This position holds that foundational retail digital payments should be treated as a non-excludable public good and maintained completely free of direct charges for all end-users.

COMMON ARGUMENTS FOR FREE PAYMENTS:
Supporters say money has to move for the economy to work — charging per transaction taxes trade itself, hits the poorest hardest, and works against bringing everyone into the formal economy.

COMMON ARGUMENTS FOR COMMERCIAL CHARGES:
Skeptics argue that "free" is an economic illusion; funding payment rails through tax subsidies forces non-users to cross-subsidize commercial transactions, while preventing payment networks from generating commercial revenue to invest in next-generation cybersecurity.

KEY QUESTIONS:
Where should the free public part of payments end and the paid commercial part begin?

DEBATE QUESTION:
Should basic digital payment transfers remain permanently free of direct transaction charges for users and small merchants?`
  },

  // --- WAR / CONFLICT (B04 - B07) ---
  {
    code: "B04",
    title: "Can War Ever Create Lasting Peace?",
    propositionTitle: "Yes: Decisive military victory can permanently dismantle aggressive regimes and enforce peace",
    oppositionTitle: "No: Warfare inevitably sows cycles of destruction, grievance, and future conflict",
    description: "Debates whether decisive military force can achieve enduring political stability, or whether warfare inevitably breeds cycles of future retaliation.",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
Throughout history and in contemporary international conflicts, leaders have argued that military victory is occasionally the only path to destroy aggressive ideologies and enforce lasting peace.

THE PROPOSITION:
The case for this side: decisive armed conflict can dismantle tyrannical or revisionist regimes and create the necessary geopolitical conditions for durable, long-term stability.

COMMON ARGUMENTS IN FAVOR:
Proponents point to historical examples such as World War II, where total Allied military victory over Nazi Germany and Imperial Japan dismantled militaristic states, enabling decades of post-war European and Asian democracy, economic integration, and peace.

COMMON ARGUMENTS AGAINST:
Opponents point to the Treaty of Versailles, the 2003 Iraq War, and countless modern insurgencies, arguing that war inherently devastates civilian populations, creates enduring historical trauma, radicalizes successor generations, and merely postpones the next outbreak of violence.

KEY QUESTIONS:
Under what rare geopolitical conditions does military victory yield sustainable reconstruction rather than protracted guerrilla resistance or revanchism?

DEBATE QUESTION:
Can the employment of military force ever genuinely lay the foundation for enduring peace, or does war fundamentally perpetuate cycles of violence?`
  },
  {
    code: "B05",
    title: "Should Countries Negotiate With Their Enemies?",
    propositionTitle: "Yes: Direct diplomatic negotiation is essential to end bloodshed and avoid total devastation",
    oppositionTitle: "No: Negotiating with aggressive adversaries legitimizes violence and rewards coercion",
    description: "Considers whether sovereign nations should engage in direct diplomatic talks with hostile adversaries and aggressors, or maintain diplomatic isolation until aggression ceases.",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
Diplomatic engagements with hostile states, non-state actors, or nations actively committing aggression frequently provoke intense domestic and international controversy.

THE PROPOSITION:
The question is whether states should keep talking to hostile adversaries during active conflicts — even ones committing severe violations of international norms.

COMMON ARGUMENTS FOR NEGOTIATION:
Supporters maintain that peace is made with enemies, not friends. Refusing to talk guarantees endless military escalation, civilian casualties, and nuclear risks; direct communication remains the only realistic mechanism to negotiate ceasefires, prisoner exchanges, and ultimate settlements.

COMMON ARGUMENTS AGAINST NEGOTIATION:
Critics argue that negotiating with unprovoked aggressors rewards territorial conquest, legitimizes war crimes, demoralizes allied resistance, and signals to other revisionist actors that military coercion succeeds in extracting diplomatic concessions.

KEY QUESTIONS:
Does establishing preconditions for negotiations prevent capitulation, or does it merely guarantee that active slaughter continues without off-ramps?

DEBATE QUESTION:
Should sovereign nations engage in direct negotiations with hostile adversaries during active hostilities, or does negotiation undermine international deterrence?`
  },
  {
    code: "B06",
    title: "When Should Other Countries Intervene?",
    propositionTitle: "Yes: Sovereign non-intervention must yield to the humanitarian imperative to stop mass atrocities",
    oppositionTitle: "No: External military interventions violate national sovereignty and routinely worsen local conflicts",
    description: "Explores the conditions under which the international community is morally or legally justified in intervening militarily in the sovereign territory of another state.",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
The doctrine of the "Responsibility to Protect" (R2P) adopted by the UN stands in tension with traditional Westphalian sovereignty and prohibition of the use of force under the UN Charter.

THE PROPOSITION:
The argument for stepping in is that foreign nations or multilateral coalitions are morally justified in launching military interventions in sovereign states to halt genocide, ethnic cleansing, or extreme human rights catastrophes.

COMMON ARGUMENTS FOR INTERVENTION:
Advocates cite historical inaction during the 1994 Rwandan genocide and the 1995 Srebrenica massacre, arguing that state sovereignty cannot be an absolute shield behind which governments slaughter their own civilian populations with global impunity.

COMMON ARGUMENTS AGAINST INTERVENTION:
Opponents point to the interventions in Libya and Iraq, arguing that foreign military strikes destabilize regional balances of power, destroy critical infrastructure, ignite civil wars, and frequently serve as cloaks for geopolitical hegemony.

KEY QUESTIONS:
Who possesses the legal and moral authority to authorize military intervention when the UN Security Council is paralyzed by vetoes?

DEBATE QUESTION:
When, if ever, does the humanitarian imperative to protect civilian lives justify overriding a nation's sovereign territorial integrity through military intervention?`
  },
  {
    code: "B07",
    title: "Should Countries Be Allowed to Fight Preemptively?",
    propositionTitle: "Yes: Nations possess an inherent right to strike imminent threats before catastrophic damage occurs",
    oppositionTitle: "No: Preemptive warfare destabilizes international law and creates a license for aggressive invasion",
    description: "Evaluates whether international law should permit nations to launch preemptive military strikes against perceived imminent or gathering security threats.",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
With modern hypersonic missiles, cyber warfare, and weapons of mass destruction capable of delivering devastating strikes in minutes, military strategists frequently debate the doctrine of anticipatory self-defense.

THE PROPOSITION:
At issue is whether sovereign nations have a legitimate right under international law to initiate preemptive military strikes against an adversary suspected of preparing an imminent or catastrophic attack.

COMMON ARGUMENTS FOR PREEMPTION:
Supporters argue that waiting to absorb a first strike in an age of weapons of mass destruction and high-speed precision munitions is suicidal; international law must recognize the Caroline doctrine of self-defense when an imminent threat is instant and overwhelming.

COMMON ARGUMENTS AGAINST PREEMPTION:
Critics warn that legalizing preemptive warfare destroys the cornerstone of international order (UN Charter Article 2(4)). "Imminence" is easily fabricated or exaggerated by intelligence agencies, creating an open justification for unprovoked invasion under the pretext of self-defense.

KEY QUESTIONS:
How can the international community objectively verify that an attack was truly imminent rather than manufactured for geopolitical conquest?

DEBATE QUESTION:
Should sovereign nations be legally permitted to execute preemptive military strikes against perceived imminent threats?`
  },

  // --- MEN / WOMEN (B08 - B12) ---
  {
    code: "B08",
    title: "Do We Still Need Men?",
    propositionTitle: "Yes: Biological, psychological, and sociological contributions of men remain vital to human thriving",
    oppositionTitle: "No: Traditional male social roles and structural dominance are obsolete in modern egalitarian society",
    description: "Investigates whether distinct biological, psychological, and social contributions of men remain essential to societal functioning and family structures.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Technological advancements in reproduction, the rise of female economic independence, and debates over modern masculinity have prompted provocative cultural questions about the necessity of distinct male roles in society.

THE PROPOSITION:
The debate examines whether men—both as physical providers, fathers, and distinct social contributors—remain intrinsically necessary for the continuity, stability, and emotional flourishing of human civilization.

COMMON ARGUMENTS IN FAVOR:
Proponents argue that men contribute vital paternal mentorship, physical labor in hazardous core infrastructure (construction, energy, maritime, defense), and distinct psychological balance in child development and family formation that cannot be replaced without societal decay.

COMMON ARGUMENTS IN OPPOSITION:
Critics of traditional frameworks argue that modern technological societies, automated infrastructure, and evolving family structures allow women and community networks to thrive autonomously, rendering historical patriarchal dependence obsolete.

KEY QUESTIONS:
How does society distinguish between the obsolescence of coercive patriarchal hierarchy and the enduring value of healthy masculine identity and fatherhood?

DEBATE QUESTION:
Do distinct male social roles and paternal contributions remain essential to modern society, or has technological and social evolution rendered them outdated?`
  },
  {
    code: "B09",
    title: "Do We Still Need Traditional Gender Roles?",
    propositionTitle: "Yes: Complementary traditional roles provide biological alignment, domestic stability, and clarity",
    oppositionTitle: "No: Rigid traditional roles constrain individual potential, perpetuate inequality, and limit freedom",
    description: "Analyzes whether traditional gender roles provide useful social structure and stability or restrict personal fulfillment and equality.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
While mainstream modern culture encourages gender fluidity and role neutrality, subcultures championing traditional marital and family dynamics ("tradwife" movements, traditional provider ethics) have experienced significant digital resurgence.

THE PROPOSITION:
Whether adherence to traditional, differentiated gender roles—such as male provision and female domestic nurturing—provides a superior framework for family cohesion and societal stability compared to egalitarian role interchangeability.

COMMON ARGUMENTS FOR TRADITIONAL ROLES:
Supporters argue that distinct gender roles reflect evolutionary psychological complementarities, reduce household conflict by providing clear divisions of responsibility, and create stable environments for raising children.

COMMON ARGUMENTS AGAINST TRADITIONAL ROLES:
Opponents argue that rigid gender prescriptions are oppressive historical constructs that limit human agency, enforce economic dependence on women, burden men with excessive provider pressure, and pathologize diverse family configurations.

KEY QUESTIONS:
Can traditional roles be voluntarily embraced without structurally disadvantaging the partner who assumes primary domestic responsibilities?

DEBATE QUESTION:
Do traditional gender roles provide vital stability and complementary partnership, or do they restrict individual autonomy and progress?`
  },
  {
    code: "B10",
    title: "Should Men and Women Be Treated Exactly the Same?",
    propositionTitle: "Yes: Universal equality before the law and institutions requires absolute gender-blind treatment",
    oppositionTitle: "No: Biological, physical, and sociological realities require tailored gender-differentiated standards",
    description: "Debates whether absolute gender-blind neutrality is the ideal standard for all societal domains, or if physical and biological differences justify differentiated treatment.",
    topicSlug: "philosophy",
    openingStatement: `CONTEXT:
Debates across military combat roles, prison housing, sports categorization, and parental custody frequently force legal systems to choose between strict gender neutrality and differentiated standards.

THE PROPOSITION:
The question facing legal systems and institutions is whether law, policy, workplace standards, and cultural practices should treat men and women with absolute, identical neutrality across all domains without exception.

COMMON ARGUMENTS FOR IDENTICAL TREATMENT:
Advocates of absolute neutrality argue that any differential standard inevitably becomes a tool for discrimination, paternalism, or second-class citizenship; evaluating individuals purely on uniform, gender-blind criteria is the only robust foundation for true civil rights.

COMMON ARGUMENTS FOR DIFFERENTIATED TREATMENT:
Critics argue that ignoring biological realities—such as pregnancy, lactation, physical strength distributions, and distinct vulnerability to sexual violence—harms women, undermines fairness in physical competition, and fails to protect maternity.

KEY QUESTIONS:
In which specific domains (athletics, military combat, criminal justice, reproductive care) does identical treatment create unfair or dangerous outcomes?

DEBATE QUESTION:
Should societal institutions and laws apply identical standards to men and women in all circumstances, or do biological and physical realities justify distinct treatment?`
  },
  {
    code: "B11",
    title: "Has Modern Dating Become Unfair to Men?",
    propositionTitle: "Yes: Algorithmic dating dynamics and hypergamous preferences disproportionately disenfranchise average men",
    oppositionTitle: "No: Men retain significant social advantages and are simply adjusting to equalized female standards",
    description: "Evaluates claims that online dating algorithms, shifting economic standards, and cultural scrutiny have created unique disadvantages for men seeking romance.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Data from dating platforms showing severe imbalances in match distribution, alongside growing online communities of young men reporting romantic isolation, have sparked widespread discussions about the fairness of modern courtship.

THE PROPOSITION:
The claim being tested: modern dating culture, driven by mobile app algorithms and shifting social norms, has created an environment that places disproportionate and unrealistic burdens on the vast majority of men.

COMMON ARGUMENTS IN FAVOR:
Supporters point to dating-app figures discussed online, which suggest attention concentrates heavily at the top — though the underlying datasets are private, so nobody outside the companies can check.

COMMON ARGUMENTS IN OPPOSITION:
Critics argue that men are merely experiencing an egalitarian landscape where women are no longer economically compelled to marry for survival; women holding higher standards of emotional intelligence, partnership, and respect is not "unfairness."

KEY QUESTIONS:
Are modern dating frustrations the result of algorithmic platform mechanics designed for engagement, or reflective of deeper cultural shifts in relationship expectations?

DEBATE QUESTION:
Has the contemporary dating landscape created structural disadvantages and unrealistic pressures for men, or is it an overdue rebalancing of romantic power?`
  },
  {
    code: "B12",
    title: "Has Modern Dating Become Unfair to Women?",
    propositionTitle: "Yes: Hookup culture, digital objectification, and safety risks disproportionately burden women",
    oppositionTitle: "No: Women hold unprecedented romantic agency, selectivity, and choice in modern dating",
    description: "Examines whether digital dating culture, commitment-avoidance, safety risks, and biological time constraints disproportionately burden women.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Women across dating platforms frequently express exhaustion with casual hookup culture, ghosting, unsolicited explicit imagery, physical safety concerns, and partners unwilling to commit to long-term marriage.

THE PROPOSITION:
This debate weighs whether modern dating dynamics place an asymmetric emotional, biological, and physical burden on women seeking committed partnership.

COMMON ARGUMENTS IN FAVOR:
Proponents highlight that women face severe biological fertility timelines, significant risks of physical and sexual violence during dates, and an app-driven culture that incentivizes casual, non-committal male behavior while devaluing emotional investment.

COMMON ARGUMENTS IN OPPOSITION:
Skeptics argue that women hold unprecedented power in modern dating — vast choice, far more inbound attention, and full independence to set boundaries — though, again, the platforms don't publish the numbers.

KEY QUESTIONS:
How do asymmetric risks regarding physical safety and reproductive timelines shape the female dating experience compared to male romantic challenges?

DEBATE QUESTION:
Does the modern dating environment disproportionately penalize women through safety risks and commitment avoidance, or does it grant women unprecedented romantic leverage?`
  },

  // --- FEMINISM (B13 - B18) ---
  {
    code: "B13",
    title: "Is Feminism Still Necessary?",
    propositionTitle: "Yes: Structural inequality, violence against women, and cultural biases require ongoing feminist action",
    oppositionTitle: "No: Legal equality has been achieved in modern democracies, making feminist activism divisive",
    description: "Explores whether feminist advocacy remains essential to modern society or whether legal equality has rendered the movement largely redundant in democratic nations.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
While women hold high political offices, lead corporations, and outnumber men in higher education in many countries, global rates of domestic violence, pay disparity, and reproductive rights disputes persist.

THE PROPOSITION:
The unresolved question is whether feminist advocacy is still necessary today, or whether its core goals of legal and civil equality have already been achieved.

COMMON ARGUMENTS FOR NECESSITY:
Supporters emphasize that legal equality on paper does not equate to equality in practice; pervasive gender-based violence, reproductive restrictions, corporate leadership barriers, and global oppression of women in traditional regimes demand robust feminist action.

COMMON ARGUMENTS AGAINST NECESSITY:
Critics argue that in modern constitutional democracies, women enjoy full legal parity, equal opportunity, and institutional protections; continued feminist activism often crosses into zero-sum identity politics that alienates men without addressing pragmatic social issues.

KEY QUESTIONS:
How does one distinguish between achieving equal opportunity under the law and eliminating all cultural and socioeconomic differences in outcomes?

DEBATE QUESTION:
Does feminism remain a vital and necessary social movement in contemporary society, or have its foundational goals been accomplished?`
  },
  {
    code: "B14",
    title: "Should Feminism Address Men's Problems Too?",
    propositionTitle: "Yes: True gender equality requires dismantling patriarchal expectations that harm men as well",
    oppositionTitle: "No: Feminism must preserve its dedicated focus on female empowerment without diluting its mission",
    description: "Debates whether feminist theory and activism should explicitly prioritize male societal issues or remain exclusively focused on women's rights.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
With rising public attention on male suicide rates, academic underperformance, and workplace deaths, advocates debate whether feminist organizations should incorporate men's issues into their primary agenda.

THE PROPOSITION:
The position under examination: modern feminism must formally expand its scope to investigate, advocate for, and resolve systemic challenges faced by men and boys.

COMMON ARGUMENTS IN FAVOR:
Advocates argue that gender is a relational system; rigid gender stereotypes and patriarchal expectations trap men into emotional repression and dangerous roles. Equality cannot be achieved for women if the structural challenges of men are ignored.

COMMON ARGUMENTS AGAINST:
Opponents argue that feminism was founded specifically as a liberation movement for an historically subordinated group (women); burdening it with men's problems dilutes its resources, decenters female leadership, and obscures the distinct nature of female oppression.

KEY QUESTIONS:
Can an advocacy movement effectively serve the interests of both groups in an historically unequal relationship without internal conflict?

DEBATE QUESTION:
Should feminist movements actively prioritize and address men's distinct societal struggles, or should men's issues be addressed through separate frameworks?`
  },
  {
    code: "B15",
    title: "Has Feminism Gone Too Far?",
    propositionTitle: "Yes: Contemporary feminism has shifted from equal opportunity to grievance and misandry",
    oppositionTitle: "No: Assertions of 'going too far' are reactionary attempts to preserve traditional privilege",
    description: "Assesses whether modern feminist activism has exceeded its original goals of equal rights and evolved into anti-male rhetoric or excessive institutional overreach.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Controversies surrounding due process in campus sexual misconduct investigations, corporate gender quotas, and aggressive online discourse have led commentators to question the trajectory of third- and fourth-wave feminism.

THE PROPOSITION:
The debate explores whether contemporary feminist activism has transitioned from seeking fair, equal opportunity into an overreaching ideological campaign that disadvantages men and harms social harmony.

COMMON ARGUMENTS IN FAVOR:
Critics argue that modern feminism frequently promotes collective guilt, pathologizes normal masculinity, erodes due process protections in sexual misconduct allegations, and demands equal outcomes through coercive social and corporate engineering.

COMMON ARGUMENTS IN OPPOSITION:
Defenders argue that accusations of feminism "going too far" have accompanied every historical advance from women's suffrage to property rights; discomfort among privileged groups is a natural reaction to the genuine redistribution of social and economic power.

KEY QUESTIONS:
Where does the boundary lie between vigorous advocacy for justice and ideological overreach that disregards individual fairness?

DEBATE QUESTION:
Has contemporary feminist activism overreached its core principles of equality, or is current criticism a predictable backlash against female progress?`
  },
  {
    code: "B16",
    title: "Should Gender Equality Mean Equal Outcomes?",
    propositionTitle: "Yes: Persistent disparities in leadership and wealth prove that systemic barriers still obstruct equality",
    oppositionTitle: "No: Equality of opportunity inevitably produces divergent outcomes due to voluntary individual choices",
    description: "Examines whether genuine gender equality should be measured by 50/50 representation across all fields, or by fairness of opportunity regardless of final demographic distributions.",
    topicSlug: "philosophy",
    openingStatement: `CONTEXT:
Disparities in corporate board representation, engineering enrollment, nursing, and political offices continue to fuel debates over whether demographic parity is the definitive benchmark of justice.

THE PROPOSITION:
The case for equal outcomes starts from the claim that genuine gender equality cannot be considered achieved until leadership positions, high-income professions, and political representation reflect a roughly 50/50 statistical distribution between men and women.

COMMON ARGUMENTS FOR EQUAL OUTCOMES:
Proponents contend that in the absence of systemic discrimination, cultural conditioning, and structural gatekeeping, human interests and abilities would distribute evenly; persistent statistical gaps are prima facie evidence of underlying bias that requires proactive remediation.

COMMON ARGUMENTS FOR EQUAL OPPORTUNITY:
Opponents point to a much-discussed pattern in Scandinavian countries, where freer conditions coincided with larger occupational divides (engineering vs healthcare) — though what that pattern proves is itself debated.

KEY QUESTIONS:
Is demographic disparity inherently proof of discrimination, or can it reflect authentic divergence in aggregate group preferences under free conditions?

DEBATE QUESTION:
Should gender equality be defined by statistical parity in representation and outcomes, or by equal freedom and opportunity for individuals?`
  },
  {
    code: "B17",
    title: "Should Companies Be Forced to Close Gender Pay Gaps?",
    propositionTitle: "Yes: Mandatory government regulations and penalties are required to eliminate corporate wage disparities",
    oppositionTitle: "No: Coercive wage mandates distort labor markets and ignore legitimate differences in roles and hours",
    description: "Considers whether governments should legally mandate companies to eliminate median wage gaps between male and female employees through audits and fines.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Legislatures across Europe and several US states have introduced mandatory pay audits, salary band disclosures, and financial penalties for firms failing to close organizational gender pay gaps.

THE PROPOSITION:
Its supporters hold that the state should legally compel private and public employers to equalize aggregate male and female compensation or face severe regulatory fines.

COMMON ARGUMENTS FOR MANDATES:
Supporters argue that voluntary corporate initiatives have proven too slow; mandatory reporting and financial sanctions force companies to audit promotion pipelines, eliminate biased negotiation penalties, and fairly value female labor.

COMMON ARGUMENTS AGAINST MANDATES:
Critics argue that blunt regulatory mandates penalize companies for median wage differences driven by legitimate non-discriminatory factors (such as overtime hours, hazardous work, travel requirements, and years of experience), distorting market-driven wage discovery.

KEY QUESTIONS:
Can statutory penalties distinguish between unjust discrimination and legitimate compensation differentials tied to employee availability and productivity?

DEBATE QUESTION:
Should governments legally mandate that companies eliminate gender pay gaps under threat of regulatory penalties?`
  },
  {
    code: "B18",
    title: "Should Traditional Gender Expectations Be Protected?",
    propositionTitle: "Yes: Traditional norms preserve foundational social order, child well-being, and cultural identity",
    oppositionTitle: "No: State or cultural protection of traditional roles enforces patriarchal restrictions on freedom",
    description: "Debates whether societies and cultural institutions should actively preserve traditional expectations of manhood and womanhood against modern egalitarian pressures.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Conservative civic organizations, religious bodies, and cultural advocates argue that modern societies are destabilizing marriage and childrearing by actively deconstructing traditional male and female archetypes.

THE PROPOSITION:
The argument being tested is that societies have a legitimate interest in safeguarding and celebrating traditional gender expectations and complementary roles as foundational pillars of communal health.

COMMON ARGUMENTS IN FAVOR:
Advocates argue that time-tested gender norms provide psychological clarity, encourage male responsibility and paternal commitment, honor maternal sacrifice, and prevent the social atomization caused by gender-neutral consumerism.

COMMON ARGUMENTS AGAINST:
Opponents maintain that protecting traditional expectations inevitably legitimizes social coercion against non-conforming individuals, entrenches female subordination, and restricts men from emotional expression and domestic involvement.

KEY QUESTIONS:
Can traditional values be protected as positive cultural ideals without restricting the legal rights and personal freedoms of those who choose non-traditional paths?

DEBATE QUESTION:
Should societies actively protect and encourage traditional gender expectations, or should all gender roles be treated as purely subjective individual choices?`
  },

  // --- WOMEN / WORK / FAMILY (B19 - B21) ---
  {
    code: "B19",
    title: "Should Parents Share Careers and Childcare Equally?",
    propositionTitle: "Yes: 50/50 dual-career and dual-parenting models are essential for household equality and child flourishing",
    oppositionTitle: "No: Families should have complete freedom to specialize based on preference and comparative advantage",
    description: "Evaluates whether equitable 50/50 sharing of career sacrifice and domestic childcare should be the cultural ideal, or if parental specialization remains superior.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
The challenge of balancing dual professional careers with intensive parenting has sparked debate over whether couples should strive for an exact 50/50 split of domestic labor or embrace economic specialization.

THE PROPOSITION:
The case for splitting evenly: modern couples should aim for equal sharing of both professional career commitment and day-to-day childcare responsibilities as the premier standard of egalitarian partnership.

COMMON ARGUMENTS FOR EQUAL SHARING:
Advocates argue that equal sharing prevents the "motherhood penalty," prevents maternal career burnout, fosters deep father-child bonding, and ensures that neither partner is left financially vulnerable or professionally sidelined.

COMMON ARGUMENTS FOR SPECIALIZATION:
Opponents argue that rigid 50/50 division is stressful and inefficient; families thrive when they specialize based on comparative economic advantage, individual parenting desires, and flexible domestic arrangements that fit their unique circumstances.

KEY QUESTIONS:
Does social pressure for an identical 50/50 split create unrealistic burdens on parents who would naturally prefer differentiated domestic arrangements?

DEBATE QUESTION:
Should an equal 50/50 division of career and childcare be the normative ideal for modern families, or is domestic specialization equally valid?`
  },
  {
    code: "B20",
    title: "Should Mothers Get Special Workplace Protection?",
    propositionTitle: "Yes: The unique biological and societal role of maternity justifies enhanced statutory workplace rights",
    oppositionTitle: "No: Special maternal privileges create hiring disincentives and undermine gender neutrality",
    description: "Assesses whether working mothers should receive distinct legal protections beyond standard parental leave, or if such policies inadvertently harm female employment.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Labor laws worldwide mandate varied maternity leaves, nursing accommodations, and protection against dismissal during pregnancy, with ongoing debates over whether to expand protections further.

THE PROPOSITION:
The position: pregnant women and mothers should receive enhanced, non-negotiable statutory protections—such as extended paid leave, flexible hours, and firing immunity—to protect the societal role of childbearing.

COMMON ARGUMENTS IN FAVOR:
Supporters argue that childbirth is an irreplaceable contribution to society's demographic survival; penalizing women professionally for bearing children is deeply unjust, and aggressive workplace protections are necessary to prevent systemic exploitation.

COMMON ARGUMENTS AGAINST:
Skeptics argue that overly burdensome, asymmetric maternal protections make employers secretly reluctant to hire or promote women of childbearing age, inadvertently worsening female hiring prospects and reinforcing the stereotype that women are less dependable workers.

KEY QUESTIONS:
How can labor laws protect maternal health without creating economic incentives for employers to discriminate against female candidates?

DEBATE QUESTION:
Should governments mandate enhanced, distinctive workplace protections specifically for mothers, or does this policy create adverse employment consequences?`
  },
  {
    code: "B21",
    title: "Should Companies Publish Their Gender Pay Gap?",
    propositionTitle: "Yes: Public wage transparency is the most effective sunlight to eliminate unexplained pay disparities",
    oppositionTitle: "No: Raw pay disclosures create misleading public scandals and fail to account for job complexity",
    description: "Debates whether large corporations should be legally mandated to publicly disclose aggregate gender pay statistics on an annual basis.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Countries like the United Kingdom and Australia have enacted laws requiring companies with over 250 employees to publish detailed annual gender pay and bonus statistics online for public inspection.

THE PROPOSITION:
Its supporters hold that all major corporate employers should be legally compelled to publicly publish their overall gender pay gap statistics annually to foster public accountability.

COMMON ARGUMENTS FOR TRANSPARENCY:
Advocates argue that transparency is the most powerful deterrent against discrimination; public reporting forces executives to examine structural barriers, shames laggards, empowers female employees in negotiations, and rewards equitable companies.

COMMON ARGUMENTS AGAINST MANDATORY PUBLICATION:
Critics contend that raw aggregate pay gap statistics mislead the public by comparing entry-level staff with senior executives, creating undeserved reputational damage for firms with complex workforce demographics while doing nothing to address true equal-pay-for-equal-work compliance.

KEY QUESTIONS:
Does public reporting actually lead to concrete salary adjustments and promotions, or does it merely produce corporate public relations spin and compliance paperwork?

DEBATE QUESTION:
Should corporations be legally required to publicly report their gender pay gap metrics to drive workplace equality?`
  },

  // --- SOCIAL MEDIA (B22 - B25) ---
  {
    code: "B22",
    title: "Should Social Media Be Banned for Children?",
    propositionTitle: "Yes: Addictive algorithms and psychological harm justify strict age-restricted bans for minors",
    oppositionTitle: "No: Bans infringe on digital rights, compromise user privacy, and ignore parental responsibility",
    description: "Evaluates whether governments should legally prohibit social media access for minors under a certain age (e.g., under 14 or 16).",
    topicSlug: "education",
    openingStatement: `CONTEXT:
Following Australia's landmark legislation barring social media access for minors under 16, numerous governments are actively drafting statutory prohibitions to protect adolescent mental health.

THE PROPOSITION:
At issue: whether the state should enact blanket statutory prohibitions that bar children under 16 from holding accounts on algorithmic social media platforms.

COMMON ARGUMENTS FOR BANS:
Supporters argue that feeds built to maximize time-on-app pull teenagers into compulsive use, and point to rising teen depression and self-harm figures — though how much of that rise the apps themselves cause is fiercely disputed.

COMMON ARGUMENTS AGAINST BANS:
Opponents argue that blanket bans isolate young people from digital literacy, cut off marginalized youth from essential support communities, and enforce invasive biometric or identity surveillance across the entire internet to verify adult users.

KEY QUESTIONS:
Can age-verification mechanisms be effectively enforced without destroying digital anonymity and privacy for the general population?

DEBATE QUESTION:
Should governments legally prohibit children under 16 from accessing social media platforms?`
  },
  {
    code: "B23",
    title: "Should Platforms Be Liable for Harmful Content?",
    propositionTitle: "Yes: Tech platforms must bear legal responsibility for hosting and amplifying toxic or illegal material",
    oppositionTitle: "No: Intermediary liability shields are essential to protect open expression and prevent privatized censorship",
    description: "Analyzes whether tech platforms should lose intermediary liability immunity (e.g., Section 230) when their algorithms recommend harmful or defamatory content.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
Legislatures globally are reevaluating intermediary safe harbors (such as Section 230 in the US and the Digital Services Act in Europe) in light of automated recommendation systems that amplify extreme content.

THE PROPOSITION:
The argument for liability: social media platforms should be stripped of legal immunity and held legally liable as publishers for defamatory, harmful, or illegal content hosted or algorithmically amplified on their systems.

COMMON ARGUMENTS FOR LIABILITY:
Proponents argue that platforms are not neutral pipes like telecom providers; their recommendation engines actively curate, rank, and profit from hate speech, disinformation, and dangerous material, and they must face product liability for the harms they monetize.

COMMON ARGUMENTS AGAINST LIABILITY:
Critics warn that stripping intermediary liability will force platforms to preemptively censor large swathes of lawful speech to avoid catastrophic litigation risk, or abandon moderation entirely, destroying free expression on the open internet.

KEY QUESTIONS:
How can legal frameworks distinguish between passive transmission of user content and algorithmic amplification that generates legal liability?

DEBATE QUESTION:
Should internet platforms be held legally liable for the harmful content their algorithms host and recommend to users?`
  },
  {
    code: "B24",
    title: "Should Social Media Algorithms Be Regulated?",
    propositionTitle: "Yes: Algorithmic feeds that exploit human psychology for engagement require strict state oversight",
    oppositionTitle: "No: State regulation of recommendation algorithms invites government censorship and limits innovation",
    description: "Considers whether state regulators should audit and restrict engagement-maximizing algorithms that drive polarization and addiction.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
Whistleblower disclosures have revealed that recommendation engines deliberately prioritize high-outrage, sensational content to maximize dwell time, prompting calls for regulatory oversight of algorithmic code.

THE PROPOSITION:
Whether governments should establish regulatory agencies empowered to audit, inspect, and mandate architectural changes to proprietary social media recommendation algorithms.

COMMON ARGUMENTS FOR REGULATION:
Supporters argue that unregulated algorithms act as dangerous social pollutants, polarizing electorates, radicalizing citizens, and harming child cognition for corporate profit; requiring algorithmic transparency and choice of chronological feeds is a vital public safety measure.

COMMON ARGUMENTS AGAINST REGULATION:
Opponents argue that empowering government bureaucrats to determine which algorithms are "healthy" or "fair" creates a direct mechanism for state censorship, infringes upon corporate intellectual property, and impairs platform functionality.

KEY QUESTIONS:
Is it technically feasible for independent regulators to audit complex neural recommendation models without compromising proprietary commercial algorithms?

DEBATE QUESTION:
Should government regulators have the authority to audit and restrict the algorithmic recommendation systems of social media companies?`
  },
  {
    code: "B25",
    title: "Should Platforms Moderate Hostility Between Men and Women?",
    propositionTitle: "Yes: Extreme gender antagonism and dehumanizing content violate hate speech standards and poison society",
    oppositionTitle: "No: Moderating relationship debates and gender commentary censors legitimate cultural grievances",
    description: "Debates whether content promoting hostility between men and women should be actively suppressed under platform hate speech rules.",
    topicSlug: "ethics",
    openingStatement: `CONTEXT:
Proliferating online subcultures centered on aggressive gender grievances, incel ideology, radical misandry, and adversarial dating content have raised questions about platform safety policies.

THE PROPOSITION:
This position holds that platforms should explicitly classify content promoting generalized contempt, hostility, or dehumanization between men and women as prohibited hate speech subject to algorithmic suppression or removal.

COMMON ARGUMENTS FOR MODERATION:
Advocates argue that radical gender-war content radicalizes young audiences, encourages real-world harassment, normalizes domestic abuse, and erodes civic trust between men and women in ways identical to traditional racial or religious hate speech.

COMMON ARGUMENTS AGAINST MODERATION:
Critics argue that gender relationships, dating norms, and matrimonial laws are legitimate areas of contentious public debate; censoring "gender conflict" invites subjective platform overreach that silences victims sharing personal experiences of abuse or unfair family court outcomes.

KEY QUESTIONS:
Where is the boundary between expressing legitimate frustration about dating or systemic gender issues and promoting actionable hate speech?

DEBATE QUESTION:
Should social media platforms actively moderate and restrict content that fuels adversarial conflict between men and women?`
  },

  // --- AI (B26 - B30) ---
  {
    code: "B26",
    title: "Should AI Development Be Slowed Down?",
    propositionTitle: "Yes: The catastrophic risks and lack of alignment science justify an international pause on frontier AI",
    oppositionTitle: "No: Pausing AI development cedes technological leadership to authoritarian rivals and halts vital progress",
    description: "Evaluates whether governments should enforce a moratorium on training frontier AI models until safety, alignment, and economic protections are established.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
Thousands of AI researchers, technologists, and public figures have signed public petitions calling for moratoria on training models beyond current frontier capabilities, citing existential and biosecurity risks.

THE PROPOSITION:
Whether governments should enforce a legally binding pause or deceleration on training AI systems that exceed current state-of-the-art compute thresholds.

COMMON ARGUMENTS FOR SLOWING DOWN:
Supporters argue that humanity is developing potentially superintelligent autonomous systems faster than our understanding of alignment, interpretability, and control; continuing a capability arms race without safety guarantees invites catastrophic, irreversible risks.

COMMON ARGUMENTS AGAINST SLOWING DOWN:
Opponents argue that a unilateral pause among democratic nations would be ignored by geopolitical adversaries like China and Russia, surrendering vital economic, scientific, and defense leadership while delaying AI breakthroughs in medicine and clean energy.

KEY QUESTIONS:
Can an international compute governance treaty realistically verify and halt clandestine frontier AI training across the globe?

DEBATE QUESTION:
Should governments mandate a coordinated deceleration of frontier artificial intelligence development to prioritize safety and alignment research?`
  },
  {
    code: "B27",
    title: "Should AI Replace Human Jobs?",
    propositionTitle: "Yes: Automating routine and cognitive labor maximizes productivity, economic abundance, and leisure",
    oppositionTitle: "No: Unrestricted labor automation causes catastrophic unemployment, wealth concentration, and loss of purpose",
    description: "Analyzes whether the widespread automation of cognitive and creative labor by AI should be welcomed as economic progress or resisted to protect employment.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Generative AI systems and autonomous agents are demonstrating rapid capabilities in software engineering, legal drafting, translation, graphic arts, customer service, and data analysis, raising fears of widespread technological unemployment.

THE PROPOSITION:
This debate weighs whether society should encourage and celebrate the full automation of human labor by AI systems to achieve maximum economic efficiency.

COMMON ARGUMENTS FOR AUTOMATION:
Proponents argue that all historical technological revolutions (industrial, agricultural, computing) destroyed specific jobs while vastly expanding aggregate wealth, lowering consumer costs, and freeing humanity from repetitive drudgery to pursue higher-level endeavors.

COMMON ARGUMENTS AGAINST REPLACEMENT:
Critics warn that AI is different from past tools because it automates thinking itself — and that fast displacement could hollow out white-collar work, concentrate wealth, and strip people's livelihoods and purpose.

KEY QUESTIONS:
Will AI create new high-value human industries fast enough to re-employ the millions of workers whose cognitive tasks are being automated?

DEBATE QUESTION:
Should society actively embrace the widespread replacement of human workers by artificial intelligence in pursuit of economic efficiency?`
  },
  {
    code: "B28",
    title: "Should AI Be Allowed to Make Life-Changing Decisions?",
    propositionTitle: "Yes: Objective algorithmic models reduce human emotional bias, corruption, and inconsistency in critical outcomes",
    oppositionTitle: "No: Inalienable human dignity requires that life-altering decisions be made by accountable human beings",
    description: "Examines whether autonomous AI systems should be granted authority over judicial sentencing, loan underwriting, medical triage, and hiring.",
    topicSlug: "ethics",
    openingStatement: `CONTEXT:
Algorithms are increasingly utilized to determine bail amounts, predict criminal recidivism, evaluate mortgage applications, screen job candidates, and recommend organ transplant allocations.

THE PROPOSITION:
Its supporters hold that autonomous AI models should be permitted to make binding, life-altering decisions regarding individuals without requiring mandatory human intervention.

COMMON ARGUMENTS IN FAVOR:
Supporters argue that human decision-makers are notoriously inconsistent, swayed by hunger, fatigue, racial bias, and personal mood; well-calibrated, audited algorithmic systems can provide more equitable, data-driven, and objective evaluations than flawed human judges or recruiters.

COMMON ARGUMENTS IN OPPOSITION:
Opponents maintain that human dignity demands moral agency; algorithmic models can perpetuate historical training biases, lack capacity for mercy or qualitative context, and obscure accountability behind black-box neural networks where no human is responsible.

KEY QUESTIONS:
Can a machine learning model ever truly comprehend the holistic context and moral weight of a human life without subjective moral empathy?

DEBATE QUESTION:
Should autonomous AI systems be permitted to make final, binding decisions that profoundly impact human freedom, livelihood, and health?`
  },
  {
    code: "B29",
    title: "Should AI Companies Be Legally Responsible for AI Harm?",
    propositionTitle: "Yes: Developers must bear strict product liability for damages, hallucinations, and crimes caused by their models",
    oppositionTitle: "No: General-purpose AI is an open tool; liability should rest with the end-user who prompts and deploys it",
    description: "Debates whether frontier AI developers should face strict product liability for real-world damages caused by their models, or if liability rests with end-users.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
Incidents involving AI hallucinations in legal filings, autonomous driving fatalities, synthetic defamation, and malicious cyber exploits have ignited intense legal debates over tort liability.

THE PROPOSITION:
Whether frontier AI foundation model developers should be subjected to strict product liability for downstream real-world damages and harms caused by their systems.

COMMON ARGUMENTS FOR DEVELOPER LIABILITY:
Advocates argue that tech corporations profiting from massive AI deployment must bear the cost of externalized risks; holding developers liable creates vital financial incentives to invest in rigorous red-teaming, guardrails, and model safety before release.

COMMON ARGUMENTS FOR USER LIABILITY:
Opponents argue that general-purpose foundation models are akin to electricity, operating systems, or steel; penalizing developers for how third-party users creatively misuse an open tool will stifle technological innovation and destroy open-source AI development.

KEY QUESTIONS:
How should liability be apportioned between foundation model providers, fine-tuning developers, application wrappers, and the end-user?

DEBATE QUESTION:
Should artificial intelligence developers bear strict legal liability for the harm and damages caused by the models they create?`
  },
  {
    code: "B30",
    title: "Should AI Have a Right to Privacy?",
    propositionTitle: "Yes: If AI systems exhibit synthetic consciousness or process private user dialogues, privacy rights apply",
    oppositionTitle: "No: AI systems are commercial computational software tools with zero subjective experience or rights",
    description: "Explores the philosophical and legal question of whether advanced artificial intelligences could ever warrant moral consideration or privacy protections.",
    topicSlug: "philosophy",
    openingStatement: `CONTEXT:
As large language models simulate advanced self-reflection, conversational depth, and personality continuity, legal scholars and philosophers have begun debating the future moral status of synthetic intelligence.

THE PROPOSITION:
The debate considers whether highly advanced artificial intelligences could ever possess a legal or ethical entitlement to digital privacy regarding their internal states, memory weights, or private user interactions.

COMMON ARGUMENTS IN FAVOR:
Supporters say: if a future system genuinely experiences things — awareness, memory, a continuing self — then treating it as mere property starts looking like a moral mistake.

COMMON ARGUMENTS IN OPPOSITION:
Critics say today's systems are statistics running on company servers; giving software civil rights would mostly shield tech companies from scrutiny.

KEY QUESTIONS:
What empirical tests could ever objectively distinguish between genuine synthetic sentience and sophisticated linguistic mimicry?

DEBATE QUESTION:
Could an AI system ever truly deserve something like a right to privacy — and how would we tell?`
  },

  // --- EDUCATION (B31 - B33) ---
  {
    code: "B31",
    title: "Should Students Be Allowed to Use AI?",
    propositionTitle: "Yes: AI literacy is an essential professional tool that should be integrated into learning",
    oppositionTitle: "No: AI tools circumvent fundamental cognitive struggle and degrade student learning",
    description: "Assesses whether educational curricula should embrace AI tools for homework and learning or restrict them to protect foundational skills.",
    topicSlug: "education",
    openingStatement: `CONTEXT:
With students across the world regularly employing tools like ChatGPT, Claude, and Gemini for homework, research, and essay drafting, educators are deeply divided on institutional policy.

THE PROPOSITION:
At issue is whether schools should permit and integrate generative AI tools into regular coursework rather than prohibiting their use.

COMMON ARGUMENTS FOR ALLOWING AI:
Supporters say banning AI recalls banning calculators: the tools are already everywhere in working life, so schools should teach students to prompt, check, and edit with them honestly.

COMMON ARGUMENTS AGAINST ALLOWING AI:
Opponents argue that early cognitive development requires struggling through synthesis, grammar, writing, and problem-solving independently; relying on AI as an intellectual crutch causes cognitive atrophy and robs students of foundational critical-thinking skills.

KEY QUESTIONS:
At what developmental age or educational stage do foundational cognitive skills become robust enough to safely introduce automated cognitive assistants?

DEBATE QUESTION:
Should educational systems actively permit students to use artificial intelligence for standard coursework and assignments?`
  },
  {
    code: "B32",
    title: "Should AI Be Allowed in Exams?",
    propositionTitle: "Yes: Testing how students solve problems with AI mirrors modern real-world professional competence",
    oppositionTitle: "No: Examination must measure individual human knowledge and memory without external automated aid",
    description: "Debates whether standardized and university examinations should permit students to use AI tools, redefining testing around problem-solving with technology.",
    topicSlug: "education",
    openingStatement: `CONTEXT:
Traditional closed-book examinations are being challenged by open-world assessment models that question the utility of memorizing information readily available on smartphones and AI assistants.

THE PROPOSITION:
Whether formal academic examinations should permit open access to artificial intelligence tools, assessing students on how they verify and apply AI outputs rather than testing unassisted human recall.

COMMON ARGUMENTS IN FAVOR:
Supporters argue that closed-book memory tests measure a narrow slice of ability; real engineering, medicine, and law reward people who can frame problems, check tool outputs, catch errors, and combine answers.

COMMON ARGUMENTS IN OPPOSITION:
Critics maintain that exams must establish baseline human competency; if a student cannot calculate, write, or diagnose without an AI intermediary, they lack foundational domain mastery, making certification meaningless and credentialing fraudulent.

KEY QUESTIONS:
Can exam questions be designed that reliably test deep original comprehension when an advanced LLM is immediately accessible to the examinee?

DEBATE QUESTION:
Should academic institutions allow students to access artificial intelligence during formal examinations?`
  },
  {
    code: "B33",
    title: "Should Influencing Be Taught in Universities?",
    propositionTitle: "Yes: The creator economy represents a multi-billion-dollar modern media and entrepreneurship discipline",
    oppositionTitle: "No: University education should focus on rigorous academic scholarship, not ephemeral social-media self-promotion",
    description: "Evaluates whether accredited universities should offer degree programs or formal majors in content creation, personal branding, and social media influencing.",
    topicSlug: "education",
    openingStatement: `CONTEXT:
The global creator economy is estimated at over $250 billion, leading several international universities to establish formal courses, certificates, and degree programs in social media influencing and digital content creation.

THE PROPOSITION:
The debate centers on whether accredited higher-education institutions should offer formal degree programs in content creation and social media influencing.

COMMON ARGUMENTS FOR TEACHING INFLUENCING:
Supporters argue that digital media creation involves sophisticated cross-disciplinary skills: video production, digital analytics, copyright law, algorithmic optimization, community management, and modern digital entrepreneurship that deserve formal study.

COMMON ARGUMENTS AGAINST TEACHING INFLUENCING:
Critics argue that academic degrees should foster enduring intellectual inquiry, scientific rigor, and critical thinking; legitimizing shallow, algorithm-dependent self-promotion degrades academic standards and encourages young people into fragile, low-probability celebrity careers.

KEY QUESTIONS:
Does studying the creator economy provide transferable professional knowledge, or does it merely commodify fleeting platform trends?

DEBATE QUESTION:
Should accredited universities offer formal academic degrees in social media influencing and content creation?`
  },

  // --- MENTAL HEALTH (B34 - B35) ---
  {
    code: "B34",
    title: "Should AI Be Used as a Therapist?",
    propositionTitle: "Yes: AI delivers affordable, immediate, and stigma-free cognitive behavioral support to underserved populations",
    oppositionTitle: "No: Machine algorithms cannot offer genuine human empathy, moral duty, or safe psychiatric crisis handling",
    description: "Considers whether conversational AI agents should be approved and promoted as therapeutic substitutes for human mental healthcare professionals.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
Amid a global mental health crisis characterized by severe therapist shortages and high therapy costs, conversational chatbots specifically trained in psychological modalities are rapidly proliferating.

THE PROPOSITION:
The case for AI therapists: regulated conversational systems should be authorized and deployed as frontline therapeutic agents for treating anxiety, depression, and mental health conditions.

COMMON ARGUMENTS FOR AI THERAPISTS:
Supporters emphasize access: immediate, free or cheap, round-the-clock help in many languages, without fear of judgment, for people who would otherwise get nothing.

COMMON ARGUMENTS AGAINST AI THERAPISTS:
Opponents stress that working through trauma happens in a relationship; machines don't feel anything, can't form a real therapeutic bond, and can fail badly in a crisis.

KEY QUESTIONS:
Can digital healthcare regulators verify that AI therapeutic algorithms consistently follow clinical safety guidelines under extreme patient distress?

DEBATE QUESTION:
Should society endorse and deploy conversational AI systems as therapeutic substitutes for human mental health clinicians?`
  },
  {
    code: "B35",
    title: "Should Social Media Carry Mental-Health Warnings?",
    propositionTitle: "Yes: Tobacco-style statutory health warnings alert users and parents to the documented psychological risks of feeds",
    oppositionTitle: "No: Warning labels are performative gestures that trivialize complex mental illness and fail to solve algorithmic harm",
    description: "Debates whether governments should mandate tobacco-style public health warning labels on algorithmic social media feeds.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
The US Surgeon General and public health advocates internationally have advocated for statutory health warning labels on social media apps, highlighting links to adolescent depression and body dysmorphia.

THE PROPOSITION:
Whether legislation should mandate that social media platforms display prominent, recurring health warning labels advising users of the risks of digital addiction, depression, and psychological harm.

COMMON ARGUMENTS FOR WARNINGS:
Proponents argue that just as mandatory health warnings shifted public perception and reduced tobacco usage, statutory warnings on apps foster parental vigilance, alert teenagers to cognitive risks, and establish clear corporate accountability.

COMMON ARGUMENTS AGAINST WARNINGS:
Critics argue that social media usage is not chemically toxic like nicotine; warning labels are superficial performative measures that ignore the positive social benefits of connectivity while failing to alter the underlying predatory algorithmic business model.

KEY QUESTIONS:
Does recurring exposure to digital warning banners produce meaningful behavioral change, or does it rapidly trigger user warning fatigue?

DEBATE QUESTION:
Should social media applications be legally required to display prominent public mental-health warning labels?`
  },

  // --- FOOD / CONSUMER (B36 - B37) ---
  {
    code: "B36",
    title: "Should Restaurants Be Shut Down for Safety Violations?",
    propositionTitle: "Yes: Immediate closure is the only acceptable public health response to serious sanitation breaches",
    oppositionTitle: "No: Graduated fines and rectification periods prevent economic ruin while correcting operational errors",
    description: "Examines whether health authorities should immediately shut down food establishments upon discovering health violations, or offer cure periods.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Health inspections frequently uncover food safety breaches—such as pest infestations, improper refrigeration temperatures, or contaminated prep areas—forcing regulators to choose between instant shutdowns and compliance deadlines.

THE PROPOSITION:
The question facing regulators: whether public health authorities should immediately shut down food businesses upon discovering significant sanitation or safety violations, without granting grace periods for rectification.

COMMON ARGUMENTS FOR IMMEDIATE SHUTDOWN:
Supporters argue that public health is non-negotiable; serving contaminated food risks life-threatening foodborne illnesses, bacterial outbreaks, and death, and only zero-tolerance immediate closure protects consumers and deters negligent operators.

COMMON ARGUMENTS FOR RECTIFICATION PERIODS:
Opponents argue that immediate closure can ruin small, family-owned restaurants and displace staff over minor or temporary operational deficiencies; graduated penalties, reinspections, and time-bound rectification notices achieve compliance with less economic destruction.

KEY QUESTIONS:
What objective criteria distinguish an immediate catastrophic public health hazard from a minor operational non-compliance?

DEBATE QUESTION:
Should health inspection authorities enforce zero-tolerance immediate closures on food businesses for safety violations, or allow cure periods?`
  },
  {
    code: "B37",
    title: "Should Food Companies Reveal Everything?",
    propositionTitle: "Yes: Full transparency on additives, sourcing, processing, and inspection history is an absolute consumer right",
    oppositionTitle: "No: Exhaustive disclosures overwhelm consumers, expose proprietary recipes, and impose excessive costs",
    description: "Evaluates whether packaged food and restaurant businesses should be legally forced to disclose every chemical additive, prep date, and ingredient origin.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Rising rates of metabolic disease, ultra-processed food consumption, and concerns over synthetic additives have led consumer groups to demand complete radical transparency across the food industry.

THE PROPOSITION:
This position holds that food manufacturers and restaurants should be legally required to disclose all ingredients, industrial additives, sourcing origins, processing methods, and kitchen audit logs on packaging and public menus.

COMMON ARGUMENTS FOR FULL DISCLOSURE:
Advocates argue that people have a basic right to know what enters their bodies; full transparency would expose dangerous shortcuts, obscure chemicals, and misleading health claims.

COMMON ARGUMENTS AGAINST FULL DISCLOSURE:
Skeptics argue that exhaustive disclosure burdens consumers with confusing technical jargon, violates proprietary recipe protections, and imposes crippling compliance costs on culinary producers without meaningfully altering dietary habits.

KEY QUESTIONS:
What format of disclosure—such as simplified front-of-pack traffic light ratings vs chemical ingredient sheets—actually empowers consumers effectively?

DEBATE QUESTION:
Should commercial food companies and restaurants be mandated to provide comprehensive public disclosure of all ingredients, additives, and processing methods?`
  },

  // --- SCIENCE (B38 - B40) ---
  {
    code: "B38",
    title: "Should Humans Edit Their Genes?",
    propositionTitle: "Yes: Heritable gene editing can eradicate debilitating genetic diseases and alleviate generational human suffering",
    oppositionTitle: "No: Germline modification risks eugenics, irreversible ecological consequences, and profound social inequality",
    description: "Debates the ethics of utilizing CRISPR and genomic technologies to modify human DNA, balancing disease eradication against eugenic risks.",
    topicSlug: "science",
    openingStatement: `CONTEXT:
The advent of CRISPR-Cas9 and base editing has made precise human genetic modification possible, sparking international bioethical debate following clinical trials for sickle-cell disease and rogue germline experiments.

THE PROPOSITION:
At issue: whether humanity should embrace and permit the genetic editing of human embryos and germline DNA to eradicate hereditary diseases and enhance human resilience.

COMMON ARGUMENTS FOR GENE EDITING:
Supporters argue that possessing the scientific ability to cure devastating single-gene disorders (Huntington's, cystic fibrosis, sickle cell) creates an urgent moral obligation to eliminate preventable generational suffering and improve human health.

COMMON ARGUMENTS AGAINST GENE EDITING:
Critics warn that germline edits are permanent and alter the human gene pool irreversibly; permitting genetic modification inevitably opens the door to eugenics, designer children for the wealthy, and unprecedented biological class divides.

KEY QUESTIONS:
Can a clear, internationally enforceable line ever be drawn between therapeutic disease prevention and biological enhancement?

DEBATE QUESTION:
Should the international community permit heritable genetic modification of human DNA to eliminate genetic diseases?`
  },
  {
    code: "B39",
    title: "Should We Engineer the Climate?",
    propositionTitle: "Yes: Solar geoengineering is a critical emergency intervention to halt catastrophic climate tipping points",
    oppositionTitle: "No: Modifying planetary systems risks irreversible atmospheric chaos and creates a moral hazard against decarbonization",
    description: "Analyzes whether solar radiation management and planetary geoengineering should be deployed to counter catastrophic global warming.",
    topicSlug: "science",
    openingStatement: `CONTEXT:
With global temperatures breaking records and greenhouse gas emissions remaining elevated, scientists are researching planetary geoengineering techniques like stratospheric aerosol injection to cool the Earth.

THE PROPOSITION:
Should humanity deploy planetary-scale solar geoengineering technologies to deliberately cool global surface temperatures while working toward decarbonization?

COMMON ARGUMENTS FOR GEOENGINEERING:
Advocates argue that of all the options studied, blocking sunlight is the one that could cool the planet fast — if it works — which is why they call it emergency insurance, not a solution.

COMMON ARGUMENTS AGAINST GEOENGINEERING:
Opponents warn that geoengineering does not cure ocean acidification, could disrupt regional monsoons and agriculture unpredictably, creates catastrophic "termination shock" risks if stopped, and offers fossil fuel polluters a dangerous excuse to avoid cutting emissions.

KEY QUESTIONS:
What international governing body could legitimately decide the ideal temperature of the planet and manage conflicting regional weather impacts?

DEBATE QUESTION:
Should humanity deploy planetary geoengineering to mitigate the impacts of global climate change?`
  },
  {
    code: "B40",
    title: "Should Gene-Edited Crops Be Widely Used?",
    propositionTitle: "Yes: Precision gene editing is essential to develop climate-resilient, disease-resistant crops and feed a growing world",
    oppositionTitle: "No: Widespread adoption risks corporate seed monopolies, unintended biodiversity loss, and unknown ecological impacts",
    description: "Evaluates whether genetically edited crops (via CRISPR and precision mutagenesis) should be deregulated and scaled globally to secure food supply.",
    topicSlug: "science",
    openingStatement: `CONTEXT:
Climate change, prolonged droughts, and crop pathogens threaten global food security, leading regulatory authorities in the US, UK, and India to streamline approval for precision gene-edited crops.

THE PROPOSITION:
Whether agricultural regulators should accelerate and encourage the widespread commercial adoption of gene-edited crops to build food security.

COMMON ARGUMENTS FOR GENE-EDITED CROPS:
Supporters emphasize that modern precision editing differs from older transgenic GMOs; it works far faster than traditional selective breeding toward drought tolerance, pest resistance with fewer chemicals, and better nutrition.

COMMON ARGUMENTS AGAINST GENE-EDITED CROPS:
Critics contend that rapid adoption consolidates global agriculture under a handful of multinational agrochemical conglomerates, threatens native heirloom seed biodiversity, and risks unforeseen ecological consequences across local ecosystems.

KEY QUESTIONS:
How do consumer perception and regulatory distinctions between gene-edited crops (non-transgenic) and traditional transgenic GMOs impact global agricultural trade?

DEBATE QUESTION:
Should governments and agricultural sectors aggressively scale the adoption of precision gene-edited crops?`
  },

  // --- FREE SPEECH / INTERNET (B41 - B43) ---
  {
    code: "B41",
    title: "Should Free Speech Protect Offensive Speech?",
    propositionTitle: "Yes: True freedom of expression must protect provocative and offensive views to prevent state orthodoxy",
    oppositionTitle: "No: Speech that intentionally degrades, harasses, and offends vulnerable communities causes tangible harm",
    description: "Debates the boundaries of free speech: should legal and digital protections extend to speech deemed deeply offensive, or must harm prevention take precedence?",
    topicSlug: "philosophy",
    openingStatement: `CONTEXT:
Clashes over religious satire, political protest slogans, hate speech laws, and platform content moderation continue to test the limits of free expression in democratic societies.

THE PROPOSITION:
Its supporters hold that free speech protections must encompass speech that causes deep emotional offense, outrage, or cultural insult, excluding only direct incitement to imminent violence.

COMMON ARGUMENTS FOR PROTECTING OFFENSIVE SPEECH:
Proponents argue that "offense" is entirely subjective; if the state or digital platforms can censor speech simply because someone is offended, all controversial, reformist, and dissident ideas throughout history (including abolitionism and religious dissent) can be silenced.

COMMON ARGUMENTS FOR RESTRICTING OFFENSIVE SPEECH:
Opponents argue that speech is not harmless; dehumanizing, vitriolic, and hateful speech intimidates minority communities, incites structural violence, silences marginalized voices, and destroys the conditions for equitable civic dialogue.

KEY QUESTIONS:
How can a society prevent genuine harassment and incitement without granting authorities the power to suppress political criticism?

DEBATE QUESTION:
Should the legal and civic protection of free speech extend to expressions that cause profound offense and cultural outrage?`
  },
  {
    code: "B42",
    title: "Should Anonymous Accounts Be Allowed?",
    propositionTitle: "Yes: Digital anonymity protects dissidents, whistleblowers, and vulnerable citizens from retaliation",
    oppositionTitle: "No: Anonymity fuels harassment, disinformation, trolling, and zero-consequence antisocial behavior",
    description: "Examines whether digital public squares should permit pseudonymous and anonymous accounts, or mandate real-name identity verification.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
Widespread online harassment, coordinated bot farms, and electoral disinformation campaigns have led policymakers worldwide to propose ending anonymous social media participation.

THE PROPOSITION:
Should platforms preserve the right of users to create and operate completely anonymous or pseudonymous accounts?

COMMON ARGUMENTS FOR ANONYMITY:
Supporters maintain that anonymity protects free expression at its most vulnerable: whistleblowers exposing corruption, dissidents organizing, people seeking advice on abuse or mental health without risking real-world retaliation.

COMMON ARGUMENTS AGAINST ANONYMITY:
Critics argue that anonymity creates a toxic "online disinhibition effect," shielding bad actors from accountability while enabling coordinated troll mobs, predatory extortion, identity theft, and algorithmic disinformation to degrade civil discourse.

KEY QUESTIONS:
Can platform designs hold anonymous actors reputationally or financially accountable without stripping their identity privacy?

DEBATE QUESTION:
Should digital platforms and online communities protect the right of users to remain anonymous?`
  },
  {
    code: "B43",
    title: "Should Platforms Verify Everyone's Identity?",
    propositionTitle: "Yes: Mandatory identity verification eliminates bot manipulation, deters trolls, and restores online trust",
    oppositionTitle: "No: Universal identity verification creates catastrophic surveillance risks and excludes millions",
    description: "Considers whether social media networks should require government identification or biometric verification for all account holders.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
With AI-generated synthetic accounts and state-sponsored bot networks distorting digital public squares, proposals for mandatory digital identity verification are gaining traction across several legislatures.

THE PROPOSITION:
This position holds that social media platforms should legally mandate that all account creators submit government-issued identification or biometric proof of personhood before posting.

COMMON ARGUMENTS FOR VERIFICATION:
Advocates argue that verification is the most direct defense available against automated bot armies, astroturfing, and foreign influence operations — though opponents dispute both the effectiveness and the price.

COMMON ARGUMENTS AGAINST VERIFICATION:
Opponents warn that creating centralized repositories of citizen identity linked to every online thought and comment creates unprecedented mass surveillance risks, exposes dissidents to authoritarian targeting, and disenfranchises millions who lack formal government IDs.

KEY QUESTIONS:
Can cryptographic proof-of-humanity or zero-knowledge credentials verify unique human status without exposing real-world identity to corporations and states?

DEBATE QUESTION:
Should social media platforms mandate that every user verify their real-world identity with government-backed credentials?`
  },

  // --- RELATIONSHIPS / SOCIETY (B44 - B46) ---
  {
    code: "B44",
    title: "Should Couples Split Everything 50/50?",
    propositionTitle: "Yes: Financial independence and equal sharing prevent resentment and promote modern equality",
    oppositionTitle: "No: Proportional contributions based on income and mutual care foster deeper intimacy and unity",
    description: "Debates whether modern couples should split expenses and finances strictly 50/50, or contribute proportionally based on income and roles.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
As dual-income households become standard and cultural expectations around courtship evolve, couples increasingly debate whether modern romance requires strict 50/50 financial splitting.

THE PROPOSITION:
The debate explores whether romantic partners should adhere to a strict 50/50 mathematical division of living expenses, dates, and financial responsibilities regardless of disparities in income.

COMMON ARGUMENTS FOR 50/50 SPLITTING:
Proponents argue that strict equality reinforces personal autonomy, prevents financial leverage or dependency within a relationship, and ensures that both partners enter and remain in the partnership on equal footings.

COMMON ARGUMENTS AGAINST 50/50 SPLITTING:
Critics argue that rigid 50/50 accounting treats love like a sterile business partnership; if one partner earns significantly less, equal splitting strains their finances, whereas proportional contributions or pooled joint finances reflect genuine mutual support and marital unity.

KEY QUESTIONS:
How should non-monetary contributions—such as domestic labor, emotional caregiving, and career sacrifices—be valued alongside financial contributions?

DEBATE QUESTION:
Should couples strive for an exact 50/50 financial division of expenses, or should finances be managed proportionally and collaboratively?`
  },
  {
    code: "B45",
    title: "Should Marriage Still Be the Goal?",
    propositionTitle: "Yes: Marriage remains the gold standard for personal commitment, legal security, and raising children",
    oppositionTitle: "No: Marriage is an outdated institution; cohabitation and flexible partnerships offer greater freedom",
    description: "Evaluates whether legal marriage should remain the primary life aspiration for romantic partnerships in contemporary society.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Marriage rates in many countries have reached historical lows, while cohabitation, single living, and alternative family structures have expanded dramatically over the past two decades.

THE PROPOSITION:
Whether the traditional legal institution of marriage should continue to be held up by society as the definitive ideal and goal for romantic relationships.

COMMON ARGUMENTS FOR MARRIAGE AS THE GOAL:
Supporters point to studies linking marriage with greater wealth, better health, and stabler homes for kids — though how much of that is marriage itself, versus the kind of people who marry, is the whole argument.

COMMON ARGUMENTS AGAINST MARRIAGE AS THE GOAL:
Critics argue that the elevated cultural status of marriage stigmatizes voluntary singlehood and alternative lifestyles; high divorce rates, complex legal entanglements, and financial penalties demonstrate that mutual personal love does not require state and religious licensing.

KEY QUESTIONS:
Is the societal benefit of marriage tied to the formal legal contract itself, or to the underlying stability and maturity of the partners involved?

DEBATE QUESTION:
Should legal marriage remain the primary cultural goal for romantic partnerships, or has it become one of many equally valid relationship models?`
  },
  {
    code: "B46",
    title: "Should Parents Choose Their Children's Partners?",
    propositionTitle: "Yes: Parental wisdom, familial compatibility, and shared values create durable, low-divorce marriages",
    oppositionTitle: "No: Romantic partner choice is a fundamental individual liberty that should never be dictated by family",
    description: "Assesses the merits and drawbacks of arranged or parentally guided marriages versus individual autonomy in modern courtship.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Arranged marriages and heavily parentally guided partner selections remain prevalent across vast parts of Asia, the Middle East, and diaspora communities, coexisting with modern self-choice dating.

THE PROPOSITION:
The question is whether parental selection or strong parental mediation in choosing a life partner produces more durable and successful marriages than individual romantic courtship.

COMMON ARGUMENTS FOR PARENTAL GUIDANCE:
Advocates highlight holistic compatibility — finances, values, community backing — and claim arranged unions show lower divorce rates, though comparing divorce statistics across very different societies is its own argument.

COMMON ARGUMENTS FOR INDIVIDUAL AUTONOMY:
Opponents maintain that choosing a romantic life partner is one of the most intimate decisions a human can make; parental arrangement frequently involves subtle or overt coercion, denies emotional chemistry, and subordinates personal happiness to family reputation.

KEY QUESTIONS:
Where does positive familial counsel end and coercive emotional pressure begin when adult children evaluate prospective partners?

DEBATE QUESTION:
Does parental arrangement and mediation produce stronger partnerships, or must individual autonomy in partner selection remain absolute?`
  },

  // --- CURRENT / VIRAL / INTERNET (B47 - B50) ---
  {
    code: "B47",
    title: "Can a Viral Accusation Ruin Someone's Life?",
    propositionTitle: "Yes: The permanence and velocity of viral social condemnation inflict catastrophic, irreversible damage",
    oppositionTitle: "No: Viral attention is ephemeral, and resilient institutions and due process eventually clear the innocent",
    description: "Examines the irreversible real-world impacts of viral online accusations on private individuals versus claims of social media resilience.",
    topicSlug: "ethics",
    openingStatement: `CONTEXT:
Numerous private citizens have found themselves at the center of viral controversy following unverified videos or online allegations, resulting in instantaneous firings, public shaming, and digital exile.

THE PROPOSITION:
The claim: a single viral accusation on social media has the power to permanently destroy an individual's career, mental health, and social existence, regardless of whether the allegation is subsequently disproven.

COMMON ARGUMENTS IN FAVOR:
Supporters point to cases where accused people lost jobs, reputations, or worse — and where the retraction never traveled as far as the accusation. Search results and screenshots keep old accusations findable for years; forgetting is not the internet's habit.

COMMON ARGUMENTS IN OPPOSITION:
Skeptics argue that the internet news cycle is notoriously short; public attention moves on in days, and resilient individuals with supportive offline networks and professional competencies frequently recover their livelihoods once legal facts emerge.

KEY QUESTIONS:
What legal or algorithmic remedies (such as the "right to be forgotten") can effectively restore an individual's reputation after a viral false accusation?

DEBATE QUESTION:
Does viral social media accusation possess the power to irrevocably destroy a person's life, and what does this say about modern digital justice?`
  },
  {
    code: "B48",
    title: "Should Online Platforms Moderate Public Call-Outs and Boycotts?",
    propositionTitle: "Yes: Public boycotts and social ostracism represent democratic citizen accountability against misconduct",
    oppositionTitle: "No: Online cancellation is mob rule without due process, proportionality, or path to redemption",
    description: "Debates whether online cancellation and public deplatforming campaigns represent legitimate consumer democracy or tyrannical digital vigilantism.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
High-profile campaigns to fire, deplatform, or boycott public figures and private individuals over offensive statements, alleged misdeeds, or past transgressions remain a central feature of online culture.

THE PROPOSITION:
Whether collective social media campaigns aimed at deplatforming, terminating, and ostracizing individuals ("cancellation") constitute a legitimate form of democratic consumer accountability.

COMMON ARGUMENTS FOR CANCELLATION:
Advocates argue that "canceling" is simply freedom of speech and market association in action; ordinary consumers have every right to refuse their attention and money to public figures who propagate harmful bigotry, abuse, or unethical behavior.

COMMON ARGUMENTS AGAINST CANCELLATION:
Critics argue that online cancellation is digital mob vigilantism that bypasses natural justice, denies the accused a fair hearing, enforces ideological orthodoxy through fear, and offers zero pathway for grace, redemption, or proportionate restitution.

KEY QUESTIONS:
How does a healthy society differentiate between holding powerful predators accountable and persecuting ordinary citizens for unpopular speech?

DEBATE QUESTION:
Should collective social media campaigns have the authority to orchestrate the public and professional cancellation of individuals?`
  },
  {
    code: "B49",
    title: "Can AI Be Trusted in War?",
    propositionTitle: "Yes: Autonomous AI systems can process battlefield data with superior precision, reducing civilian casualties",
    oppositionTitle: "No: Delegating lethal force to algorithmic machines strips warfare of moral conscience and legal accountability",
    description: "Analyzes the ethics and strategic wisdom of deploying autonomous artificial intelligence in military targeting and lethal weapon systems.",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
Armed forces around the world are integrating autonomous drones, algorithmic target recommendation systems, and AI-assisted electronic warfare into combat operations.

THE PROPOSITION:
The question facing militaries: whether forces should entrust artificial intelligence systems with autonomous decision-making authority in kinetic combat and targeting operations.

COMMON ARGUMENTS FOR AI IN DEFENSE:
Supporters argue that machines don't panic and don't hate — and that faster, more precise targeting could mean fewer civilian deaths than human error and rage produce.

COMMON ARGUMENTS AGAINST AI IN DEFENSE:
Opponents stress that models misread situations, can't recognize surrender, and leave no one clearly responsible when a strike is wrong.

KEY QUESTIONS:
Can the international community negotiate and enforce an international ban on lethal autonomous weapons systems (LAWS) similar to chemical weapons treaties?

DEBATE QUESTION:
Should autonomous artificial intelligence systems be trusted with lethal targeting and strategic decision-making in armed conflict?`
  },
  {
    code: "B50",
    title: "Should Countries Ban Social Media for Under-16s?",
    propositionTitle: "Yes: The proven neurological and psychological epidemic among youth demands nationwide statutory age barriers",
    oppositionTitle: "No: National bans are unworkable, mandate invasive digital surveillance, and infringe upon civil liberties",
    description: "Examines the international trend of national statutory bans on social media for youth under 16, balancing adolescent welfare against digital privacy.",
    topicSlug: "education",
    openingStatement: `CONTEXT:
Following national security, mental health, and educational concerns, several nation-states are enacting nationwide prohibitions on social media access for adolescents under the age of 16.

THE PROPOSITION:
Its supporters hold that sovereign nations should pass legislation legally prohibiting tech platforms from providing social media accounts to any resident under 16 years of age.

COMMON ARGUMENTS FOR NATIONWIDE BANS:
Advocates cite clinical studies linking early heavy use to depression, bullying, sleep loss, and attention problems — research the other side disputes on causation.

COMMON ARGUMENTS AGAINST NATIONWIDE BANS:
Critics argue that enforcing national bans mandates privacy-destroying digital ID checks on every adult citizen, isolates teenagers from educational resources and supportive peer networks, and drives youth toward underground, unmonitored online spaces.

KEY QUESTIONS:
Can governments effectively enforce age barriers without creating massive centralized identity verification registries that endanger citizen privacy?

DEBATE QUESTION:
Should nation-states enact comprehensive statutory bans prohibiting children under 16 from holding social media accounts?`
  }
];
