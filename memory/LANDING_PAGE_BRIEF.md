# Praxium Landing Page — Design Brief
*Generated from Filevine teardown + our differentiated positioning.*

## The brief in one line

> Build a landing page that feels as authoritative as Filevine's, more transparent than Filevine's, more inviting than Stripe's, and as keyboard-fast as Linear's — for a law-firm audience that's been burned by enterprise software twice.

## Reference visual benchmarks (in order)

| Element | Steal from |
|---|---|
| Type scale + dramatic hero | **Filevine LOIS page** |
| Tabbed feature explainer | **Vercel.com** / Filevine |
| Pricing transparency | **Linear.app** / Stripe |
| Cinematic whitespace | **Apple product pages** |
| Customer proof bar | Filevine |
| Big stat block | Stripe annual report |
| Final CTA | Filevine "Seize the advantage" |

## Page structure (top → bottom)

1. **Sticky nav** — minimal, premium, includes one bold CTA right-aligned
2. **Hero** — category-claim headline + cinematic subhead + dual CTA + live product mockup or photographic accent
3. **Proof strip** — "Trusted by law firms in [N] states" + state seals OR "Backed by [accelerator]" OR practice-area icons
4. **The truth section** — *what's wrong with Filevine* (transparent comparison) — our killer angle
5. **Three-pillar tabbed feature** — Practice / Communications / Marketplace
6. **Big stat block** — 70% cost cut / 18 days records / 30 seconds setup / 0 consultants
7. **Product showcase** — actual screenshot of the dashboard + ⌘K command palette
8. **CoCounsel AI section** — Glass-Box transparency angle
9. **Praxa section** — the consumer funnel
10. **Testimonial / quote** — placeholder design partner OR transparent "early access" message
11. **Pricing** — all 5 tiers, no hidden math, transparent per-lead pricing
12. **Migration / risk-removal** — "Free migration, 30 days free, 90-day money back"
13. **Final massive CTA** — declarative, confident
14. **Footer** — minimal

## Design tokens (refined from current)

| Token | Current | Refined |
|---|---|---|
| Hero headline | text-7xl | **text-8xl on lg+ (super-display)** |
| Hero line-height | leading-[0.95] | **leading-[0.88]** |
| Letter spacing on headlines | tracking-tight | **tracking-[-0.04em]** |
| Section vertical padding | py-24 | **py-32 on lg+** |
| Hero accent words | text-praxium-accent | Same — keep oxblood-orange |
| Body copy size | text-lg | **text-xl on hero subheads** |
| Border radius | rounded-sm (4px) | **Mix: rounded-sm for cards, rounded-full for CTAs** |
| Section dividers | border-praxium-line | Add subtle gradient lines on hero edges |

## Typography hierarchy

- **H1 hero**: Cabinet Grotesk Black 96-128px, -0.04em tracking, 0.88 line height
- **H2 section**: Cabinet Grotesk Black 56-80px
- **H3 card**: Cabinet Grotesk Bold 24-32px
- **Body large**: IBM Plex Sans 18-20px
- **Body**: IBM Plex Sans 16px
- **Caption / overline**: Geist Mono 10-11px UPPERCASE TRACKED 0.25em

## Visual rules

1. **No emoji on the landing** — keep professional. Use Lucide icons only.
2. **One photographic moment max** — if any. Otherwise pure typography + product UI.
3. **Generous negative space** — sections should feel like spreads in a magazine, not Crowded SaaS landings.
4. **Animations**: subtle (fade-in on scroll, hover lift). Never bouncy.
5. **Numbers are tabular** font-variant-numeric: tabular-nums everywhere.
6. **No purple-violet gradients** (the anti-Stripe rule).
7. **Use the π glyph** as a quiet motif — small, repeated, never loud.

## Copy voice

- Confident, never apologetic
- Plain-spoken, never legalese
- Specific numbers > vague claims
- Calls Filevine out by name (legal — comparison ads are protected speech as long as factually accurate)
- Address the reader directly ("Your firm pays $10k a month")

## Hero copy options (pick one)

### A) Category-claim ⭐ recommended
> **The operating system for the modern law firm.**
> 
> Replace eight tools with one. Save $86,000 a year. Get AI that actually ships your demand letter.

### B) Comparison-direct
> **The law-firm OS Filevine should've built.**
> 
> All-inclusive. AI-native. 70% less. Migration is free.

### C) Outcome-first
> **30 seconds to onboard. $86k saved per year. Zero consultants.**
> 
> Praxium replaces Filevine + RingCentral + DocuSign + 5 more tools with one product.

## Stats to feature (be honest until we have real data)

- **70%** reduction in software stack cost
- **18 days** average medical records collection (vs 60-90 industry)
- **30 seconds** firm onboarding (vs 90 days)
- **$0** implementation cost (vs $25,000+ Filevine)
- **45** modules included (vs sold separately)
- **Claude Sonnet 4.5** AI built in (vs Filevine's 2/5-rated Sidebar AI)

## "The truth section" — our differentiator

Filevine never shows pricing on homepage. We do the opposite — show the math up front. This is the page's killer angle. Layout:

```
┌──────────────────────────────────────────────────┐
│  Your stack today        |  Praxium Suite        │
│  ─────────────────       |  ─────────────        │
│  Filevine + addons  $4.5k|  Pro tier 15×$199     │
│  RingCentral        $1.2k|                       │
│  DocuSign           $0.6k|  ────                 │
│  Mailchimp          $0.3k|                       │
│  ChartSwap          $0.8k|  $2,985/mo            │
│  LeanLaw            $0.5k|                       │
│  Slack/Zoom/Cal     $0.4k|                       │
│  IT consultants     $1.4k|                       │
│  ────────────────────────|                       │
│  $10,150/mo              |  Save $86k/year       │
└──────────────────────────────────────────────────┘
```

This card alone makes the page worth visiting. **Move it ABOVE the feature grid.**

## Final CTA — must be one of these:

- **"Start your 30 days. No card. No consultants."**
- **"See your savings in 60 seconds."**
- **"Migrate from Filevine in 14 days. Free."**

## Things to remove from current landing

- The "your stack today" card should not be cramped into the hero corner — make it ITS OWN section
- The footer can be slimmer
- Reduce the number of feature blocks from 6 to 3 (less is more)
- The pricing cards are good but the layout can be more dramatic (one tier per row OR vertical-card stack on mobile)

## Things to add

- **Customer count / state count** — "Built for U.S. law firms in 50 states"
- **A real product mockup section** — show the dashboard
- **A trust line** at the bottom: "Built by [team]. Backed by [investor or angels if any]. Designed in [city]."

---

This brief becomes the rebuilt Landing.jsx. Reference back here when polishing.
