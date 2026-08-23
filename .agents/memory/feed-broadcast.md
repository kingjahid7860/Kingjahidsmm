---
name: Live Broadcaster feed
description: Admin-to-user dashboard feed behavior and media handling.
---

Feed deletion controls must remain visible on touch/mobile layouts; hover-only
actions are not usable on phones. External video URLs should be normalized for
common YouTube formats and embedded without an unnecessarily restrictive iframe
sandbox.

**Why:** The admin broadcaster is commonly used from a mobile browser, and
hover states do not exist there. Restrictive sandboxing can also prevent
third-party video players from loading.

**How to apply:** Render deletion as an always-visible action and normalize
provider URLs before selecting the player.