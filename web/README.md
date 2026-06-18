# ALATPay Streams — Frontend

Programmable income routing dashboard for Nigerian SMEs. Built with Next.js 14, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, and SWR.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** with custom forest/cream/gold palette
- **shadcn/ui** base components (Button, Dialog, Input)
- **Framer Motion** for page transitions and balance pulse
- **Recharts** for bucket sparklines
- **SWR** for data fetching
- **Inter** (body) + **Space Grotesk** (numbers/headers)

## Run locally

### Prerequisites

- Node.js 20+
- Backend API (optional — mock mode works standalone)

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Environment (optional)

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | *(unset)* | Backend API base URL. When unset or unreachable, the app uses mock data. |
| `NEXT_PUBLIC_MERCHANT_ID` | *(mock id)* | Backend merchant cuid when using live API + SSE |
| `NEXT_PUBLIC_ALATPAY_URL` | `http://localhost:5500` | Mock ALATPay for demo burst (`?demo=1`) |

To connect to the backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> The backend from Prompt 1 runs on port **3000** by default. Set `NEXT_PUBLIC_API_URL` accordingly.

### 3. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the Next.js dev server uses port 3000 by default. If the backend is also on 3000, run the frontend on another port:

```bash
npm run dev -- -p 3001
```

## Live split animation

`SplitFlow` subscribes to `GET /api/merchants/:id/stream` (SSE). When a payment lands, ₦ particles stream along curved Bezier paths into bucket cards.

| Mode | Trigger |
|------|---------|
| Mock | Header "Simulate transaction" → local event |
| Full stack | Mock ALATPay `/demo/burst` → webhook → Redis → SSE |
| Demo control | `/dashboard?demo=1` shows burst button |

**Queue strategy:** animations run **sequentially** with a 500ms gap so each transaction gets its moment during burst.

**Reduced motion:** `prefers-reduced-motion` skips particles; amounts fade directly into buckets.

## Mock mode

When `NEXT_PUBLIC_API_URL` is not set, or the backend is unreachable, the dashboard automatically falls back to mock data:

- Merchant: **Funke Adebayo**
- 5 buckets with realistic balances
- 30 recent transactions

Use **Simulate transaction** in the header to trigger a mock split and see balances update.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Main bucket grid (hero page) |
| `/dashboard/activity` | Transaction history with split breakdowns |
| `/onboarding` | 3-step bucket setup wizard (skeleton) |
| `/offers` | Loan offers placeholder |

## Project structure

```
src/
  app/                  App Router pages
  components/
    BucketCard.tsx      Bucket card with sparkline + pulse
    BucketGrid.tsx      Responsive grid + add bucket modal
    Header.tsx          Sticky header + simulate modal
    onboarding/         Wizard step placeholders
    ui/                 shadcn-style primitives
  lib/
    api.ts              SWR hooks + API fetchers
    mocks.ts            Mock merchant, buckets, transactions
    format.ts           Naira formatting, rule pills
    buckets.ts            Bucket type icons + accent colors
  types/
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| Forest | `#0F3D2E` | Primary text, buttons |
| Cream | `#FAF6F0` | Page background |
| Gold | `#D4A24C` | Accent, CTA |
| Warning | `#B5443A` | Errors, loan bucket |

## Next up

The live-split animation (money flowing across buckets in real time) will be added in a dedicated prompt. The current structure is designed so that animation can plug in cleanly via the simulate flow and SWR revalidation.
