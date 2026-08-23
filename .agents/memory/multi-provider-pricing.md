---
name: Multi-provider pricing
description: Provider-specific service imports and per-user discount pricing.
---

Imported services retain the provider connection that supplied them, so orders
can be routed to the correct API even when several providers are configured.
Customer discounts are stored per user and applied when services are returned
and again when an order is charged.

**Why:** A single global provider cannot reliably route a catalog assembled
from multiple SMM panels, and displaying a discounted rate without enforcing
the same calculation at checkout would allow inconsistent charges.

**How to apply:** Preserve the provider association during service edits and
syncs; treat the server-side order calculation as the source of truth.