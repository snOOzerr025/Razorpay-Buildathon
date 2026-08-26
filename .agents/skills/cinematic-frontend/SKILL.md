---
name: cinematic-frontend
description: >-
  Cinematic art direction and scene-based animation framework for website
  frontends. Activate this skill whenever building or redesigning a website's
  frontend to apply cohesive visual storytelling — scene transitions, camera
  metaphors, scroll-driven cinematics, and a shared art-direction style preamble
  across every section. Trigger on: 'build a website', 'frontend', 'landing
  page', 'redesign', 'UI overhaul', or any request to create/modify a
  multi-section web page.
---

# Cinematic Frontend — Art Direction & Scene Framework

This skill turns every multi-section website into a cohesive **visual film**.
It defines a shared art-direction style, a camera movement metaphor, and 5-6
scroll-driven "scenes" that the user navigates through cinematically.

> **Non-negotiable**: Every website built with this skill must feel like a
> directed short film, not a stack of disconnected sections.

---

## Step 0 — Read the References

Before proceeding, read:
- [Art Direction Options](./references/art_directions.md) — visual style presets
- [Camera Styles](./references/camera_styles.md) — movement architectures
- [Scene Blueprint](./references/scene_blueprint.md) — the 5-6 scene structure
- [Prompts & Tokens](./references/prompts.md) — reusable CSS/animation tokens

---

## Step 1 — Choose Art Direction

**Ask the user** which art direction to apply. Present the options from
[art_directions.md](./references/art_directions.md). If the user skips or says
"default", use:

> **Default**: `soft matte low-poly clay diorama, isometric, tilt-shift
> miniature, warm light`

Record the choice as `ART_DIRECTION`. This string becomes the **shared style
preamble** — it must appear verbatim in every scene's design tokens (colors,
shadows, border-radius, textures, typography mood).

### How ART_DIRECTION maps to CSS

| Art Direction       | Border Radius | Shadows                       | Palette Mood        | Texture Hint                  |
|:--------------------|:--------------|:------------------------------|:--------------------|:------------------------------|
| Clay Diorama        | 16-24px       | Soft, warm, layered           | Earthy warm pastels | Subtle grain overlay          |
| Flat Papercraft     | 0-4px         | Hard-edge drop shadows        | Bold flat primaries | Paper texture background      |
| Glossy Toy          | 50% (pill)    | Specular highlights           | Candy brights       | Glossy gradient overlays      |
| Claymation          | 20-32px       | Soft diffuse, no hard edges   | Muted warm          | Bumpy/organic noise           |
| Neon Night          | 8-12px        | Neon glow (`box-shadow` glow) | Dark + neon accents | Scanline/grid subtle overlay  |

---

## Step 2 — Choose Camera Style

**ALWAYS ask the user.** This is the film's personality, not a technical
detail. Present by *feel*, not by architecture name. See
[camera_styles.md](./references/camera_styles.md) for full descriptions.

Present these options:

1. **(Recommended for diorama/miniature)** "Fly through the world" — the camera
   dives into each scene, pulls up and out, and hops across the miniature world
   to the next. Angles change constantly, big expressive aerial moves.
2. **(Recommended for grounded/photoreal)** "One continuous walkthrough" — a
   single forward flight that glides through each scene straight into the next,
   never pulling back. Expressive but always-forward.
3. "Locked isometric glide" — the camera keeps one fixed angle for the whole
   film. The world slides past/toward it, no rotation, no reveals.

**State the trade-off in one line each:**
- **Fly-through** reverses direction at seams — charming in miniature, jarring
  in realism.
- **Locked-iso** is the calmest and cheapest to re-roll.
- **Walkthrough** sits between the two.

Record the choice as `CAMERA`.

---

## Step 3 — Design 5-6 Scenes

Every website is decomposed into **5-6 cinematic scenes** that the user scrolls
through. Each scene is a self-contained "shot" with its own:

- **Entrance animation** (how the scene appears)
- **Internal motion** (parallax, floating elements, micro-animations)
- **Exit transition** (how it hands off to the next scene)

Use the [Scene Blueprint](./references/scene_blueprint.md) as the template.
Adapt scene content to the actual website's purpose, but keep the 5-6 scene
structure.

---

## Step 4 — Implement Camera Architecture

Based on `CAMERA`, implement the scroll-driven animation system:

### Architecture A — Forward Glide (Walkthrough / Locked-Iso)

```
Section 1 → translateZ scroll → Section 2 → translateZ scroll → ...
```

- Use `scroll-timeline` or IntersectionObserver-driven transforms.
- Each section occupies 100vh minimum.
- Transitions: `opacity` + `transform: translateY / translateZ` between scenes.
- For **locked-iso**: add `perspective: none` or a fixed `rotateX(30deg)
  rotateZ(45deg)` on the world container; all motion is translation only.

### Architecture B — Fly-Through (Dive & Hop)

```
Zoom-in → Scene plays → Zoom-out → Pan/hop → Zoom-in → next scene ...
```

- Wrap all scenes in a `transform-style: preserve-3d` container.
- Use keyframed `translateZ` + `rotateX/Y` on scroll progress.
- Each scene transition includes a "pull-back" (scale down + rotate) then a
  "dive-in" (scale up + rotate to new angle).
- Use `scroll-snap-type: y mandatory` for scene boundaries.

---

## Step 5 — Apply the Style Preamble

The `ART_DIRECTION` preamble must produce a **cohesive visual world**. Apply it
to:

1. **CSS Custom Properties** — define a `:root` block with all design tokens
   derived from the art direction.
2. **Every component** — cards, buttons, headings, illustrations all share the
   same border-radius, shadow style, palette, and texture.
3. **Background treatment** — a shared texture overlay or gradient that unifies
   all scenes.
4. **Typography** — mood-matched Google Font pairing (e.g., Clay Diorama →
   rounded sans like Nunito + Quicksand; Neon Night → monospace accent like
   JetBrains Mono + geometric sans like Outfit).

---

## Step 6 — Polish & Verify

- [ ] All 5-6 scenes have entrance, internal, and exit animations
- [ ] Camera style is consistent across all transitions
- [ ] Art direction tokens are used everywhere — no default browser styles leak
- [ ] Scroll performance: use `will-change`, `transform`/`opacity` only,
      avoid layout-triggering properties in animations
- [ ] Responsive: scenes adapt to mobile (simplify 3D transforms to 2D fades)
- [ ] Accessibility: `prefers-reduced-motion` disables parallax/3D, keeps
      simple fade transitions
- [ ] Each scene has a unique `id` for deep-linking

---

## Quick Reference: File Structure

When implementing, create these CSS/JS modules:

```
styles/
├── tokens.css          ← ART_DIRECTION design tokens
├── scenes.css          ← Per-scene entrance/exit/internal animations
├── camera.css          ← Camera architecture (A or B) scroll system
└── textures/           ← Overlay images (grain, paper, scanlines)

scripts/
├── scroll-camera.js    ← Scroll progress → camera transforms
└── scene-observer.js   ← IntersectionObserver for scene activation
```
