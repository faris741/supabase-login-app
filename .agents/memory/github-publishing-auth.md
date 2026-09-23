---
name: GitHub publishing authentication
description: Reliable fallback for publishing an exact local commit when workspace Git credentials are rejected.
---

When an existing HTTPS Git remote rejects its credential, a newly attached GitHub connector can publish through the authenticated Git Database REST API without exposing credentials. For an exact commit requirement, recreate the changed blobs and tree from the local commit, create the commit with its original metadata and parent, verify the returned SHA, then update the branch ref only when it still points to that parent.

**Why:** A workspace can report an authorized GitHub connection while the Git credential configured for an existing remote is stale or invalid; committing through the Contents API would produce a different commit SHA.

**How to apply:** Confirm the target branch parent first, preserve the local tree and commit metadata, compare the created tree and commit SHAs, and verify the branch ref and required files after the update. Never print or handle raw credentials.