---
name: Vercel and Origem GLB constraints
description: Deployment and decoder requirements for the external Origem ring models.
---

Origem ring GLBs are served cross-origin and use `EXT_meshopt_compression`; production viewers must allow anonymous CORS and initialize a Meshopt decoder before loading the first model. Some hosted preview sandboxes also have no WebGL context.

**Why:** The asset URLs respond correctly from Origem, but model-viewer otherwise rejects the compressed meshes even when the URL and content type are valid. Initializing model-viewer without WebGL also creates runtime errors instead of a usable fallback.

**How to apply:** Preserve the external asset URL pattern and decoder initialization when changing the ring viewer or model source. Check WebGL support before importing/creating the viewer and keep an immediate static poster fallback.
