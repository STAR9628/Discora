# 11_SECURITY_AND_ACCESS.md

# Discora - Security & Access Control

Version: 1.0

Status: Draft

Priority: Critical

Related Documents:

* 04_DATABASE_DESIGN.md
* 05_SYSTEM_ARCHITECTURE.md
* 07_API_DESIGN.md
* 10_CODEX_CONTEXT.md

Purpose:

This document defines Discora's security model, access control system, moderation permissions, anonymous participation rules, and platform protection policies.

The objective is to maximize open discussion while protecting users, platform integrity, and legal compliance.

---

# 1. Security Philosophy

Discora exists to encourage:

* Open discussion
* Healthy disagreement
* Critical thinking
* Evidence-based discourse

Discora does not exist to:

* Silence unpopular opinions
* Reward harassment
* Enable abuse
* Encourage manipulation

Security decisions should prioritize:

1. User safety
2. Discussion integrity
3. Freedom of thought
4. Transparency
5. Accountability

---

# 2. Role System

Discora uses four primary roles.

```text
Guest

User

Moderator

Admin
```

---

# 3. Guest Permissions

Guests are read-only users.

Allowed:

✅ Browse discussions

✅ Browse debates

✅ Read claims

✅ Read evidence

✅ Read sources

✅ Read questions

✅ Search public content

---

Not Allowed:

❌ Create content

❌ Vote

❌ Create discussions

❌ Create debates

❌ Participate anonymously

❌ Report content

---

# 4. User Permissions

Registered users.

Allowed:

✅ Create discussions

✅ Create debates

✅ Create claims

✅ Create evidence

✅ Create questions

✅ Vote

✅ Pin content

✅ Report content

✅ Participate anonymously

✅ Upload sources

---

Not Allowed:

❌ Moderate content

❌ View moderation tools

❌ View platform audit logs

---

# 5. Moderator Permissions

Moderators are responsible for content review.

Allowed:

✅ Review reports

✅ Review flagged content

✅ Hide content temporarily

✅ Restore content

✅ Apply warnings

✅ Recommend bans

---

Not Allowed:

❌ Delete content permanently

❌ Access platform configuration

❌ View anonymous user identities

❌ View sensitive account information

---

# 6. Admin Permissions

Administrators manage platform operations.

Allowed:

✅ All moderator actions

✅ Manage moderators

✅ Manage platform settings

✅ Manage rate limits

✅ Manage moderation policies

✅ View audit logs

✅ Review severe abuse cases

✅ Access anonymous account mappings

---

Admins should only access anonymous identity information when necessary for:

* Abuse investigation
* Ban evasion investigation
* Threat investigation
* Legal compliance

---

# 7. Anonymous Participation

Anonymous participation is a core Discora feature.

Users may choose:

```text
Public

Anonymous
```

for each message.

---

Public Display

```text
@username
```

---

Anonymous Display

```text
Anonymous
```

---

Moderator View

```text
Anonymous
```

---

Admin View

Internal identity available.

Used only when necessary.

---

# 8. Anonymous Participation Rules

Anonymous users:

✅ Can vote

✅ Can create claims

✅ Can create evidence

✅ Can participate in debates

✅ Can ask questions

---

Anonymous users remain accountable.

Platform administrators retain the ability to investigate severe abuse.

---

# 9. Private Room Security

Private rooms are invisible.

Users cannot:

* Search them
* Discover them
* View metadata

unless invited.

---

Access Methods

✅ Direct Invitation

✅ Private Invite Link

---

Private rooms do not appear in:

* Search
* Feeds
* Recommendations

---

# 10. Authentication Security

Authentication Provider:

```text
Supabase Auth
```

Supported:

* Email + Password
* Email Verification
* OTP Verification
* Google Sign In

---

Requirements:

* Strong password validation
* Secure session handling
* Email verification
* JWT authentication

---

# 11. Authorization Model

Discora uses:

```text
Role Based Access Control
```

combined with:

```text
Row Level Security
```

via Supabase.

---

Every request must verify:

1. Authentication
2. Authorization
3. Resource ownership

before execution.

---

# 12. Row Level Security Principles

Users may:

* Read public content
* Modify their own content
* Delete their own eligible content

---

Users may not:

* Modify another user's content
* Access private rooms without permission
* Access moderation systems

