# Givara 3D ring models

Set `VITE_ASSET_BASE_URL=/models` to serve models from this folder, or point it at a CDN.

Each ring is built from two GLB files:

```
head/{crownSetting}/{diamondShape}/{carat}ct.glb
shank/{ringStyle}/{sideSetting}.glb
```

Examples:

```
head/hidden-halo/oval/1ct.glb
head/single-halo/round/0.75ct.glb
shank/cathedral-straight/pave.glb
shank/two-row-split/channel.glb
```

| Segment        | Values                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `crownSetting` | `classic`, `hidden-halo`, `single-halo`                                                             |
| `diamondShape` | `round`, `princess`, `oval`, `pear`, `emerald`, `radiant`, `marquise`, `heart`, `elongated-cushion` |
| `carat`        | `0.5`, `0.75`, `1`, `1.5`, `2`, `3`                                                                 |
| `ringStyle`    | `classic-straight`, `cathedral-straight`, `twist`, `split`, `two-row-split`, `pinch`                |
| `sideSetting`  | `plain-gold`, `pave`, `prong`, `channel`                                                            |

That is 162 head files and 24 band files for the full option set.

## Modelling requirements

- **Shared origin and scale.** Head and band must line up when loaded together, with no offsets.
  Use millimetres and model the band at US size 7.
- **Material names.** Any material whose name contains `diamond`, `stone` or `gem` keeps its own
  look. Every other material is treated as metal and recoloured for white, yellow or rose gold,
  so export metal parts once.
- **Size.** Keep each file small (ideally under 1–2 MB). Meshopt compression
  (`EXT_meshopt_compression`, e.g. `gltfpack -cc`) is supported.
- **Hosting on a CDN.** Serve `.glb` as `model/gltf-binary` and allow cross-origin requests
  (`Access-Control-Allow-Origin`).

If a file is missing or fails to load, the builder shows the generated ring illustration instead,
so a partial model set is safe.
