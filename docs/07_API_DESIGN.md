# 07_API_DESIGN.md

# Discora - API Design

Version: 1.0

Status: Draft

Related Documents:

* 01_PRD.md
* 03_USER_FLOWS.md
* 04_DATABASE_DESIGN.md
* 05_SYSTEM_ARCHITECTURE.md

Purpose:

This document defines Discora's REST API structure, endpoint conventions, request patterns, response patterns, authentication requirements, and future API expansion strategy.

---

# 1. API Philosophy

Discora uses:

```text
REST API Architecture
```

Goals:

* Simplicity
* Predictability
* Scalability
* AI Coding Agent Compatibility

---

# 2. Base URL

Development:

```text
/api/v1
```

Production:

```text
https://api.discora.com/v1
```

---

# 3. Authentication

Authentication handled through:

```text
Supabase Auth
```

Supported:

* Email + Password
* Email Verification
* OTP Verification
* Google Sign In

---

Protected endpoints require:

```http
Authorization: Bearer <token>
```

---

# 4. Standard Response Format

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

---

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

---

# 5. User APIs

## Get Current User

```http
GET /users/me
```

---

## Update Profile

```http
PATCH /users/me
```

Fields:

```json
{
  "bio": "",
  "profileImage": ""
}
```

---

## Change Username

```http
POST /users/change-username
```

Restrictions:

* Once every 30 days

---

## Get User Profile

```http
GET /users/@{username}
```

Returns:

* Profile
* Statistics
* Activity Summary

---

# 6. Topic APIs

## List Topics

```http
GET /topics
```

---

## Create Personal Topic

```http
POST /topics
```

---

## Get Topic

```http
GET /topics/{slug}
```

---

# 7. Discussion APIs

## Create Discussion

```http
POST /discussions
```

Request:

```json
{
  "title": "",
  "description": "",
  "openingStatement": "",
  "topicId": ""
}
```

---

## Get Discussion

```http
GET /discussions/{slug}
```

---

## List Discussions

```http
GET /discussions
```

Filters:

```text
topic
trending
recent
```

---

## Update Discussion

```http
PATCH /discussions/{id}
```

---

# 8. Debate APIs

## Create Debate

```http
POST /debates
```

Request:

```json
{
  "motion": "",
  "position": "pro"
}
```

---

## Get Debate

```http
GET /debates/{slug}
```

---

## Join Debate

```http
POST /debates/{id}/join
```

Request:

```json
{
  "position": "neutral"
}
```

---

## Change Debate Position

```http
PATCH /debates/{id}/position
```

Position History stored.

---

# 9. Message APIs

## Create Message

```http
POST /rooms/{roomId}/messages
```

Request:

```json
{
  "content": "",
  "identityMode": "public"
}
```

---

## Reply To Message

```http
POST /messages/{messageId}/reply
```

---

## Edit Message

```http
PATCH /messages/{messageId}
```

Rules:

* 5 minute edit window
* Revision history retained

---

## Get Thread

```http
GET /messages/{messageId}/thread
```

---

# 10. Claim APIs

## Create Claim

```http
POST /rooms/{roomId}/claims
```

Request:

```json
{
  "text": "",
  "type": "fact"
}
```

---

## Convert Message To Claim

```http
POST /messages/{messageId}/claim
```

---

## Get Claim

```http
GET /claims/{claimId}
```

---

## Update Claim

```http
PATCH /claims/{claimId}
```

Revision history required.

---

# 11. Question APIs

## Create Question

```http
POST /rooms/{roomId}/questions
```

---

## Get Question

```http
GET /questions/{id}
```

---

## Update Question

```http
PATCH /questions/{id}
```

---

# 12. Evidence APIs

## Create Evidence

```http
POST /rooms/{roomId}/evidence
```

Request:

```json
{
  "content": "",
  "type": "supporting",
  "category": "scientific"
}
```

---

## Attach Evidence To Claim

```http
POST /claims/{claimId}/evidence
```

Request:

```json
{
  "evidenceId": "",
  "relationship": "supporting"
}
```

