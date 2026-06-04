# Discora — Knowledge Graph Evolution

## 1. Current State Knowledge Graph

Currently, Discora models room knowledge as a hierarchical containment tree where claims, evidence, and questions are room-scoped, and claims are optionally mapped as answers to questions.

```mermaid
graph TD
    Room["Room (public.rooms)"]
    Message["Message (public.messages)"]
    Question["Question (public.questions)"]
    Claim["Claim (public.claims)"]
    Evidence["Evidence (public.evidence)"]
    Source["Source (public.sources)"]

    Room -->|contains| Message
    Room -->|contains| Question
    Room -->|contains| Claim
    
    Question -.->|optional answer| Claim
    Claim -->|supported by| Evidence
    Evidence -->|cites reference| Source
```

---

## 2. Search Indexing Integration

To enable search, text search indexing (GIN indexes) will run on the primary entities without modifying the graph relationships.

```mermaid
graph TD
    User["Search Query"]
    SearchFunc["Search Function (security definer)"]
    GinIndex["GIN Index (tsvector)"]
    
    subgraph Database Entities
        Question["Questions Table"]
        Claim["Claims Table"]
        Evidence["Evidence Table"]
    end
    
    User -->|calls query| SearchFunc
    SearchFunc -->|scans matching| GinIndex
    GinIndex -->|resolves records| Question
    GinIndex -->|resolves records| Claim
    GinIndex -->|resolves records| Evidence
```

---

## 3. Moderation Integration

Moderation operates as an overlay layer. The `moderation_flags` table references the entity IDs, filtering them out of client-facing views.

```mermaid
graph TD
    Entity["Base Tables (claims, questions, evidence, messages)"]
    ModFlag["moderation_flags (entity_id, status='resolved_hidden')"]
    View["Redacted Views (discussion_*)"]
    Client["Client App"]

    Entity -->|referenced by| ModFlag
    Entity -->|joined with| View
    ModFlag -->|filters out matching rows| View
    View -->|serves clean content| Client
```

---

## 4. AI Summaries & Synthesis Integration

AI Summaries would read from room questions and high-consensus claims to write summaries back to a dedicated table.

```mermaid
graph LR
    subgraph Discora Knowledge Base
        Q["Questions"]
        C["High-Consensus Claims"]
        E["Evidence"]
    end
    
    AIService["AI Summarization Service"]
    SummaryTable["room_summaries table"]
    Room["Room View"]

    Q & C & E -->|read context| AIService
    AIService -->|generates summary| SummaryTable
    SummaryTable -->|injects summary header| Room
```

---

## 5. Debate Integration

Future debate spaces can wrap room-scoped claims and evidence into pro/con stances, separating participants by team.

```mermaid
graph TD
    Debate["Debate (public.debates)"]
    Stance["Stance (pro / con)"]
    User["Participant Profile"]
    Claim["Claim (public.claims)"]
    
    Debate -->|contains| Stance
    Stance -->|aligns| User
    Stance -->|targets/argues| Claim
```
