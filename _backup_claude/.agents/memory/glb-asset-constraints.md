---
name: Givara GLB asset constraints
description: Requirements for loading Givara's own ring models in the viewer.
---

Ring models are Givara's own GLBs, resolved from `VITE_ASSET_BASE_URL` (see `public/models/README.md`). Cross-origin hosts must send CORS headers, and meshopt-compressed files need the decoder configured before the first `<model-viewer>` loads. Some preview sandboxes have no WebGL context.

**Why:** model-viewer rejects compressed meshes without the decoder, and creating the viewer without WebGL throws instead of falling back.

**How to apply:** Keep the decoder setup and WebGL check in `GlbRingViewer`, and keep `RingIllustration` as the fallback whenever assets are unset or fail. Do not point the builder at third-party pricing APIs or asset hosts.
