# 04_DATABASE_DESIGN.md

# Discora - Database Design

Version: 1.0

Status: Draft

Related Documents:

* 00_MASTER_CONTEXT.md
* 01_PRD.md
* 02_FEATURE_REGISTRY.md
* 03_USER_FLOWS.md

Purpose:

This document defines the core data architecture of Discora MVP and establishes the foundation for future systems such as Consensus, Open Questions, Knowledge Graphs, and Source Intelligence.

---

# 1. Design Principles

## Structured Knowledge

Important information should not be trapped inside comment chains.

Claims, evidence, sources, questions, and future consensus points must exist as independent entities.

---

## Context First

Claims, evidence, and questions must always belong to a discussion or debate context.

---

## Future Expansion

The database must support future features without requiring major redesigns.

Examples:

* Consensus Engine
* Knowledge Graph
* Argument Maps
* Source Intelligence

---

# 2. Core Entity Overview

```text
User
│
├── Rooms
│
├── Messages
│
├── Claims
│
├── Questions
│
├── Evidence
│
├── Sources
│
├── Pins
│
├── Reports
│
└── Notifications

Room
│
├── Discussion
│
├── Debate
│
└── Private

Room
│
├── Messages
├── Claims
├── Questions
├── Evidence
├── Sources
└── Pins
```

---

# 3. Users Table

## users

```text
id
username
email
password_hash

bio
profile_image

joined_at

is_active
is_banned

created_at
updated_at
```

---

## User Statistics

Generated dynamically.

```text
discussions_created

debates_created

claims_created

evidence_added

most_active_topics

claim_agreement_rate

evidence_agreement_rate
```

These should not determine authority.

They are descriptive metrics only.

---

# 4. Topics Table

## topics

```text
id

name
description

slug

created_by

is_platform_topic

created_at
updated_at
```

---

## Topic Types

### Platform Topic

Examples:

* AI
* Politics
* Education

---

### Personal Topic

User-created interest topics.

Used for:

* Organization
* Discovery
* Personal feeds

---

# 5. Rooms Table

## rooms

```text
id

title
description

room_type

created_by

topic_id

visibility

created_at
updated_at
```

---

## room_type

```text
discussion
debate
private
```

---

## visibility

```text
public
private
```

---

# 6. Discussions Table

## discussions

```text
id

room_id

opening_statement

created_at
updated_at
```

---

# 7. Debates Table

## debates

```text
id

room_id

motion

creator_position

created_at
updated_at
```

---

## creator_position

```text
pro
con
neutral
```

---

# 8. Messages Table

## messages

```text
id

room_id

user_id

parent_message_id

content

identity_mode

agree_count
disagree_count

created_at
updated_at
```

---

## identity_mode

```text
public
anonymous
```

---

## Notes

Supports:

* Main feed
* Replies
* Nested threads

---

# 9. Claims Table

## claims

```text
id

room_id

message_id

created_by

claim_text

claim_type

agree_count
disagree_count

created_at
updated_at
```

---

## claim_type

```text
fact
opinion
prediction
proposal
observation
```

---

## Rules

Claims must belong to a room.

Claims may originate from:

* New claim creation
* Existing message conversion

Claims cannot exist independently.

---

# 10. Questions Table

## questions

```text
id

room_id

created_by

question_text

question_type

agree_count
disagree_count

created_at
updated_at
```

---

## question_type

```text
information
clarification
perspective
evidence
directional
reflective
```

---

# 11. Evidence Table

## evidence

```text
id

room_id

claim_id

created_by

evidence_type

evidence_category

content

agree_count
disagree_count

needs_verification_count

created_at
updated_at
```

---

## evidence_type

```text
supporting
contradicting
contextual
```

---

## evidence_category

```text
scientific
statistical
documentary
visual
experiential
expert
historical
logical
ethical
cultural
```

---

# 12. Sources Table

## sources

```text
id

room_id

uploaded_by

source_type

title

description

url

file_path

created_at
updated_at
```

---

## source_type

```text
url
pdf
image
video
```

---

## Future Fields

Reserved for:

```text
summary

publisher

author

publication_date

limitations
```

---

# 13. Pins Table

## pins

```text
id

room_id

created_by

target_type

target_id

pin_type

status

created_at
updated_at
```

---

## pin_type

```text
personal
public
```

---

## status

```text
active
pending_vote
rejected
```

---

# 14. Pin Votes Table

## pin_votes

```text
id

pin_id

user_id

vote

created_at
```

---

## vote

```text
support
reject
```

---

# 15. Debate Requests Table

## debate_requests

```text
id

room_id

requested_by

motion

support_count

status

created_at
```

---

## status

```text
pending
accepted
converted
closed
```

---

# 16. User Debate Invitations

## debate_invitations

```text
id

sender_id

receiver_id

motion

room_id

status

created_at
```

---

## status

```text
pending
accepted
declined
expired
```

---

# 17. Votes Table

Centralized voting system.

## votes

```text
id

user_id

target_type

target_id

vote_type

created_at
```

---

## target_type

```text
message
claim
question
evidence
```

---

## vote_type

```text
agree
disagree
```

---

# 18. Notifications Table

## notifications

```text
id

user_id

type

title

message

reference_type

reference_id

is_read

created_at
```

---

## Notification Examples

```text
reply_received

debate_invitation

debate_request

pin_suggestion

mention

report_update
```

---

# 19. Reports Table

## reports

```text
id

reported_by

target_type

target_id

reason

status

created_at
updated_at
```

---

## status

```text
pending
ai_review
human_review
resolved
dismissed
```

---

# 20. Search Index

Searchable Entities

* Users
* Topics
* Rooms
* Discussions
* Debates
* Claims
* Questions
* Sources

Future:

* Consensus
* Open Questions

---

# 21. Future Expansion Tables

Reserved Systems

Not MVP.

Future tables:

```text
consensus

open_questions

argument_maps

knowledge_graph

source_analysis

consensus_history

position_changes

reflection_logs
```

---

# 22. Relationship Summary

```text
User
│
├── Rooms
├── Messages
├── Claims
├── Questions
├── Evidence
├── Sources
├── Reports
└── Notifications

Room
│
├── Messages
├── Claims
├── Questions
├── Evidence
├── Sources
├── Pins
└── Debate Requests

Claim
│
├── Evidence
├── Sources
├── Votes
└── Future Consensus

Evidence
│
├── Votes
└── Sources
```

---

# MVP Database Scope

Included:

* Users
* Topics
* Rooms
* Discussions
* Debates
* Messages
* Claims
* Questions
* Evidence
* Sources
* Pins
* Votes
* Reports
* Notifications

Excluded:

* Consensus
* Open Questions Engine
* Knowledge Graph
* Argument Maps
* Source Intelligence

These will be introduced in future versions.
