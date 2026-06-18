---
name: Healer dashboard auth boundary
description: What's public vs healer-only, and how the session auth is wired.
---

The healer dashboard is protected by **session-based auth** (express-session + memorystore). Login validates against the seeded healer user; the client gates the dashboard on a `/api/auth/me` check.

**Access boundary (keep this split when adding routes):**
- **Public** (clients need these): readings/products/reviews, `GET /api/availability`, `GET /api/availability/slots`, and `POST /api/appointments` (the booking submit). Nothing else returning client PII should be public.
- **Healer-only** (`requireHealer`, session role === "healer"): the appointment list, any single-appointment read (it exposes name/WhatsApp/payment — numeric IDs make it an IDOR risk if public), all appointment state changes, and all schedule mutations (set hours, block/unblock slots).

**Why:** an earlier pass left schedule mutation and appointment reads open; anyone could rewrite Ellie's availability or enumerate bookings.

**Prod hardening already in place:** cookie `secure` is on only in production, and startup throws if `SESSION_SECRET` is missing in production (dev has a fallback). MemStorage wipes on restart, so sessions and bookings reset on each deploy — acceptable for this demo, revisit if a real DB is added.
