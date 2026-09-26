# SE4030 – Secure Software Development: Final Assignment Submission

## Project Information
- **Application Name**: BuildMart (Full-Stack E-Commerce & Contractor Marketplace)
- **Course Module**: SE4030 – Secure Software Development
- **Original Repository Reference**: [https://github.com/luqmanbooso/BuildMart](https://github.com/luqmanbooso/BuildMart)
- **Modified Secure Repository**: [https://github.com/SakithLiyanage/BuildMart-Secure](https://github.com/SakithLiyanage/BuildMart-Secure)

---

## Group Members & Contribution Details

| Member Name | Student Email | Individual Focus & Presentation Scope | Primary Demo Vulnerabilities (2 per member) |
|---|---|---|---|
| **Sakith Liyanage** | sakithchanlaka2004@gmail.com | Authentication, Privilege Escalation & Google SSO | **V07** (Mass Assignment Escalation) & **V12** (NoSQL Login Injection) + **Google OAuth 2.0 / OIDC** |
| **Lahiru Jayawardhana** | lahirutharaka02@gmail.com | Broken Access Control & IDOR Defense | **V08** (Order Lookup IDOR) & **V10** (Contractor Profile IDOR) |
| **Luqman Booso** | luqmanbooso@gmail.com | Financial Integrity & Business Logic Security | **V16** (Client Price Tampering) & **V01** (Unauthenticated Admin Salary Routes) |
| **Nilakshi Madubashini** | nilakshimadubashini920@gmail.com | File Upload Stored XSS & HTTP Security Headers | **V14** (SVG Stored XSS via File Upload — extended to qualification document uploads and DOM-based `innerHTML` XSS sinks in invoice printing / avatar fallback) & **V22** (Missing Security Headers / CSP / CORS) |

*(All 4 members demonstrated 2 core vulnerabilities each in the 20-minute video, with 25 total vulnerabilities patched in the repository)*

---

## Presentation & Demonstration Video Link
- **YouTube Video Link**: `https://youtu.be/PLACEHOLDER_VIDEO_LINK` *(Max 20 minutes)*
  - Video Content:
    1. Walkthrough of identified vulnerabilities in the original codebase
    2. Demonstration of attacks / security flaws prior to remediation
    3. Code-level explanation of security patches and defense mechanisms applied
    4. Demonstration of Google OAuth 2.0 / OpenID Connect grant flow
    5. Software engineering best practices and SDLC recommendations

---

## Summary of Vulnerabilities Addressed (25 Distinct Flaws Remediated)

1. **V01 (CWE-306)**: Unauthenticated Admin Salary & Management Routes (`backend/routes/auth.js`)
2. **V02 (CWE-306)**: Unauthenticated Payment Transaction Access & Mutation (`backend/routes/PaymentRoutes.js`)
3. **V03 (CWE-306)**: Missing Auth on Supplier Payment Endpoints (`backend/routes/supplierPaymentRoutes.js`)
4. **V04 (CWE-306)**: Unprotected Job Deletion & Bid Acceptance Routes (`backend/routes/JobRoutes.js`)
5. **V05 (CWE-306)**: Unprotected Bid Submission & Status Operations (`backend/routes/bids.js`)
6. **V06 (CWE-284)**: Missing Tenant Isolation & Auth on Ongoing Projects (`backend/routes/ongoingworks.js`)
7. **V07 (CWE-915)**: Privilege Escalation via Mass Assignment in Signup (`backend/routes/auth.js`)
8. **V08 (CWE-639)**: IDOR in Order Lookup & Status Updates (`backend/routes/orderRoutes.js`, `orderController.js`)
9. **V09 (CWE-639)**: IDOR in Customer Inquiry Deletion & Resolution (`backend/routes/inquiries.js`)
10. **V10 (CWE-639)**: IDOR in Contractor Profile & Metric Manipulation (`backend/routes/contractorprofile.js`)
11. **V11 (CWE-639)**: IDOR in Contractor Bid Mutation (`backend/routes/bids.js`)
12. **V12 (CWE-943)**: NoSQL Injection via Query Selector in Login (`backend/routes/auth.js`)
13. **V13 (CWE-943)**: NoSQL Query Filter Injection in Payment Search (`backend/routes/PaymentRoutes.js`)
14. **V14 (CWE-434/79)**: Insecure File Upload & Stored XSS via SVG (`backend/middleware/profileUpload.js`, `upload.js`, `qualificationUpload.js`; DOM-based `innerHTML` XSS sinks also fixed in `frontend/src/components/Invoice.jsx` and `frontend/src/Pages/ContractorsPage.jsx`)
15. **V15 (CWE-116)**: Insecure Static File Serving Without Security Headers (`backend/server.js`)
16. **V16 (CWE-472)**: Client-Side Price Tampering in Checkout (`backend/routes/PaymentRoutes.js`)
17. **V17 (CWE-290)**: Contractor Identity Spoofing in Bid Creation (`backend/routes/bids.js`)
18. **V18 (CWE-307)**: Missing Rate Limiting on Auth & Bidding APIs (`backend/server.js`, `routes/auth.js`, `routes/bids.js`)
19. **V19 (CWE-798)**: Hardcoded JWT Secret Fallback Key (`backend/middleware/auth.js`, `routes/PaymentRoutes.js`)
20. **V20 (CWE-287)**: Inconsistent User Token Payload Identifier Resolution (`backend/middleware/auth.js`)
21. **V21 (CWE-942)**: Permissive Wildcard Cross-Origin Resource Sharing (`backend/server.js`)
22. **V22 (CWE-693)**: Missing HTTP Security Headers (No Helmet / CSP) (`backend/server.js`)
23. **V23 (CWE-209)**: Verbose Error Responses & Stack Trace Exposure (`backend/routes/reviews.js`, `inquiries.js`, `auth.js`)
24. **V24 (CWE-1104)**: Known High/Critical CVEs in Backend Dependencies (`backend/package.json`)
25. **V25 (CWE-1104)**: Known Vulnerabilities in Frontend Dependencies (`frontend/package.json`)

---

## OAuth 2.0 / OpenID Connect Implementation
- **Provider**: Google Identity Services (OpenID Connect ID Token standard)
- **Grant Type**: Implicit / Authorization Code with OpenID Connect Token verification
- **Backend Endpoint**: `POST /auth/google` (verifies ID token signature with Google OIDC API, creates/links user, issues JWT session)
- **Frontend Integration**: Google Sign-In button on `frontend/src/Pages/Login.jsx` using `@accounts/gsi` client.
