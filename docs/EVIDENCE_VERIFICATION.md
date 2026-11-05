# Evidence verification

## Evidence is support, not a guarantee

PromisePay assesses whether supplied evidence supports defined requirements. It does not certify the quality, legality, ownership, security, or physical condition of a product/service. Evidence is never proof merely because a seller uploaded it.

## Evidence model

Each item records:

- `evidenceId`, promise ID, version, submitter and role;
- type (`live_url`, `repository`, `screenshot`, `document`, `tracking_reference`, `delivery_confirmation`, `metadata`);
- original source/reference and a canonicalized safe form;
- received time, optional claimed occurrence time, SHA-256 (files), content/extraction version;
- declared related requirements, provenance completeness, scanner/extraction status, and immutable storage key.

## Category plans

| Category | Requirement | Evidence that can support it | Cannot establish |
| --- | --- | --- | --- |
| Digital project | deployed responsive website | reachable live URL, multi-viewport screenshots, repository | production resilience, accessibility conformance, security, ownership |
| Digital project | authentication/cart | recorded functional path, live URL, repository code | real-user reliability or payment capability |
| Document | named/required sections | uploaded document and extracted headings/text | legal/factual/professional adequacy |
| Delivery | dispatch/delivery status | tracking reference/status, carrier/merchant confirmation | item condition, correct contents, recipient identity beyond submitted data |

## Verification statuses

- `VERIFIED`: cited evidence sufficiently supports the specific requirement within stated limits.
- `PARTIALLY_VERIFIED`: meaningful but incomplete support; UI identifies the gap.
- `NOT_VERIFIED`: submitted evidence does not support the requirement.
- `HUMAN_REVIEW_REQUIRED`: ambiguity, conflict, safety boundary, parsing failure, or a claim requiring judgment.

The overall mapping is deterministic:

- `COMPLETE` only if all mandatory requirements are `VERIFIED` or policy-approved partial results and no safety exception exists.
- `REVIEW_REQUIRED` for conflict, missing mandatory evidence, partial/high-risk findings, low confidence, or run failure.
- `OUTCOME_NOT_VERIFIED` only where policy allows a clear evidence deficiency; it remains a recommendation, not a finding of fault.

## Provenance checks

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003087', 'primaryTextColor': '#FFFFFF', 'primaryBorderColor': '#001C48', 'lineColor': '#0079C1', 'secondaryColor': '#0079C1', 'tertiaryColor': '#F5F7FA', 'noteBkgColor': '#FFC439', 'noteTextColor': '#2C2E2F', 'actorBkg': '#003087', 'actorTextColor': '#FFFFFF', 'actorBorder': '#001C48'}}}%%
flowchart TB
    subgraph EvidenceItems["1. Submitted Deliverables & Evidence Items"]
        E1["E1: Deployed URL Crawl<br/>(DOM Snapshot + Viewport PNG)"]
        E2["E2: Git Commit Reference<br/>(Repo Tree + Commit Hash)"]
        E3["E3: Specification Document<br/>(PDF Text + OCR Hash)"]
        E4["E4: Carrier Tracking Data<br/>(Status Digest + Waybill)"]
    end

    subgraph LeafHashes["2. RFC 6962 Leaf Hashing (Domain Byte 0x00)"]
        L1["L1 = SHA-256(0x00 || E1)"]
        L2["L2 = SHA-256(0x00 || E2)"]
        L3["L3 = SHA-256(0x00 || E3)"]
        L4["L4 = SHA-256(0x00 || E4)"]
    end

    subgraph LexSort["3. Deterministic Lexicographical Sorting"]
        Sort["Sort leaves: L1 < L2 < L3 < L4<br/>(Guarantees Canonical Ordering)"]
    end

    subgraph IntermediateNodes["4. Pairwise Interior Hashing (Domain Byte 0x01)"]
        N12["N12 = SHA-256(0x01 || L1 || L2)"]
        N34["N34 = SHA-256(0x01 || L3 || L4)"]
    end

    subgraph MerkleRoot["5. Cryptographic Merkle Root"]
        Root["Merkle Root = SHA-256(0x01 || N12 || N34)<br/>(256-Bit Immutable Anchor)"]
    end

    subgraph SealingAndTransparency["6. Transparency Log Sealing & Dossier Submission"]
        Proof["generate_transparency_log_proof()<br/>• Operator HMAC-SHA256 Signature<br/>• Sequence Counter & Epoch Timestamp"]
        Dossier["PayPal Dispute Defense Dossier<br/>• RFC 6962 Inclusion Proof<br/>• Verified by Native Rust Crate<br/>• Direct POST to /v1/customer/disputes"]
    end

    E1 --> L1
    E2 --> L2
    E3 --> L3
    E4 --> L4

    L1 --> Sort
    L2 --> Sort
    L3 --> Sort
    L4 --> Sort

    Sort --> N12
    Sort --> N34

    N12 --> Root
    N34 --> Root

    Root --> Proof
    Proof --> Dossier
```

1. Authenticate and authorize submitter.
2. Validate MIME type, byte size, URL scheme/hostname policy, and tracking format.
3. Scan file and compute checksum before extraction.
4. Canonicalize URLs, prevent SSRF/private-network fetches, and retain redirect chain metadata.
5. Timestamp receipt; distinguish system-derived metadata from seller claims.
6. Link source to requirements without implying verification.
7. Freeze evidence manifest for a verification run so later uploads cannot revise its result.

## Human review triggers

- Evidence claims physical condition or delivery that is not independently demonstrable.
- Requirement is legal, medical, financial, safety-critical, subjective, or unusually consequential.
- Sources conflict, are inaccessible, are forged/suspicious, or contain prompt-injection content.
- Evidence extraction fails, provenance is incomplete, or model citations are invalid.
- A user disputes a result or a payment action might follow.

## Explainability record

An explanation includes requirement text/version, evidence IDs and permitted links, machine and deterministic checks, model/prompt/extractor versions, confidence band, limitations, missing inputs, reviewer decision, and timestamps. Evidence previews should show redaction state and access restrictions.
