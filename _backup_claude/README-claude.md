# Givara Ring Studio

A custom engagement-ring configurator for Givara Jewelry. Shoppers choose band style, side
setting, diamond shape and size, crown, metal, karat, ring size and engraving, and see a live
preview and an itemised price in their own currency.

The app is fully self-contained: pricing runs in the browser from Givara's rate card, and 3D
models are loaded from Givara's own asset host. There are no third-party pricing or asset APIs.

## Quick start

```bash
npm ci
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:5173
```

## Configuration

| What                                               | Where                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Metal rate, CAD weights, diamond prices, labour    | [src/config/pricing.ts](src/config/pricing.ts)                                                               |
| Markets: currency, exchange rate, tax, size system | [src/config/markets.ts](src/config/markets.ts)                                                               |
| Ring size conversion (US / UK / EU / India)        | [src/data/ringSizes.ts](src/data/ringSizes.ts)                                                               |
| Option lists and default ring                      | [src/data/ringOptions.ts](src/data/ringOptions.ts), [src/data/diamondOptions.ts](src/data/diamondOptions.ts) |
| 3D model file naming                               | [public/models/README.md](public/models/README.md)                                                           |

> **All prices, exchange rates and tax rates in the config files are demo placeholders.**
> Replace them with Givara's figures before quoting real customers.

### Environment variables

| Variable               | Purpose                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `VITE_WHATSAPP_NUMBER` | Enquiry number, digits only in international format. The WhatsApp button is hidden when empty.                          |
| `VITE_DEFAULT_MARKET`  | First-visit market: `US`, `UK`, `EU`, `AE`, `AU` or `IN`. Defaults to `US`.                                             |
| `VITE_ASSET_BASE_URL`  | Where GLB models are hosted (`/models` or a CDN URL). When empty, a generated ring illustration is shown instead of 3D. |

Set the same variables in Vercel under Project → Settings → Environment Variables.

## How it works

- **Pricing** — [src/pricing/calculatePrice.ts](src/pricing/calculatePrice.ts) is a pure function of
  the configuration and market: metal weight × alloy rate, centre and accent diamonds, labour and
  stone setting, then tax and rounding to the market's price step. The breakup always adds up to
  the displayed total.
- **Markets** — chosen in the header, remembered per browser and shareable with `?market=UK`.
  Prices, tax wording and ring size labels all follow the market.
- **Ring sizes** — stored as US sizes and converted from inner diameter for display.
- **3D preview** — by default the ring is generated in real time with Three.js from the
  configuration ([src/three](src/three)): faceted stones for all nine shapes, prong head, hidden or
  single halo, pavé / prong / channel side stones, all six band styles, metal colour and ring size.
  Drag to rotate; the view buttons move the camera. If `VITE_ASSET_BASE_URL` is set, Givara's own
  GLB models are shown instead. [RingIllustration](src/components/RingIllustration.tsx) is only
  used when the browser has no WebGL.
- **Sharing** — the full configuration is kept in the URL, so "Share" copies a link that reopens
  the exact ring.
- **Bag** — stored in `localStorage`; prices are recalculated for the current market.

## Deploying to Vercel

Import the repository in Vercel. The build (`npm run build`) detects Vercel automatically and
emits `.vercel/output`; [vercel.json](vercel.json) only pins the install command to `npm ci`.

## Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `npm run dev`    | Development server       |
| `npm run build`  | Production build         |
| `npm run lint`   | ESLint + Prettier checks |
| `npm run format` | Format all files         |

The original build brief is kept in [attached_assets/original-build-brief.md](attached_assets/original-build-brief.md).
