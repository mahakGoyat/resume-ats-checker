---
name: Resume analysis privacy
description: Product decision for the Resume ATS Score Checker.
---

Resume parsing and scoring should remain client-side in the browser, with no permanent resume storage.

**Why:** Resume files contain sensitive personal and career information; browser-only analysis makes the privacy promise concrete and avoids unnecessary backend storage.

**How to apply:** Preserve local parsing and OCR when adding checks or result features; raw resume text may stay in browser memory only so the manual editor can work, but never send it to or store it on a server. If a server-side capability is ever proposed, make the privacy tradeoff explicit in the UI first.