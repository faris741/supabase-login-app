---
name: GitHub push authentication
description: Workspace-specific behavior when pushing to GitHub through a connected Replit GitHub App.
---

The connected GitHub App can be attached and healthy while the local Git remote still rejects pushes. In that case, use a user-provided GitHub PAT through the secure environment-secret flow; never put the token in chat or source code.

**Why:** The workspace's GitHub connector did not expose a working write credential to either HTTPS Git or the advertised API callback, even after rebinding the connection.

**How to apply:** Keep the app commit local until repository write access is confirmed. If a secure authenticated Git URL is used, remove any runtime query suffix before passing it to Git, and verify the PAT has repository Contents read/write permission.