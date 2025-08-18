# AI-Powered Testathon – Bioauthentication Login Automation

**Theme:** Smarter Testing with AI – Bioauthentication Login Automation  
**Dates (Accra time):** Hackathon Opens Aug 18, 2025 • Submission Aug 20, 2025 • Demo/Judging Aug 20, 2025 • Winners Aug 22, 2025

## 🎯 What’s inside
- Minimal **simulated bioauth web app** (Face ID, Fingerprint, Passcode)
- **Mock REST backend** (Express) with success/failure flows, lockout, permission denial, and network interruption
- **Cypress e2e test suite** covering required scenarios
- **Applitools** hooks ready (optional)

## 🧪 Test Scenarios Covered
1. Fallback from bioauthentication to password (passcode)
2. Bioauthentication success and failure
3. Lockout after multiple failed bioauth attempts
4. Permissions denial (OS-level)
5. Network interruption during bioauthentication

## 🚀 Quick start
```bash
# 1) Install deps
npm install

# 2) Start mock app
npm run dev:server  # serves http://localhost:3000

# 3) Run Cypress
npm run test:open   # interactive
# or
npm run test:run    # headless
```

Credentials: `demo@bioauth.test` / `Password123!`

## 👁️ Visual AI (Applitools) – optional
- Set env var `APPLITOOLS_API_KEY`
- Add to tests:
```js
cy.eyesOpen({ appName: 'Bioauth Demo', testName: 'Face ID success' });
// ... your steps
cy.eyesCheckWindow('Dashboard');
cy.eyesClose();
```

## 🤖 AI Integration Ideas
- Use ChatGPT/Gemini to **generate edge-case test data** and add as fixtures.
- Add an **AI lint step** for flaky tests (simple heuristic: long retries, `cy.wait` usage, network stubs).
- Feed Cypress results JSON into a small script to **predict likely flaky specs** over time.

## 📁 Repo Structure
```
mock-server/server.js
public/index.html
public/app.js
cypress.config.js
cypress/e2e/*.cy.js
cypress/support/commands.js
```

## 🏗️ Architecture & Notes
- Frontend → calls `/api/auth/*` endpoints.
- Backend → simulates outcomes + lockout after 3 failures.
- Tests → exercise flows via UI to keep parity with a real app.
- Visual AI → Applitools (optional, but points for AI credit).

## 📝 Submission Tips
- Add a short Loom video walking through: architecture, where AI is used, and demo of tests.
- Include a **coverage matrix** mapping requirements → specs.
- Bonus: integrate GitHub Actions + Cypress Dashboard.
```

# Biometric-Testathon