---

Private room data must remain inaccessible to unauthorized users.

---

# 13. Content Editing Security

Messages:

Editable for:

```text
5 Minutes
```

---

After editing:

* Edited indicator displayed
* Revision history preserved

---

Claims:

All revisions stored.

History visible.

---

Sources:

Cannot be destructively edited after usage.

Only:

* Replace
* Retract

---

# 14. Source Security

Supported:

* URL
* PDF
* Image
* Video Link

---

Source Lifecycle

Upload

↓

2 Minute Grace Period

↓

Locked

↓

Referenced

↓

Retractable Only

---

Referenced sources should never disappear from historical discussions.

---

# 15. Reporting System

Users may report:

* Messages
* Claims
* Evidence
* Sources
* Questions

---

Report Categories

* Spam
* Harassment
* Hate Speech
* Threats
* Misinformation
* Illegal Content
* Other

---

Reports generate moderation review cases.

---

# 16. Report Visibility

Reported content remains visible by default.

Reason:

Prevent abuse of reporting systems.

---

Exception:

High-confidence AI detections.

Examples:

* Severe harassment
* Threats
* Explicit hate speech
* Extreme spam

may be temporarily hidden.

---

# 17. AI Moderation

AI is an assistant.

Not an authority.

---

AI Responsibilities

✅ Detect spam

✅ Detect harassment

✅ Detect threats

✅ Detect abuse

✅ Flag content

---

AI Cannot

❌ Permanently remove content

❌ Ban users

❌ Decide truth

❌ Determine consensus

---

Final moderation decisions remain human.

---

# 18. Room Creator Restrictions

Discussion creators and debate creators are not moderators.

Creators cannot:

❌ Delete messages

❌ Mute users

❌ Remove evidence

❌ Remove claims

❌ Ban users

---

Creators may:

✅ Report content

✅ Suggest pins

✅ Manage room metadata

---

# 19. Blocking System

Blocking is limited.

Discora is a public discourse platform.

Blocking cannot remove users from discussions.

---

Blocked User Effects

✅ No notifications

✅ No mentions

✅ No debate requests

✅ No debate invitations

✅ No future direct messages

---

Blocked Users May Still

✅ Participate in discussions

✅ Participate in debates

✅ Reply publicly

✅ Create claims

✅ Create evidence

---

# 20. Rate Limiting

Initial MVP Limits

Messages

```text
20 per minute
```

---

Claims

```text
10 per hour
```

---

Evidence

```text
20 per hour
```

---

Discussion Creation

```text
10 per day
```

---

Debate Creation

```text
10 per day
```

---

AI Requests

```text
50 per day
```

---

Limits may be adjusted after launch.

---

# 21. Abuse Prevention

Protection Systems

* Rate limiting
* Spam detection
* Duplicate detection
* AI moderation
* Human moderation

---

Suspicious activity should be logged.

Repeated abuse should escalate automatically.

---

# 22. Ban Policy

Moderation Escalation

Warning

↓

Temporary Restriction

↓

Temporary Ban

↓

Permanent Ban

---

Not all violations require escalation.

Severity determines response.

---

# 23. Audit Logging

Administrative actions must be logged.

Examples:

* Content hiding
* Content restoration
* Moderator actions
* Ban actions
* Admin actions

---

Audit logs should be immutable.

---

# 24. Data Protection

Requirements

* HTTPS Everywhere
* Secure Authentication
* Encrypted Password Storage
* Protected Sessions
* Secure File Access

---

Sensitive information should never be exposed through APIs.

---

# 25. Security Monitoring

Monitor:

* Failed logins
* Suspicious uploads
* Excessive reporting
* Spam behavior
* Ban evasion attempts

---

Alerts should be generated for severe incidents.

---

# 26. Security Checklist

Required Before Launch

✅ Authentication Security

✅ Authorization Security

✅ Row Level Security

✅ Input Validation

✅ Rate Limiting

✅ Audit Logging

✅ File Upload Validation

✅ Private Room Protection

✅ Moderation System

✅ AI Moderation Safeguards

---

# Final Security Principle

Discora should maximize freedom of discussion while protecting users, preserving accountability, and maintaining the integrity of structured discourse.

Security should never become censorship, and openness should never become a justification for abuse.
