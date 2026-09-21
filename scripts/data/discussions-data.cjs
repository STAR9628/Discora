/**
 * Locked Beta Discussions (D01 - D39)
 * Exact titles and descriptions approved by Product Owner.
 * Opening statements follow Section 4 requirements:
 * A. CONTEXT
 * B. WHAT WE KNOW
 * C. COMMONLY HEARD LOGIC (Argument A & B)
 * D. WHAT REMAINS UNCLEAR
 * E. DISCUSSION QUESTION
 */

module.exports = [
  // --- UPI / INDIA ---
  {
    code: "D01",
    title: "UPI: Still Free?",
    description: "India's UPI system is changing for certain higher-value merchant payments. If consumers remain free of direct charges while some merchants pay MDR, what does \"free UPI\" really mean?",
    summary: "Follow the costs behind 'free UPI' - who pays, who doesn't, and what 'free' ends up meaning.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
India's Unified Payments Interface (UPI) handles over 15 billion transactions a month, forming the backbone of digital retail payments. Recent regulatory updates from NPCI introduced interchange fees on prepaid payment instrument (PPI) wallets for merchant transactions above ₹2,000, prompting renewed debate over the financial sustainability of "free" payment rails.

WHAT WE KNOW:
- Person-to-person (P2P) transactions and regular person-to-merchant (P2M) bank-to-bank UPI transactions remain completely free for consumers.
- An interchange fee of up to 1.1% applies specifically to merchant transactions initiated via PPI wallets (such as Paytm Wallet or Amazon Pay) exceeding ₹2,000.
- Payment service providers, banks, and NPCI incur infrastructure, server, and fraud-prevention operational costs to sustain high uptime.

COMMONLY HEARD LOGIC:
Argument A: Digital infrastructure of this scale cannot remain indefinitely subsidized by government grants and bank reserves without deteriorating quality, innovation slowdown, or indirect fees passed on through other banking charges.
Argument B: Keeping UPI free for everyday consumers and small merchants is a critical public good that drove financial inclusion, reduced cash-handling costs across the economy, and formalized retail commerce.

WHAT REMAINS UNCLEAR:
Whether payment aggregators will eventually find indirect ways to shift costs onto small merchants or consumers, and whether the government will continue providing budgetary support to incentivize zero-MDR.

DISCUSSION QUESTION:
If consumer-facing payments remain free while backend merchant and wallet transactions bear costs, what does "free UPI" really mean for the long-term economy?`
  },
  {
    code: "D02",
    title: "Who Pays for UPI?",
    description: "UPI may feel free to users, but operating a massive payment network still has costs. Should those costs ultimately be absorbed by merchants, banks, payment companies, or the wider system?",
    summary: "Who should pay for UPI - merchants, banks, tech companies, or taxpayers?",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
While consumers experience instant, zero-cost digital transactions on UPI, the ecosystem relies on complex server infrastructure, cybersecurity defenses, payment settlement gateways, and telecommunications networks that require ongoing capital investment.

WHAT WE KNOW:
- The Reserve Bank of India (RBI) published a discussion paper on charges in payment systems examining the cost of processing digital transactions.
- The Ministry of Finance has periodically allocated special incentive funds (over ₹1,500–₹2,500 crore annually) to banks to offset zero-MDR on RuPay and UPI.
- Major fintech apps (PhonePe, Google Pay, Paytm) invest heavily in server loads, customer dispute resolution, and compliance without collecting direct interchange fees on standard peer-to-peer transfers.

COMMONLY HEARD LOGIC:
Argument A: Commercial enterprises processing millions of high-value merchant sales benefit directly from instantaneous settlement and should bear a standard merchant discount rate (MDR), similar to credit card networks.
Argument B: Universal zero-cost digital rails generate immense macroeconomic velocity, tax transparency, and digital formalization, meaning funding should come from national infrastructure budgets rather than private merchant friction.

WHAT REMAINS UNCLEAR:
The exact net operating cost per UPI transaction across issuing banks, acquiring banks, and application providers, and whether current government subsidy schemes fully cover these operational outlays.

DISCUSSION QUESTION:
Who should pay for UPI — merchants, banks, tech companies, or taxpayers?`
  },
  {
    code: "D03",
    title: "Will UPI Change How We Pay?",
    description: "As charges are introduced for some larger merchant transactions, could businesses and consumers change how they choose between UPI, cards and cash?",
    summary: "Will new fees change how India actually chooses to pay - and what would that reveal?",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
As transaction volumes reach historic highs, subtle fee adjustments on prepaid wallets, potential caps on fintech market share, and credit-line integrations on UPI are altering the competitive landscape between digital wallets, debit/credit cards, and cash.

WHAT WE KNOW:
- Credit cards linked to UPI (via RuPay networks) allow users to spend on credit while scanning standard UPI QR codes.
- High-ticket merchants frequently compare the settlement speed, chargeback risks, and interchange fees of card POS machines versus static or dynamic UPI soundboxes and QR terminals.
- Cash in circulation has continued to grow in absolute nominal terms even as digital transaction volume and velocity have exponentially scaled.

COMMONLY HEARD LOGIC:
Argument A: Habit and convenience dominate consumer behavior; once users and roadside vendors experience sub-second, frictionless QR payments, they will not revert to cash or physical cards regardless of minor backend policy shifts.
Argument B: If merchants begin encountering surcharges or settlement delays on higher-value digital transactions, they may incentivize cash discounts or encourage direct card payments to manage margins.

WHAT REMAINS UNCLEAR:
How sensitive small-to-medium retail merchants are to fractional interchange variations, and whether consumer payment habits will fragment as credit integration deepens.

DISCUSSION QUESTION:
Could targeted transaction fees and evolving credit integrations alter the balance of how Indian consumers and businesses choose between UPI, payment cards, and physical currency?`
  },

  // --- WAR / CONFLICT ---
  {
    code: "D04",
    title: "When Does a War End?",
    description: "When fighting stops, is a war actually over—or does it require a ceasefire, political settlement, withdrawal, security guarantees, or lasting peace?",
    summary: "When is a war really over: the ceasefire, the treaty, or something deeper?",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
Across modern conflicts—from the Korean Peninsula and the Balkans to Ukraine and the Middle East—the line between an active war, a frozen conflict, an armistice, and genuine political peace is frequently blurred.

WHAT WE KNOW:
- Historical conflicts frequently transition into prolonged armistices without formal peace treaties (e.g., the 1953 Korean Armistice Agreement).
- International humanitarian law distinguishes between active hostilities, ceasefires, peace agreements, and post-conflict occupation regimes.
- Ceasefires frequently collapse or evolve into entrenched militarized borders with recurring border skirmishes.

COMMONLY HEARD LOGIC:
Argument A: A war ends only when an enforceable political settlement resolves the underlying territorial or sovereign dispute, established through signed treaties, demilitarization, and mutual recognition.
Argument B: From a humanitarian and pragmatic perspective, a war ends when the guns fall silent and civilian death rates drop, even if political grievances remain completely unresolved indefinitely.

WHAT REMAINS UNCLEAR:
What specific security guarantees or international enforcement mechanisms successfully prevent a temporary pause in fighting from serving merely as an operational re-arming period.

DISCUSSION QUESTION:
When the fighting stops but nothing is actually resolved, has the war really ended?`
  },
  {
    code: "D05",
    title: "Can Peace Be Forced?",
    description: "When military pressure and diplomacy operate at the same time, what actually makes a peace agreement possible—and what makes it last?",
    summary: "A room for examining what makes forced peace hold — or collapse — after enemies are pressured to negotiate.",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
International diplomacy frequently relies on coercive tools—including economic sanctions, arms embargoes, diplomatic isolation, and external military deterrents—to compel warring parties to enter peace negotiations.

WHAT WE KNOW:
- Major multilateral peace frameworks (e.g., the Dayton Accords in 1995) involved significant external diplomatic coercion, military air strikes, and economic threats alongside formal negotiations.
- Researchers who track peace agreements often note that many break down within a few years when the underlying grievances go unaddressed — though estimates vary widely depending on how breakdown is counted.
- External peace enforcement differs under international law from peacekeeping, requiring Chapter VII authorization under the UN Charter.

COMMONLY HEARD LOGIC:
Argument A: Warring parties rarely concede vital strategic goals voluntarily; external economic and military force is often the only realistic mechanism to create a "mutually hurting stalemate" that brings leaders to the table.
Argument B: Peace imposed through external coercion breeds resentment, ignores grassroots reconciliation, and predictably collapses as soon as external enforcement powers withdraw or lose political resolve.

WHAT REMAINS UNCLEAR:
Which specific combinations of domestic institutional guarantees and external monitoring make coerced settlements durable rather than temporary truces.

DISCUSSION QUESTION:
When pressure forces enemies to the table, what decides whether the peace holds or collapses?`
  },
  {
    code: "D06",
    title: "When War Goes Viral",
    description: "Footage, satellite imagery, eyewitness accounts and claims from active conflicts can reach millions within minutes. Does social media help people understand war, or make complex conflicts easier to oversimplify?",
    summary: "Does watching war unfold live help us understand it - or flatten it into spectacle?",
    topicSlug: "politics",
    openingStatement: `CONTEXT:
In ongoing 21st-century conflicts, battlefield footage captured by drones, soldiers' body cameras, and civilian smartphones is uploaded to platforms like Telegram, X, and TikTok in near real-time, often before traditional military press briefings or verified journalistic dispatches occur.

WHAT WE KNOW:
- Open-source intelligence (OSINT) groups use geotagged imagery, satellite feeds, and verified timestamps to track troop movements and investigate alleged war crimes with unprecedented transparency.
- Disinformation, out-of-context video game clips, recycled historical footage, and state-sponsored information warfare circulate simultaneously to millions of viewers during active military operations.
- Feeds rank content to keep people watching, and in practice emotionally intense footage often travels further than slower, verified reporting.

COMMONLY HEARD LOGIC:
Argument A: Citizen journalism and open-source documentation democratize war reporting, preventing state censors and military authorities from concealing civilian atrocities, battlefield realities, or failed campaigns.
Argument B: Viral war media fragments complex historical and geopolitical conflicts into 15-second emotional spectacles, weaponizing public sentiment and replacing objective fact-checking with tribal narrative loyalty.

WHAT REMAINS UNCLEAR:
How regular social media consumers can reliably distinguish authentic combat documentation from coordinated psychological operations, deepfakes, and algorithmic distortions in real time.

DISCUSSION QUESTION:
Does the instantaneous, viral circulation of raw conflict footage enhance democratic accountability and global awareness, or does it primarily distort and polarize public understanding of war?`
  },

  // --- MEN / WOMEN / GENDER ---
  {
    code: "D07",
    title: "When Everything Becomes a Gender War",
    description: "Why do individual crimes, relationship disputes and viral incidents so quickly become evidence in the wider \"men vs women\" conflict online?",
    summary: "Why do personal disputes keep getting drafted into a wider gender war online?",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Social media commentary on high-profile relationship breakups, domestic disputes, workplace conflicts, and criminal incidents routinely frames individual interpersonal failures as systemic indictments of an entire gender.

WHAT WE KNOW:
- Feeds tend to reward stark, high-emotion takes, so measured voices get drowned out and gender flashpoints keep going viral.
- People also tend to read each new incident as proof of what they already believed about the other side.
- Legal systems examine individual evidence, intent, and cross-examination, whereas viral commentary interprets cases through cultural narratives and ideological lenses.

COMMONLY HEARD LOGIC:
Argument A: Individual events reflect pervasive systemic power imbalances, patriarchal attitudes, or emerging legal biases; treating them purely as isolated incidents ignores deep cultural patterns that demand public attention.
Argument B: Generalizing individual misconduct or relationship disputes into collective guilt poisons public discourse, erodes empathy between men and women, and prevents impartial examination of actual facts.

WHAT REMAINS UNCLEAR:
The degree to which online polarization reflects genuine societal shifts in interpersonal relationships versus algorithmically amplified vocal extremes.

DISCUSSION QUESTION:
Why do specific interpersonal disputes and viral incidents so readily become battlegrounds for broader gender conflict, and what does this trend reveal about modern digital discourse?`
  },
  {
    code: "D08",
    title: "Are Men and Women Fighting Online More Than Ever?",
    description: "Has social media genuinely intensified conflict between men and women, or has it simply made disagreements that already existed more visible?",
    summary: "Has the internet made gender conflict worse, or just more visible?",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Commentary sections, podcast clips, and viral threads frequently feature intense rhetorical battles between men's rights advocates, feminist commentators, tradwife influencers, and dating coaches, giving the impression of escalating societal estrangement.

WHAT WE KNOW:
- Polls in several democracies have found young men and women drifting apart politically — though what exactly is drifting, and why, is itself disputed.
- Recommendation feeds cluster users with like-minded content, which can harden grievance-based narratives on all sides.
- Meanwhile most daily life — partnerships, friendships, workplaces — goes on without any of this acrimony.

COMMONLY HEARD LOGIC:
Argument A: Online platforms have actively radicalized gender discourse by monetizing outrage, creating insular reactionary subcultures, and fostering hostility that did not exist in prior generations.
Argument B: Digital platforms haven't generated new hostility; they have merely provided a public microphone for historical frictions, unmet expectations, and power imbalances that were previously suppressed or privatized.

WHAT REMAINS UNCLEAR:
How deeply online gender antagonism affects offline relationship formation, marriage rates, and day-to-day workplace trust across different demographics and cultures.

DISCUSSION QUESTION:
Has the digital environment genuinely escalated interpersonal conflict between genders, or has it simply exposed and amplified preexisting societal tensions?`
  },
  {
    code: "D09",
    title: "Is Dating Getting Harder?",
    description: "Dating apps, changing expectations and new relationship norms have transformed how people meet. Have they actually made finding and maintaining relationships harder?",
    summary: "Has dating tech made love harder to find - or harder to settle for?",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Across modern societies, single individuals report widespread dating app fatigue, ghosting, misaligned expectations, and difficulty forming long-term romantic partnerships, despite unprecedented digital connectivity.

WHAT WE KNOW:
- Online dating has become the primary mechanism by which couples meet in many urbanized countries, surpassing introductions through friends, family, and workplace circles.
- Demographic data across multiple OECD countries and emerging economies show declining marriage rates, rising median ages at first marriage, and increasing percentages of young adults living without a romantic partner.
- Dating platforms rely on algorithmic matchmaking models that prioritize user retention and subscription revenue alongside partner matching.

COMMONLY HEARD LOGIC:
Argument A: Technology has created a "paradox of choice" where endless swiping encourages superficial evaluations, disposable attitudes toward partners, and unattainable perfectionism that undermines commitment.
Argument B: Dating is not harder; it is simply more honest and voluntary. Greater financial independence and social freedom allow individuals to reject unfulfilling or coercive relationships rather than settle out of social pressure.

WHAT REMAINS UNCLEAR:
Whether the perceived difficulty in modern dating is primarily driven by technological mechanics (apps and algorithms) or broader socioeconomic factors such as housing costs, career demands, and shifting gender norms.

DISCUSSION QUESTION:
Have modern dating apps and evolving social expectations made building durable romantic relationships harder, or have they raised the standards for mutual compatibility?`
  },
  {
    code: "D10",
    title: "When Dating Becomes a Marketplace",
    description: "Profiles, algorithms, appearance, endless choice and quick judgments can make dating feel transactional. Has technology changed how people evaluate potential partners?",
    summary: "What swipe-and-filter dating does to how people value each other.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
With modern dating platforms formatting romantic discovery into swipe decks, filtering criteria (height, income, education, location), and algorithmic scorecards, participants increasingly describe romance using economic terms like "market value," "leverage," and "dealbreakers."

WHAT WE KNOW:
- Modern dating platforms use optimization algorithms, profile scoring, and tiered subscription features (e.g., boosts, read receipts, premium filters) to monetize romantic search.
- On swipe-based apps, first impressions form in seconds and photos carry most of the weight — which is why profiles can feel so superficial.
- Traditional courtship relied heavily on shared community context, interpersonal reputation, and gradual acquaintance through physical proximity over time.

COMMONLY HEARD LOGIC:
Argument A: Treating romance like an e-commerce catalog commodifies human beings, encourages cynical transactionalism, and reduces complex character qualities to superficial checklist metrics.
Argument B: Filtering parameters provide necessary agency and efficiency, allowing people to avoid incompatible matches, declare core values early, and escape restrictive geographic or social limitations.

WHAT REMAINS UNCLEAR:
Whether transactional evaluation habits formed on dating apps carry over into long-term relationship dynamics, communication styles, and conflict resolution after commitment.

DISCUSSION QUESTION:
Has turning partner-search into swiping and filters changed what people actually value in a partner?`
  },
  {
    code: "D11",
    title: "Why Are Women Still Paid Less?",
    description: "Gender pay gaps remain a persistent issue, but their causes can involve occupation, seniority, working hours, career interruptions, caregiving and discrimination. What actually explains the gap?",
    summary: "Untangling what really explains the gap between men's and women's pay.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Official economic statistics worldwide continue to report a disparity between median male and female earnings. Policy debates persist over whether this gap is primarily driven by outright employer discrimination, occupational segregation, or structural caregiving burdens.

WHAT WE KNOW:
- Economic analyses (including Nobel laureate Claudia Goldin's research) demonstrate that raw pay gaps narrow significantly when adjusted for hours worked, specific job title, years of continuous experience, and educational attainment, but a persistent penalty remains tied to childbearing and family caregiving.
- Sectors with high temporal flexibility (where compensation scales linearly with hours) display smaller pay disparities than professions demanding unpredictable, round-the-clock availability.
- The raw, unadjusted pay gap compares median earnings of all working men against all working women, capturing differences in industries, leadership representation, and career interruptions.

COMMONLY HEARD LOGIC:
Argument A: The persistence of pay disparity stems from structural discrimination, undervaluation of female-dominated professions, inequitable promotion pipelines, and the failure of workplaces to accommodate maternal caregiving.
Argument B: The adjusted gap is largely an outcome of differential choices regarding work-life balance, career risk profiles, hours worked, and voluntary interruptions rather than pervasive employer wage discrimination.

WHAT REMAINS UNCLEAR:
To what extent occupational preferences and caregiving roles are freely chosen versus shaped by rigid social conditioning and a lack of affordable childcare infrastructure.

DISCUSSION QUESTION:
What combination of workplace structures, caregiving expectations, occupational choices, and employer biases best explains the persistence of gender pay disparities?`
  },

  // --- LINDSAY CLANCY / TRIALS ---
  {
    code: "D12",
    title: "Trial by TikTok",
    description: "The Lindsay Clancy trial ended in a mistrial after the jury could not reach a unanimous verdict. At the same time, the case became a major online spectacle. When millions of people discuss a criminal trial online, does that help people understand it—or distort it?",
    summary: "What trial-by-TikTok does to justice: illumination or distortion?",
    topicSlug: "ethics",
    openingStatement: `CONTEXT:
The criminal trial of Lindsay Clancy in Massachusetts—involving the tragic deaths of her three young children and complex legal defenses concerning postpartum mental illness, prescription medications, and criminal responsibility—became the subject of intense, viral social media commentary on platforms like TikTok and YouTube before ending in a mistrial due to a deadlocked jury.

WHAT WE KNOW:
- The jury in Plymouth Superior Court was unable to reach a unanimous verdict on the charges after days of deliberation, resulting in the judge declaring a mistrial.
- Under Massachusetts criminal law, the legal standards for criminal responsibility and legal insanity require specific statutory thresholds regarding mental disease or defect and the capacity to appreciate wrongfulness or conform conduct to the law.
- Millions of social media posts, amateur reaction videos, and hashtag campaigns analyzed courtroom livestreams, competing medical expert testimonies, and family statements outside formal rules of evidence.

COMMONLY HEARD LOGIC:
Argument A: Public livestreaming and digital commentary open judicial proceedings to scrutiny, demystify the legal system for ordinary citizens, and foster vital public discussions on postpartum mental health and healthcare systems.
Argument B: Social media creators exploit acute personal tragedies for clicks, present selective snippets without evidentiary context, and encourage speculative verdicts that jeopardize fair trial standards and jury impartiality.

WHAT REMAINS UNCLEAR:
The degree to which viral social media discourse penetrates sequestered or un-sequestered jury panels, and how trial judges can balance public court transparency with fair trial guarantees in the smartphone era.

DISCUSSION QUESTION:
When a trial plays out on TikTok at the same time as in court, does all that attention help anyone understand the case — or just make a fair trial harder?`
  },
  {
    code: "D13",
    title: "Can the Internet Judge a Trial?",
    description: "Viral clips, TikTok analysis, Reddit discussions and commentary can make people feel like they understand a case. How should people distinguish courtroom evidence from online interpretation and speculation?",
    summary: "Learning to tell courtroom evidence apart from online commentary.",
    topicSlug: "ethics",
    openingStatement: `CONTEXT:
Livestreamed court proceedings—from celebrity defamation disputes to high-stakes criminal prosecutions—are increasingly sliced into viral 30-second clips, dissected by armchair legal analysts, and debated by millions of users who form resolute conclusions about guilt or liability.

WHAT WE KNOW:
- Legal trials operate under formal rules of evidence designed to exclude prejudicial, hearsay, irrelevant, or unauthenticated material to ensure due process.
- Social media algorithms incentivize dramatic moments, facial expressions, emotional outbursts, and simplistic morality tales, often omitting hours of technical testimony, chain of custody, and statutory jury instructions.
- Juries are legally bound to decide cases solely on admissible evidence presented within the courtroom under specific standards of proof (e.g., beyond a reasonable doubt).

COMMONLY HEARD LOGIC:
Argument A: The public has a constitutional right to observe justice being administered, and collective crowd wisdom and citizen research can sometimes highlight inconsistencies, systemic prejudices, or prosecutorial overreach.
Argument B: Justice cannot be crowdsourced; online audiences lack access to the complete legal record, are immune to rules of evidence, and form verdicts based on parasocial sympathy, charismatic presentation, and algorithmic bias.

WHAT REMAINS UNCLEAR:
Whether jurors who live on the same feeds as everyone else can really set aside what they saw online when they enter the jury box.

DISCUSSION QUESTION:
If you have watched hours of clips about a trial, how do you tell what counts as evidence and what is just commentary?`
  },

  // --- FOOD SAFETY ---
  {
    code: "D14",
    title: "Restaurant Food Safety and Consumer Trust",
    description: "How much should consumers trust restaurants and food businesses to maintain safety standards without constant inspection?",
    summary: "How much trust should restaurants get - and who verifies it?",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Recent global investigations into restaurant hygiene, synthetic adulteration, food preservative levels, and cloud kitchen standards have prompted renewed consumer scrutiny over how commercial food is handled before it reaches the table.

WHAT WE KNOW:
- Regulatory agencies (such as the FDA in the US, FSSAI in India, or EFSA in Europe) establish strict microbiological, chemical, and hygiene safety thresholds for commercial food operators.
- Due to staffing constraints, physical government inspections of individual restaurants and cloud kitchens occur periodically or reactively following public complaints, rather than continuously.
- Many commercial kitchens implement private third-party hazard analysis (HACCP) certifications, temperature logging, and supply chain audits to maintain safety.

COMMONLY HEARD LOGIC:
Argument A: In a competitive market, restaurants have overwhelming financial and reputational incentives to ensure safe food; an outbreak of food poisoning can permanently destroy a business and its owners.
Argument B: Margin pressures, high staff turnover, and the invisibility of food preparation behind closed kitchen doors create recurrent temptations to cut corners on refrigeration, sanitation, and expired ingredients unless monitored.

WHAT REMAINS UNCLEAR:
How effectively emerging models like app-based delivery aggregators and virtual cloud kitchens are being audited compared to traditional dine-in establishments.

DISCUSSION QUESTION:
How much reliance should consumers place on market reputational incentives versus continuous regulatory inspections to ensure dining safety?`
  },
  {
    code: "D15",
    title: "When Food Goes Viral",
    description: "A food-safety complaint can reach millions before an official investigation is complete. Does viral exposure improve accountability, or can it create an online verdict before the facts are established?",
    summary: "Weighing viral food-safety alarms against due process for the accused.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Customers who find foreign objects, pests, or spoiled food in restaurant orders or packaged goods frequently post smartphone photos and videos to social media, triggering immediate boycott calls, viral mockery, and corporate apologies before health inspectors arrive.

WHAT WE KNOW:
- Viral food safety posts have prompted rapid official government inspections, warehouse raids, and immediate batch recalls that might have otherwise taken weeks through bureaucratic channels.
- In a few publicized cases, claims that went viral were later walked back — the lab results didn't match the video, or the incident turned out to be isolated — but by then the damage to the business was done.
- Health inspection agencies require chain-of-custody verification, laboratory culture testing, and forensic sample analysis before issuing formal violation notices.

COMMONLY HEARD LOGIC:
Argument A: Viral consumer complaints democratize accountability, giving ordinary citizens leverage against negligent corporations and forcing indifferent authorities to enforce public health codes swiftly.
Argument B: Social media serves as an unregulated court that destroys livelihood and employee jobs on unverified allegations, lacking forensic verification, fair hearing, or meaningful remedies for falsely accused businesses.

WHAT REMAINS UNCLEAR:
How to tell the difference fast — before the boycott calls start — between a real warning and a pile-on.

DISCUSSION QUESTION:
When a food-safety video goes viral, how do you decide whether to trust it, share it, or wait?`
  },
  {
    code: "D16",
    title: "What Should Food Labels Tell Consumers?",
    description: "How much should restaurants and food companies disclose about ingredients, preparation, sourcing and safety before consumers make their choice?",
    summary: "What food labels owe the people reading them.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Debates over food transparency have expanded from basic nutritional labels to demands for full disclosure regarding ultra-processed additives, industrial cooking oils, artificial colorings, meat origin, and kitchen inspection history.

WHAT WE KNOW:
- Food regulations mandate allergen labeling and packaged ingredient lists in descending order of predominance by weight in most jurisdictions.
- Restaurant menus are rarely subject to the same granular ingredient disclosure rules as packaged consumer goods, often omitting exact oil types, additives, and prep dates.
- Calorie counts on chain menus seem to nudge some orders, though most people still pick what they wanted — and hardly anyone can do much with a detailed additive list.

COMMONLY HEARD LOGIC:
Argument A: Consumers have an absolute ethical and health right to know every ingredient, chemical additive, cooking medium, and kitchen hygiene score before spending money and putting food into their bodies.
Argument B: Mandating exhaustive ingredient provenance and lab-level disclosures on every menu imposes crushing compliance burdens on small culinary businesses without meaningfully improving health outcomes for the majority of diners.

WHAT REMAINS UNCLEAR:
Which specific disclosure formats—such as digital QR codes, hygiene letter grades, or front-of-pack warnings—actually inform consumer choices without overwhelming them with data.

DISCUSSION QUESTION:
Where should regulatory policy draw the line between essential consumer food transparency and reasonable operating flexibility for culinary businesses?`
  },

  // --- AI ---
  {
    code: "D17",
    title: "Who's Controlling the AI?",
    description: "As AI systems become more capable and autonomous, where should human oversight remain essential?",
    summary: "Where humans must stay in charge of AI - and what 'in charge' even means.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
The deployment of autonomous AI agents across critical domains—including medical diagnostics, financial underwriting, policing, energy grids, and military targeting—has sparked intense international debate over human-in-the-loop governance.

WHAT WE KNOW:
- Regulatory frameworks like the EU AI Act classify AI applications by risk tier, mandating human oversight and traceability for "high-risk" autonomous systems.
- As machine learning models process multimodal data at superhuman speeds, human operators often experience "automation bias," uncritically accepting AI recommendations without thorough scrutiny.
- Major AI labs and governments keep negotiating voluntary and binding safety-testing rules for the most capable models.

COMMONLY HEARD LOGIC:
Argument A: Without mandatory, legally enforceable human sign-off on life-altering decisions, society risks ceding moral agency, accountability, and constitutional protections to opaque algorithmic black boxes.
Argument B: Insisting on human intervention at every stage creates crippling operational bottlenecks and reintroduces human cognitive bias and fatigue into systems designed specifically for objective, high-speed precision.

WHAT REMAINS UNCLEAR:
How to define "meaningful human control" in systems whose internal neural reasoning cannot be fully audited or explained in real time by human overseers.

DISCUSSION QUESTION:
Where must a human stay genuinely in charge — and how do we keep that from becoming a rubber stamp nobody reads?`
  },
  {
    code: "D18",
    title: "Would You Trust an AI Therapist?",
    description: "People are increasingly turning to AI for emotional and mental-health support. Where can AI genuinely help, and where does human professional care remain important?",
    summary: "Where AI comfort ends and real clinical care begins.",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
With public mental health services experiencing severe therapist shortages and high out-of-pocket costs, millions of people have begun using conversational LLMs and dedicated therapeutic chatbots for emotional support, journaling, and cognitive reframing.

WHAT WE KNOW:
- Small trials of CBT-style chatbots have reported short-term improvements for mild anxiety — promising, but small, short, and far from proof they work generally.
- Chatbots have also given bad advice in edge cases, including in crisis moments, and they carry no duty of care toward the person talking to them.
- Licensed human psychotherapists undergo thousands of hours of clinical training, adhere to strict confidentiality and reporting ethics, and rely heavily on non-verbal somatic cues and the therapeutic alliance.

COMMONLY HEARD LOGIC:
Argument A: AI mental health tools provide immediate, free, stigma-free, 24/7 accessible support for individuals who would otherwise receive zero care due to economic or geographical barriers.
Argument B: Mental healthcare is inherently relational; substituting genuine human connection with a statistical text-prediction engine risks emotional dependency, misdiagnosis of complex trauma, and dangerous failures during psychiatric crises.

WHAT REMAINS UNCLEAR:
The long-term psychological impacts of forming parasocial, emotionally intimate bonds with artificial conversational systems across diverse age groups.

DISCUSSION QUESTION:
Where can artificial intelligence responsibly augment emotional well-being, and where does human clinical expertise remain irreplaceable?`
  },
  {
    code: "D19",
    title: "Who Owns Your Face?",
    description: "AI can increasingly reproduce someone's face, voice and likeness. What rights should people have over their digital identity?",
    summary: "Who owns your face once anyone can copy it?",
    topicSlug: "technology",
    openingStatement: `CONTEXT:
Generative diffusion models and voice cloning software now allow photorealistic replication of human faces, speech cadences, and mannerisms from a few publicly accessible photographs or audio recordings.

WHAT WE KNOW:
- Legal protections for likeness, name, and image vary dramatically by jurisdiction; some US states recognize a distinct "right of publicity," while other countries rely on copyright or defamation statutes.
- High-profile controversies in entertainment, political campaigning, and non-consensual synthetic imagery have prompted legislative efforts (such as the US NO FAKES Act proposals) to establish digital likeness rights.
- Training datasets for generative foundation models have ingested billions of publicly accessible online photos and videos without explicit individual consent licenses.

COMMONLY HEARD LOGIC:
Argument A: An individual's biometric likeness, voice, and facial identity are inalienable personal property; generating or commercializing synthetic replicas without explicit informed consent is digital theft and a violation of bodily integrity.
Argument B: Overly broad ownership rights over digital likeness could stifle parody, artistic expression, fair use journalism, and technical innovation in computer graphics and interactive media.

WHAT REMAINS UNCLEAR:
How existing legal frameworks can enforce likeness protections internationally against anonymous distributed open-source generative models hosted across foreign borders.

DISCUSSION QUESTION:
If someone can clone your face and voice from a few photos, what rights should you actually have over your own likeness?`
  },

  // --- SOCIAL MEDIA ---
  {
    code: "D20",
    title: "Can a Viral Video Be Evidence?",
    description: "A short video can shape millions of opinions within hours. How much should we believe from a viral clip before its context, source and authenticity are independently established?",
    summary: "What a viral clip can prove - and what it can't.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Short-form smartphone videos captured on streets, in classrooms, or during traffic stops regularly go viral, sparking nationwide outrage, official inquiries, and personal consequences for the individuals filmed.

WHAT WE KNOW:
- Video captures genuine sensory data of an event occurring in physical space, providing evidentiary value that eyewitness testimony often lacks.
- The meaning of a recording is heavily influenced by framing: what occurred immediately prior to recording, what happened off-camera, selective editing, camera angle, and descriptive captions added by the uploader.
- Forensic video analysts require raw uncompressed metadata, continuous multi-angle footage, and independent corroboration before treating video recordings as definitive evidence in legal trials.

COMMONLY HEARD LOGIC:
Argument A: Video footage is the most democratic and reliable form of evidence available to the public, documenting misconduct, discrimination, and violence that official reports have historically covered up.
Argument B: A 15-second clipped video stripped of preceding context or manipulated by emotional captions can easily invert victim and aggressor, manufacturing false public outrage before facts can catch up.

WHAT REMAINS UNCLEAR:
Whether ordinary viewers can realistically check a clip before sharing — or whether share-first, verify-later is now baked in.

DISCUSSION QUESTION:
A clip can make you feel certain in seconds. What would it take to earn that certainty — and how often do you actually check?`
  },
  {
    code: "D21",
    title: "When the Internet Picks a Villain",
    description: "Why can online audiences reach a strong conclusion about someone before the full story is available?",
    summary: "A room for examining why online crowds converge so fast on a villain — and what that speed does to evidence and fairness.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
High-speed social media cycles routinely identify private individuals involved in minor public disputes, branding them as national villains, doxxing their employers, and organizing mass harassment campaigns within a matter of hours.

WHAT WE KNOW:
- Crowds reward moral outrage with visible approval, so condemnation feeds on itself.
- People cleared after the fact often find the correction never catches up with the accusation — not in reputation, work, or peace of mind.
- The architecture of modern social feeds decouples accusation from accountability; users who share a misleading viral condemnation rarely see or share subsequent corrections or exonerations.

COMMONLY HEARD LOGIC:
Argument A: Public social shaming functions as an informal community defense mechanism against antisocial behavior, racism, and entitlement that the formal legal system is too slow or indifferent to address.
Argument B: Internet mob justice lacks basic principles of natural justice—the right to hear the accusation, present a defense, examine evidence, and receive a proportionate response—resulting in cruel, disproportionate punishment.

WHAT REMAINS UNCLEAR:
What platform design changes or legal remedies can effectively protect individuals from reckless viral vigilantism without silencing legitimate public criticism.

DISCUSSION QUESTION:
What makes online crowds turn on someone so fast — and where is the line between holding someone accountable and presuming they're guilty?`
  },

  // --- WOMEN / WORK / TRADITION ---
  {
    code: "D22",
    title: "The Motherhood Penalty",
    description: "Women's careers and earnings can change after having children. How much of this reflects personal choices, workplace structures, social expectations or unequal caregiving?",
    summary: "How motherhood reshapes careers: choice, structure, or both?",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Empirical labor economics consistently identifies the birth of a first child as the inflection point where male and female career trajectories sharply diverge, producing the so-called "motherhood wage penalty" alongside a "fatherhood wage premium."

WHAT WE KNOW:
- Research in labor economics shows that while childless men and women with similar qualifications have relatively comparable wage trajectories, mothers experience long-term earnings drops averaging 20-30% compared to fathers.
- Flexible or reduced-hour positions often lose more pay than the hours alone would explain, which lands hardest on mothers doing most of the caregiving.
- Countries with statutory, non-transferable paternity leave policies (such as the Nordic "daddy quota") demonstrate more balanced post-childbirth career continuity for women.

COMMONLY HEARD LOGIC:
Argument A: The motherhood penalty is a structural workplace failure that treats caregiving as a private liability, penalizes temporal flexibility, and assumes mothers are less committed to corporate advancement.
Argument B: Wage divergence largely reflects rational domestic specialization, where parents voluntarily prioritize childrearing, flexibility, and shorter commutes over grueling hours and rapid corporate promotion.

WHAT REMAINS UNCLEAR:
How much the division of domestic labor is determined by deep-seated cultural expectations versus economic calculations based on which spouse currently earns more.

DISCUSSION QUESTION:
How can modern workplaces and societies reconcile high-intensity career progression with equitable family caregiving responsibilities?`
  },
  {
    code: "D23",
    title: "When Tradition Becomes Control",
    description: "Dress, friendships, marriage, mobility and family expectations can all be described as \"tradition.\" When does preserving a social norm become restricting someone's autonomy?",
    summary: "Drawing the line between heritage people choose and control they don't.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Across traditional communities globally, social customs governing female dress codes, socialization, educational pathways, career pursuits, and matrimonial decisions are frequently justified as preservation of cultural heritage and family honor.

WHAT WE KNOW:
- International human rights covenants, including CEDAW, establish individual autonomy, bodily integrity, freedom of movement, and freedom of expression as universal human rights.
- Traditions do change — economies and schooling reshape customs over generations — but not always in the direction of more freedom.
- Tensions between familial authority and individual autonomy frequently emerge in court systems addressing forced marriages, guardianship laws, and domestic autonomy disputes.

COMMONLY HEARD LOGIC:
Argument A: Cultural traditions and family structures provide essential social cohesion, moral grounding, and mutual protection; framing every communal expectation as "control" imposes an atomized, hyper-individualistic Western worldview.
Argument B: When traditional norms are enforced through emotional coercion, social ostracization, or financial restriction—particularly when applied selectively to women—they cease to be heritage and become systemic suppression of personal liberty.

WHAT REMAINS UNCLEAR:
How multicultural legal systems can effectively protect vulnerable individuals from coercive cultural control while respecting community freedom of belief and lifestyle.

DISCUSSION QUESTION:
Where is the boundary between voluntary participation in cultural heritage and coercive restriction of individual human autonomy?`
  },
  {
    code: "D24",
    title: "Who Decides What's Appropriate for Women?",
    description: "Families, communities, religions and individuals can have very different ideas about how women should dress and behave. Who should ultimately define those boundaries?",
    summary: "Who gets the final say over how women dress - the individual, the family, the community, or the state?",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
From debates over religious headwear bans in European schools to modesty enforcement in the Middle East and dress-code policing in colleges across Asia, female attire and public conduct remain intense political battlegrounds.

WHAT WE KNOW:
- Legal standards on modesty and public decency vary from criminal penalties for non-coverage in theocracies to legislative prohibitions on face-veils in secular republics.
- That policing happens under many different political systems, often informally: dress codes, family pressure, workplace norms.
- Constitutional jurisprudence in democratic nations generally protects personal liberty and bodily autonomy while balancing public order and institutional neutrality.

COMMONLY HEARD LOGIC:
Argument A: An adult individual is the sole legitimate arbiter of her own body, attire, and lifestyle; neither state bureaucrats, religious councils, nor family patriarchs possess moral authority to mandate female decorum.
Argument B: Every community and institution has legitimate standards of modesty, professional decorum, and cultural decorum that maintain social order, moral cohesion, and mutual respect.

WHAT REMAINS UNCLEAR:
How to reconcile cases where an individual voluntarily adopts traditional or religious modesty practices while critics allege the choice is the product of internalized patriarchal coercion.

DISCUSSION QUESTION:
Who gets the final say over how women dress — the individual, the family, the community, or the state?`
  },

  // --- EDUCATION ---
  {
    code: "D25",
    title: "ChatGPT in the Exam Hall",
    description: "AI has changed how students learn, write and solve problems. When students use AI during assessments, how should universities distinguish legitimate assistance from academic misconduct?",
    summary: "Where AI help ends and cheating begins in school.",
    topicSlug: "education",
    openingStatement: `CONTEXT:
The widespread availability of advanced large language models capable of drafting essays, solving mathematics proofs, and generating computer code has forced academic institutions worldwide to overhaul their assessment and integrity policies.

WHAT WE KNOW:
- AI detectors have repeatedly flagged innocent work — non-native English writers get caught most — so schools can't rely on them alone.
- Some universities have gone back to in-person, pen-and-paper, or oral exams.
- Leading educational theorists advocate incorporating AI into curricula, arguing that prompt engineering, critical editing, and AI co-working represent essential professional workplace skills.

COMMONLY HEARD LOGIC:
Argument A: Unrestricted AI use short-circuits the foundational cognitive struggle required to develop critical thinking, argumentative synthesis, and independent writing skills, degrading the integrity of academic degrees.
Argument B: Banning AI is futile and counterproductive; education should focus on training students to use frontier tools ethically, moving assessment away from formulaic essays toward deep critical analysis and verification.

WHAT REMAINS UNCLEAR:
What assessment frameworks can accurately measure a student's genuine comprehension and mastery when AI tools are deeply embedded in standard research workflows.

DISCUSSION QUESTION:
How should academic institutions draw the line between legitimate AI-assisted learning and academic dishonesty in student evaluation?`
  },
  {
    code: "D26",
    title: "Should Kids Be on Social Media?",
    description: "Governments, parents and platforms are increasingly debating restrictions on children's access to social media. Where should responsibility for protecting young users actually sit?",
    summary: "Why keeping kids safe online keeps falling between parents, platforms, and regulators.",
    topicSlug: "education",
    openingStatement: `CONTEXT:
Mounting clinical concerns regarding adolescent mental health, cyberbullying, sleep deprivation, and smartphone addiction have led several national legislatures to consider or enact age-based social media restrictions.

WHAT WE KNOW:
- Australia enacted legislation banning social media access for children under 16, requiring platforms to implement age-assurance technologies.
- Public health advisories, such as the US Surgeon General's Advisory on Social Media and Youth Mental Health, highlight correlational links between heavy social media usage and adolescent depression, particularly among young girls.
- Strict age-verification mandates often require collection of government IDs or biometric facial scans, raising significant data privacy and digital surveillance concerns for all citizens.

COMMONLY HEARD LOGIC:
Argument A: Just as society restricts tobacco, alcohol, and gambling for minors due to underdeveloped impulse control, the state must protect children from hyper-addictive, algorithmically optimized digital environments.
Argument B: Child protection is the primary responsibility of parents, not state censors; government bans undermine digital literacy, isolate vulnerable youth from supportive online communities, and jeopardize adult privacy via mandatory digital ID checks.

WHAT REMAINS UNCLEAR:
Whether algorithmic feed designs or general smartphone screen time is the primary driver of adolescent psychological distress, and whether technical age barriers can be effectively enforced without massive privacy trade-offs.

DISCUSSION QUESTION:
Where does the primary responsibility for safeguarding children from digital harm sit: with platforms, parents, schools, or government regulators?`
  },

  // --- SCIENCE ---
  {
    code: "D27",
    title: "Can We Really Turn Down the Sun?",
    description: "Scientists are researching ways of altering the amount of sunlight reaching Earth to counter warming. Should humanity seriously investigate such technologies despite uncertainty about their consequences?",
    summary: "Should dimming the sun get serious research - and who would govern it?",
    topicSlug: "science",
    openingStatement: `CONTEXT:
As global greenhouse gas emissions continue to drive record temperatures, solar radiation management (SRM)—specifically stratospheric aerosol injection designed to reflect a small fraction of solar energy back into space—has transitioned from science fiction into serious academic and policy research.

WHAT WE KNOW:
- Major scientific bodies, including the US National Academies of Sciences, have recommended cautious research programs to evaluate the feasibility, risks, and atmospheric chemistry of solar geoengineering.
- Volcanic eruptions (such as Mount Pinatubo in 1991) provide empirical evidence that particulate aerosols in the stratosphere reliably reduce global average surface temperatures for 1-2 years.
- Climate modeling indicates that solar geoengineering does not reverse ocean acidification, could alter regional monsoon rainfall patterns unpredictably, and carries the catastrophic risk of "termination shock" if abruptly halted.

COMMONLY HEARD LOGIC:
Argument A: With climate tipping points approaching, humanity must research every potential stabilization tool; having reliable data on SRM is essential insurance against catastrophic warming scenarios.
Argument B: Geoengineering research introduces immense moral hazard, offering fossil fuel emitters an excuse to delay decarbonization while risking irreversible, un-modeled disruptions to global agriculture and weather systems.

WHAT REMAINS UNCLEAR:
What international governance mechanism could possibly command global consensus to authorize, regulate, or halt planetary-scale solar modification.

DISCUSSION QUESTION:
Should the international scientific community actively pursue solar radiation management research, or do the governance and ecological risks outweigh potential cooling benefits?`
  },

  // --- SOCIETY / PHILOSOPHY ---
  {
    code: "D28",
    title: "Why Does Everyone Have a Side?",
    description: "Online discussions increasingly seem to push people toward opposing camps. Has social media made nuanced disagreement harder, or are people simply expressing disagreements that already existed?",
    summary: "Did the internet break nuanced disagreement, or just expose it?",
    topicSlug: "philosophy",
    openingStatement: `CONTEXT:
Whether the topic is a geopolitical crisis, a legal ruling, public health policy, or a celebrity controversy, public discourse quickly fragments into polarized tribal camps where moderate or ambivalent perspectives are pressured to conform.

WHAT WE KNOW:
- People identify strongly with groups, especially when they feel under attack — disagreement starts feeling like disloyalty.
- Feeds reward heat over nuance, so the loudest voices set the tone.
- Surveys in several democracies show partisans distrusting each other more than they used to — though surveys measure what people say, not how they act.

COMMONLY HEARD LOGIC:
Argument A: Social media algorithms intentionally destroy nuance by penalizing intermediate positions, converting complex moral issues into tribal sports matches where engagement is optimized through conflict.
Argument B: People have always held deep ideological fractures; the modern internet hasn't manufactured division, but merely dismantled the artificial editorial consensus previously enforced by centralized legacy media gatekeepers.

WHAT REMAINS UNCLEAR:
How much polarized digital behavior reflects genuine offline civic attitudes versus the vocal incentives of a small, hyper-engaged minority of online users.

DISCUSSION QUESTION:
Has the design of digital public squares made nuanced disagreement impossible, or has it simply revealed latent human tribalism?`
  },
  {
    code: "D29",
    title: "One Story. Millions of Opinions.",
    description: "The same viral event can produce completely different interpretations. Why do people reach radically different conclusions even when they appear to be looking at the same evidence?",
    summary: "Why the same evidence convinces opposite sides they're right.",
    topicSlug: "philosophy",
    openingStatement: `CONTEXT:
When an ambiguous viral video or contentious public incident occurs, opposing online communities examining the exact same unedited footage frequently arrive at diametrically opposed conclusions regarding who was at fault.

WHAT WE KNOW:
- People evaluate new information through what they already believe — psychologists call these patterns motivated reasoning and confirmation bias, but the labels matter less than the habit.
- There is a well-known pattern where both sides read the same neutral report as biased against them.
- Different feeds give people different starting facts, so they often aren't really starting from the same place.

COMMONLY HEARD LOGIC:
Argument A: Disagreement arises because people rarely experience evidence neutrally; subconscious cognitive biases, cultural identities, and ideological loyalty filter how raw sensory data is interpreted.
Argument B: Radical divergences in opinion are manufactured by partisan influencers and algorithmic silos that frame events with selective context, priming viewers before they even watch the footage.

WHAT REMAINS UNCLEAR:
What communication or epistemological frameworks can successfully help opposing groups agree on basic factual baselines before engaging in moral judgment.

DISCUSSION QUESTION:
What causes people looking at the exact same set of facts or video evidence to arrive at fundamentally incompatible conclusions?`
  },
  {
    code: "D30",
    title: "When the Crowd Becomes the Court",
    description: "When public opinion becomes overwhelmingly negative toward someone, should that influence how we evaluate the underlying evidence—or should evidence remain separate from the crowd's judgment?",
    summary: "Whether a crowd's verdict leaves any room for evidence.",
    topicSlug: "philosophy",
    openingStatement: `CONTEXT:
You've seen the pattern: a clip goes viral, the verdict trends within hours, and anyone asking "wait, what actually happened?" gets treated as taking the accused's side.

WHAT WE KNOW:
- Legal systems developed historical safeguards—such as sequestered juries, rules of evidence, cross-examination, and the presumption of innocence—specifically to insulate justice from popular passion.
- Courts built those rules on the assumption that crowds get things wrong: the feed has juries, rules of evidence, and presumption of innocence in no form at all.
- Feeds display counts — likes, shares, views — that make an opinion look more unanimous than it is.

COMMONLY HEARD LOGIC:
Argument A: When millions of independent observers review evidence and reach unanimous moral condemnation, that collective judgment represents democratic moral clarity and common sense that formal institutions often ignore.
Argument B: Popular consensus is not a measure of factual truth; evidence must be analyzed strictly on its empirical merits, independent of how many people believe an allegation or how unpopular the accused person is.

WHAT REMAINS UNCLEAR:
Whether anything can slow a pile-on enough for evidence to catch up — and who would even want to build that brake.

DISCUSSION QUESTION:
If everyone already agrees someone did it, is there any room left to ask whether they did?`
  },

  // --- FEMINISM ---
  {
    code: "D31",
    title: "What Does Feminism Mean Now?",
    description: "Feminism means different things to different people. Has the movement's focus changed as debates around work, relationships, identity, family and online culture have evolved?",
    summary: "A room for asking what feminism is for now, and whose lives the answer actually describes.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
From early suffrage campaigns to modern debates surrounding workplace pay, bodily autonomy, digital culture, and intersectionality, the definition, goals, and internal factions of feminism continue to evolve significantly.

WHAT WE KNOW:
- Feminism has split into traditions people still argue about — equal legal rights, dismantling male-dominated power, economic class, and how race and gender combine. The labels are contested, not settled.
- Public opinion polls show broad global support for core principles of gender equality, even while significant portions of the population decline to self-identify with the word "feminist."
- Contemporary feminist discourse addresses a wide spectrum of issues, ranging from sexual violence and reproductive rights to online harassment, representation, and traditional domestic roles.

COMMONLY HEARD LOGIC:
Argument A: Feminism remains fundamentally about securing equal rights, safety, and dignity for women, continually expanding to dismantle subtle social, cultural, and institutional barriers.
Argument B: Contemporary feminism has fragmented into competing ideological factions that often focus heavily on language, cultural grievance, and identity politics rather than practical, universal legal and economic goals.

WHAT REMAINS UNCLEAR:
What core unifying objectives define mainstream feminist action today across different generations, social classes, and cultural traditions.

DISCUSSION QUESTION:
At this point, what is feminism actually for?`
  },
  {
    code: "D32",
    title: "Is Modern Feminism for Every Woman?",
    description: "Feminist movements often speak about women's shared experiences, but women can face very different realities based on class, caste, religion, occupation and culture. How well does mainstream feminism represent those differences?",
    summary: "Whose lives mainstream feminism describes - and whose it misses.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Critics within and outside feminist scholarship frequently question whether mainstream feminist campaigns represent the urgent daily struggles of working-class, rural, religious, or minority women, or primarily reflect the priorities of educated, urban professionals.

WHAT WE KNOW:
- Intersectional theory, pioneered by legal scholar Kimberlé Crenshaw, demonstrates that women's lived experiences cannot be understood through gender alone, as race, socioeconomic class, religion, and caste profoundly shape vulnerability and opportunity.
- Corporate feminist campaigns (e.g., "lean in," boardroom quotas) often focus on executive advancement, while the majority of working women face low wages, informal labor, and domestic caregiving strain.
- In many societies, large numbers of conservative and religious women actively champion traditional homemaking roles, viewing corporate careerism as incompatible with their personal values.

COMMONLY HEARD LOGIC:
Argument A: Feminism is inherently committed to liberating all women by addressing the intersecting power structures of economic inequality, racial discrimination, and traditional marginalization.
Argument B: Dominant feminist discourse remains dominated by urban, affluent, media-facing elites whose social priorities often alienate women with traditional, religious, or working-class backgrounds.

WHAT REMAINS UNCLEAR:
How broad social movements can authentically represent diverse, often conflicting priorities among women without fracturing into incompatible sub-movements.

DISCUSSION QUESTION:
Whose daily life does mainstream feminism actually speak to — and whose does it miss?`
  },
  {
    code: "D33",
    title: "Who Gets Heard in Feminism?",
    description: "Social media has made feminist activism easier to amplify, but algorithms and online attention can determine whose experiences become visible. Does digital feminism give everyone an equal voice?",
    summary: "Who gets heard when feminism goes through the feed.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Digital platforms have democratized public expression, allowing viral hashtags (#MeToo, #EverydaySexism) to spark international social movements. However, platform economics and algorithmic attention economies govern which voices achieve widespread visibility.

WHAT WE KNOW:
- Feeds reward what provokes and what looks good — quiet organizing rarely goes viral.
- Digital activism has enabled grass-roots organizers without institutional backing to bypass traditional media gatekeepers and expose systemic abuses.
- In practice, well-connected, fluent, already-visible creators get heard most.

COMMONLY HEARD LOGIC:
Argument A: Digital spaces have shattered historical gatekeeping, giving ordinary, marginalized women an unprecedented direct platform to share their experiences and build global solidarity.
Argument B: Online attention dynamics reward performative outrage, aesthetics, and elite influencers, drowning out substantive grass-roots organizing and complex, unglamorous working-class struggles.

WHAT REMAINS UNCLEAR:
Whether online viral awareness translate reliably into durable institutional reforms, legal changes, and offline protections for the most vulnerable women.

DISCUSSION QUESTION:
Does the digital attention economy democratize feminist advocacy, or does it privilege algorithmically palatable voices over systemic grassroots realities?`
  },
  {
    code: "D34",
    title: "Why Are Women Still Judged by Their Looks?",
    description: "Women in public life are frequently judged for aging, weight, clothing and appearance. Why does appearance remain such a powerful measure of how women are evaluated?",
    summary: "Why looks still count so much in judging women.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Female politicians, executives, athletes, and public figures continue to receive extensive media commentary focused on their clothing, makeup, aging, and physique, often overshadowing their professional credentials and policy achievements.

WHAT WE KNOW:
- Women in public life get far more commentary on looks and clothes than men in similar jobs — anyone who follows the news has seen it.
- Good-looking people get treated better at work; the penalty for not matching the ideal falls harder on women.
- The global beauty, cosmetic, and anti-aging industries represent hundreds of billions of dollars in commercial marketing that actively reinforces aesthetic self-monitoring.

COMMONLY HEARD LOGIC:
Argument A: Appearance-based scrutiny is a deeply ingrained patriarchal control mechanism that trivializes female competence, reinforces sexual objectification, and distracts from women's substantive contributions.
Argument B: Visual evaluation is an instinctive human aesthetic impulse amplified by modern visual-first digital media (Instagram, TikTok), affecting both men and women in public entertainment and visual culture.

WHAT REMAINS UNCLEAR:
Why aesthetic expectations for women remain so resilient even in industries where visual presentation is entirely irrelevant to functional performance.

DISCUSSION QUESTION:
Why does physical appearance continue to serve as a disproportionate benchmark for evaluating women in professional and public life?`
  },
  {
    code: "D35",
    title: "Does Feminism Leave Men Behind?",
    description: "As feminism addresses women's inequality, some men argue that their own problems—loneliness, education, family expectations, workplace risks and relationship pressures—receive too little attention. Can feminism address men's problems without losing its focus on women's equality?",
    summary: "Whether equality movements can hold men's struggles too.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
A growing body of demographic and sociological data highlights distinct challenges facing young men—including declining college enrollment, higher rates of suicide, workplace fatalities, social isolation, and changing roles within family structures—sparking debates about gender advocacy priorities.

WHAT WE KNOW:
- In many rich countries, men die by suicide at several times the rate of women and dominate fatal workplace injuries — exact numbers vary by country and year, but the pattern is consistent.
- Progressive feminist theorists argue that the concept of "patriarchy" harms men too by enforcing toxic emotional stoicism, rigid provider expectations, and stigmatizing vulnerability.
- Critics in the men's advocacy space contend that mainstream cultural discourse treats masculinity as inherently problematic and ignores structural disadvantages men face in family courts and education.

COMMONLY HEARD LOGIC:
Argument A: Feminism's ultimate goal is liberation from rigid gender roles for everyone; dismantling patriarchal expectations directly benefits men by validating emotional expression, shared caregiving, and mental healthcare.
Argument B: Feminism is fundamentally a movement for female empowerment; expecting it to solve men's structural issues is unrealistic, and men require dedicated, constructive advocacy that addresses their challenges without hostility.

WHAT REMAINS UNCLEAR:
Whether an integrated gender equality movement can simultaneously address male vulnerabilities and female systemic disadvantages without compromising its core advocacy focus.

DISCUSSION QUESTION:
Can broad gender equality movements effectively address the distinct societal vulnerabilities facing men while sustaining their foundational focus on women's rights?`
  },
  {
    code: "D36",
    title: "When Equality Meets Tradition",
    description: "Women may face expectations around marriage, clothing, family roles, career choices and behaviour in the name of tradition. How should societies navigate the tension between cultural continuity and individual autonomy?",
    summary: "Tradition and autonomy, without caricaturing either side.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
In transitional and pluralistic societies, legal frameworks guaranteeing gender equality frequently collide with longstanding cultural customs, personal family laws, religious inheritance practices, and community expectations.

WHAT WE KNOW:
- Most democratic constitutions promise equality before the law, even where religious or customary family laws still govern marriage and inheritance.
- Rapid change often makes communities cling tighter to tradition — including tradition about women's roles.
- Generational surveys show that young women in developing economies increasingly expect full career autonomy while navigating complex expectations of familial obligation and filial piety.

COMMONLY HEARD LOGIC:
Argument A: Individual human rights and bodily autonomy are non-negotiable; cultural traditions that enforce subordination, limit mobility, or restrict female choice cannot be excused under the guise of cultural preservation.
Argument B: Cultural traditions provide profound communal meaning, social solidarity, and identity; imposing uniform secular individualist models can erode social fabrics and disempower the communities they seek to reform.

WHAT REMAINS UNCLEAR:
How legal and social reformers can encourage equitable evolution within traditional communities without triggering hostile cultural backlash.

DISCUSSION QUESTION:
How should democratic societies balance constitutional guarantees of gender equality with respect for communal traditions and cultural heritage?`
  },
  {
    code: "D37",
    title: "Can the Workplace Really Be Equal?",
    description: "Pay is only one part of workplace equality. Hiring, promotions, caregiving, harassment protections, leadership opportunities and workplace culture can all affect women's careers. Where do the biggest gaps actually remain?",
    summary: "Finding where workplace equality actually stalls.",
    topicSlug: "economics",
    openingStatement: `CONTEXT:
Despite decades of corporate diversity initiatives, equal opportunity legislation, and rising female educational attainment, women remain significantly underrepresented in top corporate executive ranks, boardrooms, and high-capital entrepreneurial ventures.

WHAT WE KNOW:
- The sharpest drop-off seems to happen early — the step from entry-level to first management job, sometimes called the "broken rung" — though exactly where it bites hardest varies by industry.
- Women continue to bear a disproportionate burden of uncompensated domestic labor and eldercare, creating persistent constraints on workplace hours and evening networking.
- Mandatory sexual harassment reporting, pay transparency laws, and parental leave policies have expanded across global corporations, with varying degrees of enforcement and efficacy.

COMMONLY HEARD LOGIC:
Argument A: Workplaces were architected around an outdated single-earner model that privileges uninterrupted linear careers; true equality requires restructuring corporate promotion pipelines, normalizing caregiving flexibility, and eliminating informal old-boys networks.
Argument B: Equal opportunity exists in modern legal frameworks; remaining disparities in senior ranks largely reflect individual trade-offs regarding extreme working hours, competitive risk-taking, and personal lifestyle priorities rather than systemic exclusion.

WHAT REMAINS UNCLEAR:
Which specific workplace policy interventions—such as blind hiring, salary transparency, or mandatory parental leave—most effectively eliminate promotion bottlenecks without creating unintended hiring frictions.

DISCUSSION QUESTION:
Beyond formal equal pay legislation, what structural and cultural barriers in modern work environments present the most persistent obstacles to gender parity?`
  },
  {
    code: "D38",
    title: "Does #MeToo Still Work?",
    description: "Online movements gave many women a way to speak about sexual harassment publicly, but they also raised questions about evidence, due process, anonymity, reputational harm and whose stories receive attention. What has #MeToo changed, and what remains unresolved?",
    summary: "Separating #MeToo's cultural shift from its unfinished institutional business.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
In 2017, a hashtag did what years of HR complaints often hadn't: it got powerful men fired within days. Years later, the firings are history — the question is what systems, if any, replaced the old silence.

WHAT WE KNOW:
- Several jurisdictions passed legislation restricting the use of nondisclosure agreements (NDAs) in sexual harassment settlements and extending statutes of limitations for reporting assault.
- The movement expanded public awareness of workplace harassment, power dynamics, and the psychological costs of reporting misconduct through traditional HR channels.
- Public accusations moved faster than any formal process — which supporters call the point, and critics call the problem: speed with no way to correct a mistake.

COMMONLY HEARD LOGIC:
Argument A: #MeToo broke decades of complicit silence, dismantled impunity for powerful predators, and created overdue accountability where traditional legal and corporate structures failed victims.
Argument B: The reliance on public social media accusation often bypassed basic due process, created an environment of fear and risk-aversion in mentorship, and failed to build durable, fair adjudicative systems for everyday workers.

WHAT REMAINS UNCLEAR:
What a fair process looks like for the next person — one that victims can actually use and the accused can actually trust.

DISCUSSION QUESTION:
#MeToo changed what people felt they could say out loud — but did it change what happens after they say it?`
  },
  {
    code: "D39",
    title: "When Feminism Becomes a Label",
    description: "People increasingly use labels such as feminist, anti-feminist, misogynist and misandrist during online arguments. Do these labels help people understand an argument, or do they shut down discussion before the actual claim is examined?",
    summary: "Noticing when labels stop describing arguments and start replacing them.",
    topicSlug: "culture",
    openingStatement: `CONTEXT:
Somewhere along the way, words like feminist or misogynist stopped being descriptions people unpacked and started being verdicts people handed out — often in the first reply, before any claim was examined.

WHAT WE KNOW:
- Labels stick fast online: once someone is tagged, the tag — not the argument — tends to become the topic.
- Polls in several countries keep finding the same split: most people agree with specific equality policies, while far fewer call themselves feminists. The label and the positions it supposedly names have come apart.

COMMONLY HEARD LOGIC:
Argument A: Labels are essential diagnostic tools that name specific ideologies, power structures, and historical patterns of discrimination; without clear terminology, systemic oppression cannot be effectively identified and contested.
Argument B: Weaponizing labels in conversation shuts down productive dialogue, reduces complex individuals to caricatures, and substitutes ad hominem categorization for genuine intellectual engagement with facts.

WHAT REMAINS UNCLEAR:
How digital discourse can retain conceptual clarity regarding systemic discrimination without devolving into reflexive, polarizing name-calling.

DISCUSSION QUESTION:
What changes when a label meant to describe a pattern starts becoming the main thing people argue about?`
  }
];
