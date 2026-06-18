---
name: Availability & slot scheduling
description: Invariants for booking availability, slots, timezones, and double-booking prevention.
---

Booking availability is **server-authoritative**. The client never computes slot times — it fetches the day's slots and books the exact ISO `datetime` the server returned. The healer dashboard and the client calendar must always agree on which slots are open/booked/closed; deriving times on the client caused drift.

**Invariants to preserve:**
- Zimbabwe is fixed **UTC+2, no DST**. Do not introduce `Intl`/timezone-DB/DST logic — shift a UTC instant by +2h and read the UTC parts.
- Every scheduled booking must land on a **canonical slot boundary**: aligned to `startHour` stepping by `slotMinutes`, inside working hours, on an open weekday, not blocked, not already occupied. Enforce this server-side at booking time — the UI sending clean values is not sufficient (clients can post raw API requests).
- **All non-async formats require a datetime** (video/audio/chat/in_person all show the calendar and require a slot). Only `async` may omit it.
- A slot counts as occupied only by **active** appointments (pending_verification | confirmed | in_progress); cancelled/declined/completed free it.
- Slot-unavailable failures surface as **HTTP 409**; the client clears the chosen slot, returns to the scheduling step, and refetches slots.

**Known gap:** availability mutation routes (set schedule, block/unblock) have no server-side authz — consistent with the rest of the app, whose dashboard auth is client-side only. Revisit if real auth is added.
