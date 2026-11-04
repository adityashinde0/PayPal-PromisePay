# Security Policy

## Reporting Security Vulnerabilities

The PromisePay team takes the security of our platform and user financial data seriously. If you discover a security vulnerability or suspect an exposure, please report it responsibly.

### Responsible Disclosure Guidelines
- **Do not** disclose vulnerabilities publicly in GitHub issues, pull requests, or discussion boards.
- **Do not** attempt to exploit, tamper with live user data, or disrupt production services.
- Submit reports directly to the maintainers or use GitHub's **Private Vulnerability Reporting** feature in the repository's **Security** tab.

Please include:
1. Detailed description of the vulnerability.
2. Steps to reproduce the issue (proof-of-concept or curl command).
3. The potential impact.

We commit to acknowledging your report within **24 hours** and providing an initial mitigation timeline within **72 hours**.

---

## Core Security Posture

PromisePay implements strict defense-in-depth principles:
- **Zero Cardholder Data (PCI-DSS SAQ-A):** No primary account numbers (PAN), CVVs, or card credentials are processed or stored on PromisePay servers. All payment flows are rendered via PayPal's secure iframes.
- **Decoupled Financial Authority (ADR-001):** The AI engine operates purely as an advisory auditor and **never has the authority or credentials to move money**.
- **Data Loss Prevention (DLP):** Mathematical Luhn algorithm validation automatically redacts payment card sequences and sensitive PII before prompts are forwarded to external LLMs.
- **Cryptographic Dispute Dossiers:** Outcome records and evidence manifests are cryptographically sealed into RFC 6962 SHA-256 Merkle trees via our Rust micro-engine.

For comprehensive architectural threat modeling, SSRF safeguards, and webhook postback verification controls, read the full specification at [**doc/SECURITY.md**](doc/SECURITY.md).