---

## Get Evidence

```http
GET /evidence/{id}
```

---

## Update Evidence

```http
PATCH /evidence/{id}
```

---

# 13. Source APIs

## Create Source

```http
POST /sources
```

Supports:

* URL
* PDF
* Image
* Video Link

---

## Get Source

```http
GET /sources/{id}
```

---

## Attach Source

```http
POST /sources/{id}/attach
```

Can attach to:

* Discussion
* Debate
* Claim
* Evidence
* Question

---

## Retract Source

```http
POST /sources/{id}/retract
```

Source remains visible.

Marked as retracted.

---

# 14. Voting APIs

## Agree

```http
POST /votes
```

Request:

```json
{
  "targetType": "claim",
  "targetId": "",
  "vote": "agree"
}
```

---

## Disagree

```http
POST /votes
```

Request:

```json
{
  "targetType": "claim",
  "targetId": "",
  "vote": "disagree"
}
```

---

## Remove Vote

```http
DELETE /votes/{voteId}
```

---

# 15. Pin APIs

## Personal Pin

```http
POST /pins/personal
```

---

## Suggest Public Pin

```http
POST /pins/suggest
```

---

## Vote On Pin

```http
POST /pins/{pinId}/vote
```

---

## List Pins

```http
GET /rooms/{roomId}/pins
```

Returns:

* Public Pins
* Pin Suggestions
* Personal Pins

---

# 16. Debate Request APIs

## Create Debate Request

```http
POST /rooms/{roomId}/debate-request
```

---

## Support Debate Request

```http
POST /debate-requests/{id}/support
```

---

## Convert To Debate

```http
POST /debate-requests/{id}/convert
```

---

# 17. Debate Invitation APIs

## Send Invitation

```http
POST /debate-invitations
```

---

## Accept Invitation

```http
POST /debate-invitations/{id}/accept
```

---

## Decline Invitation

```http
POST /debate-invitations/{id}/decline
```

---

# 18. Notification APIs

## Get Notifications

```http
GET /notifications
```

---

## Mark Read

```http
PATCH /notifications/{id}/read
```

---

## Mark All Read

```http
PATCH /notifications/read-all
```

---

# 19. Report APIs

## Create Report

```http
POST /reports
```

Request:

```json
{
  "targetType": "message",
  "targetId": "",
  "reason": ""
}
```

---

## Get Report Status

```http
GET /reports/{id}
```

---

# 20. Search APIs

## Global Search

```http
GET /search
```

Query:

```text
?q=ai
```

Returns:

* Discussions
* Debates
* Claims
* Questions
* Sources
* Users

---

# 21. AI APIs

## Generate Source Summary

```http
POST /ai/source-summary
```

Request:

```json
{
  "sourceId": ""
}
```

Stored after generation.

---

## Similar Discussion Detection

```http
POST /ai/similar-discussions
```

Request:

```json
{
  "title": "",
  "description": ""
}
```

---

## Moderation Review

Internal API

```http
POST /ai/moderation
```

---

# 22. Realtime Events

Published Events:

```text
message.created

message.updated

claim.created

claim.updated

question.created

evidence.created

source.created

notification.created

debate.requested
```

---

# 23. Rate Limiting

Apply limits to:

* Message Creation
* Claim Creation
* Evidence Creation
* Source Uploads
* Debate Requests
* AI Endpoints

Purpose:

* Prevent spam
* Protect free-tier resources

---

# 24. API Security

Requirements:

* JWT Authentication
* Input Validation
* Row Level Security
* Request Rate Limiting
* Audit Logging

---

# 25. Future APIs

Reserved:

```text
/consensus

/open-questions

/knowledge

/argument-maps

/source-intelligence

/topic-hubs

/knowledge-evolution
```

Not included in MVP.

---

# Final API Goal

The API should expose Discora's structured discourse model in a predictable and scalable way while supporting future evolution into a knowledge-building platform.

All major entities (Claims, Evidence, Sources, Questions, Discussions, Debates) should remain independent, composable, and reusable throughout the platform.
