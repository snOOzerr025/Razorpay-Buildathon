---
name: design-taste
description: >-
  Use whenever building, redesigning, reviewing, or polishing any frontend UI —
  landing pages, dashboards, apps, forms, components. Covers visual hierarchy,
  color/contrast, typography, layout, motion, and a hard "anti-AI-slop"
  checklist. Triggers on words like design, redesign, polish, audit, critique,
  UI, UX, landing page, dashboard, component, styling.
version: 1.0.0
license: MIT (original synthesis — not a copy of any single source)
---

# Design Taste

Give the agent working design judgment instead of defaulting to the same
handful of "safe" patterns every LLM reaches for. This file is an original
synthesis of ideas independently arrived at by several open-source design
skills — **ui-ux-pro-max**, **Impeccable**, **Taste Skill**, and **SkillX.sh**
— rewritten from scratch as one compact playbook. Credit to those projects
for popularizing this category of skill; none of their text is reproduced
here. If you want their full databases (palettes, font pairings, 20+ command
workflows, browser-based live editing), install them directly alongside this
file — they're complementary, not a replacement.

## 0. Before writing any UI code

1. **Read what's already there.** Look for existing tokens, a theme file,
   or a couple of representative components. If a design system exists,
   extend it — don't invent a parallel one.
2. **If nothing exists, decide on purpose before you decide on style.**
   Write one sentence: who is this for, what are they trying to do, in
   what mood/context? If that sentence doesn't obviously suggest a visual
   direction, it's too vague — sharpen it before touching color or type.
3. **Pick a register.**
   - **Brand mode** (marketing site, landing page, portfolio) — design
     *is* the product; be willing to commit to a strong point of view.
   - **Product mode** (dashboard, app UI, internal tool) — design *serves*
     the product; clarity and speed beat cleverness.
4. **Pick a commitment level for color**, deliberately, not by default:
   restrained (neutrals + one small accent), committed (one saturated
   color owns 30–60% of the surface), full palette (3–4 named roles), or
   drenched (the surface *is* the color). Product UI defaults toward
   restrained; brand work can go further.

## 1. The anti-slop checklist (run this against your own output)

If a stranger could look at the screen and immediately say "an AI made
this," something below has been skipped.

**Color & contrast**
- Body text ≥ 4.5:1 contrast against its background; large/bold text ≥ 3:1.
  The single most common failure is light-gray body copy on a near-white
  background "for elegance" — it just reads as broken.
- Gray text on a colored background looks washed out; darken it toward the
  background's own hue instead of using generic gray.
- Don't reach for warm off-white/cream/sand as a default background just
  because the brief says "warm" or "editorial" — that band has become the
  generic AI default. Carry warmth through accent color, type, and imagery
  instead, or commit to it deliberately as an explicit brand choice.

**Typography**
- Cap body line length at ~65–75 characters.
- Pair fonts on a genuine contrast axis (serif + sans, geometric + humanist)
  — never two similar-but-not-identical sans-serifs.
- Don't let display headings get so large or so tightly tracked that they
  read as shouting rather than designed (rough ceiling: ~6rem display size,
  letter-spacing no tighter than about -0.04em).
- Test heading copy at every breakpoint; overflowing text is a layout bug,
  not a content problem.

**Layout**
- Vary spacing on purpose — uniform gaps everywhere reads as templated.
- Cards are the default lazy answer to "how do I contain this." Use them
  only when they're genuinely the best affordance; never nest a card in a
  card.
- Flexbox for one-dimensional layout, Grid for two-dimensional. Don't
  reach for Grid when `flex-wrap` would do the job.
- Give z-index a real, named scale (dropdown → sticky → modal-backdrop →
  modal → toast → tooltip) instead of arbitrary numbers like 999.

**Motion**
- Motion should be planned as part of the build, not bolted on at the end.
- Ease outward with an exponential-style curve; avoid bounce/elastic easing
  unless the brand genuinely calls for playfulness.
- Every animation needs a `prefers-reduced-motion` fallback (usually an
  instant transition or crossfade) — non-negotiable, not a nice-to-have.
- Content should be visible by default and *enhanced* by a reveal
  animation, never hidden behind a class that only a fired transition
  removes — that pattern ships blank pages to slow connections, headless
  renderers, and reduced-motion users.

**The specific patterns to actively avoid** (not because they're always
wrong, but because they've become the reflexive AI tell):
- Colored `border-left`/`border-right` accent stripes on cards or alerts.
- Gradient text via `background-clip: text` used purely for decoration.
- Glassmorphism used as a default rather than a deliberate, occasional choice.
- The "hero metric" template: big number + small label + gradient accent,
  repeated identically across a page.
- Identical card grids (icon + heading + paragraph, repeated with no
  variation).
- A small all-caps tracked "eyebrow" label above every single section.
- Numbering sections `01 / 02 / 03` when there's no real sequence being
  described — reserve numbers for things that are actually ordered.

Run a two-level gut check on the whole page: (1) could someone guess the
palette and theme just from the product category? (2) if you deliberately
avoided the obvious choice, could they still guess the *replacement* family
(e.g., "fintech that isn't navy-and-gold, so it must be dark terminal
mode")? If either answer is yes, the design hasn't actually differentiated,
it's just picked a different cliché.

## 2. Workflow modes

Treat these as postures the agent can be asked to take, not literal slash
commands (adapt names to whatever your harness supports):

| Mode | What it means |
|---|---|
| **Build** | Design and implement a feature end-to-end, applying sections 0–1 as you go. |
| **Audit** | Technical pass: contrast, accessibility (focus states, ARIA, touch targets ≥44px), responsive breakpoints, performance. Report findings, don't rewrite yet. |
| **Critique** | Judgment pass: visual hierarchy, information architecture, does it match the register (brand vs. product), does it pass the anti-slop checklist. |
| **Polish** | Take the findings from Audit/Critique and actually fix them — the last pass before shipping. |
| **Bolder / Quieter** | Deliberately move the design along the restrained ↔ drenched color axis and the motion axis when the current version reads as too safe or too loud. |
| **Harden** | Add error states, empty states, loading states, i18n-safe copy, and edge cases (long names, zero items, offline). |

Three dials worth naming explicitly when planning any UI work, so the
agent's choices are intentional rather than accidental:
- **Layout variance** — how conventional vs. asymmetric the structure is.
- **Motion intensity** — hover-only vs. scroll-driven/choreographed.
- **Visual density** — spacious vs. information-dense.

Set these on purpose per project instead of drifting to the same default
every time.

## 3. Output discipline

- Ship complete, working code — no `// ... rest of component` placeholders,
  no truncated functions, no "implement this part yourself" comments in
  code meant to run.
- Don't stop at a first draft that compiles; verify it against section 1
  before calling it done.
- When refining existing work, prefer **refinement** (keep behavior, copy,
  and identity; fix what's broken) over silent **redesign** (replacing the
  whole visual language). If a full redesign is genuinely warranted, say so
  explicitly and treat the old version as a reference point, not a
  constraint you're quietly ignoring.
