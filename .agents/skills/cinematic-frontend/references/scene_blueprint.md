# Scene Blueprint

Every cinematic website is decomposed into **5-6 scenes**. Each scene is a
self-contained cinematic "shot" — it has an entrance, internal motion, and
an exit that hands off to the next scene. The content of each scene adapts
to the website's purpose, but the **structure** is always this template.

---

## Scene Structure Template

```
Scene N: [Title]
├── Entrance Animation    — how this scene appears (driven by scroll/camera)
├── Internal Motion       — what moves while the user is "inside" the scene
├── Content Layout        — the actual UI/content of this scene
├── Exit Transition       — how this scene hands off to the next
└── Depth Layers          — foreground / midground / background parallax
```

Each scene MUST define all five properties. If a property is "none" (e.g.,
no parallax in locked-iso mode), state it explicitly as `none`.

---

## The 5-6 Scene Arc

This is the **default narrative arc** for a general website. Adapt the
content to the actual product, but keep the emotional shape.

### Scene 1 — THE HOOK (Hero / First Impression)

**Purpose**: Capture attention. Establish the art direction. The user should
*feel* the visual world within 2 seconds.

**Content**:
- Hero headline (one strong statement)
- A single visual centerpiece (illustration, 3D object, animated element)
- Subtle CTA (the user should want to scroll, not click yet)

**Camera**:
- Fly-through: Camera is already mid-dive when the page loads
- Walkthrough: Slow forward drift, world materializing
- Locked-iso: World slides into frame from the edge

**Internal Motion**:
- Floating/bobbing hero element
- Ambient particles or subtle background animation
- Parallax between headline and visual

**Duration**: `100vh` exactly. No scrolling within this scene.

---

### Scene 2 — THE CONTEXT (What / Why / Problem)

**Purpose**: Orient the user. What is this product/service? Why should they
care? Frame the problem or opportunity.

**Content**:
- 2-3 key value propositions or problem statements
- Supporting visuals (icons, small illustrations, data points)
- Brief descriptive copy (not a wall of text)

**Camera**:
- Fly-through: Pull out from Scene 1 → pan → dive into Scene 2
- Walkthrough: Glide forward, Scene 1 fades behind
- Locked-iso: Scene 1 slides up/away, Scene 2 slides in from below

**Internal Motion**:
- Elements stagger-animate in on scroll (left-to-right or bottom-to-top)
- Subtle scale animation on value prop cards/items
- Background layer moves at 0.3× scroll speed

**Duration**: `100vh` – `150vh` depending on content density.

---

### Scene 3 — THE SHOWCASE (Features / How It Works / Demo)

**Purpose**: The "show don't tell" scene. This is the meatiest scene —
demonstrate the product, show features, walk through a process.

**Content**:
- Feature grid, interactive demo, or step-by-step walkthrough
- The most visually complex scene — this is where the art direction shines
- Can include micro-interactions, hover states, animated diagrams

**Camera**:
- Fly-through: Multiple mini-dives within this scene (feature → feature)
- Walkthrough: Sustained forward motion with internal tilts per feature
- Locked-iso: Content cards/panels slide through the fixed viewport

**Internal Motion**:
- Scroll-triggered feature reveals
- Animated diagrams or illustrations that "build" as you scroll
- Interactive hover states on feature cards

**Duration**: `150vh` – `200vh`. The longest scene.

---

### Scene 4 — THE PROOF (Social Proof / Results / Trust)

**Purpose**: Build credibility. Testimonials, metrics, logos, case studies.
Transition from "here's what we do" to "here's why you should believe us."

**Content**:
- Testimonial quotes or cards
- Key metrics (animated counters, progress bars)
- Client/partner logos
- Case study snippets

**Camera**:
- Fly-through: Pull out to overview, then gentle pan across proof elements
- Walkthrough: Slow, stately forward drift — confidence pace
- Locked-iso: Elements drift through frame at a measured pace

**Internal Motion**:
- Counter/number animations triggered on scroll entry
- Testimonial cards with subtle float/rotate
- Logo strip with infinite horizontal scroll

**Duration**: `100vh` – `120vh`.

---

### Scene 5 — THE TURN (Differentiator / Deeper Story)

**Purpose**: The unexpected scene. Something that breaks the pattern — a
deeper story, a bold claim, an interactive element, a visual surprise.
This is what makes the site memorable.

**Content could be**:
- An interactive comparison or calculator
- A "behind the scenes" or "how we're different" narrative
- A timeline or journey visualization
- An easter egg or playful interactive moment

**Camera**:
- Fly-through: The most dramatic dive — biggest angle change
- Walkthrough: A noticeable shift in pace (faster or slower)
- Locked-iso: A visual surprise within the fixed frame (color shift,
  scale change, new element type)

**Internal Motion**:
- The most animated scene — this is where you earn the "wow"
- Scroll-driven progress animations
- Interactive elements that respond to cursor/touch

**Duration**: `100vh` – `150vh`.

---

### Scene 6 — THE CLOSE (CTA / Footer / Resolution)

**Purpose**: Resolve the narrative. Give the user a clear action to take.
Leave them with the feeling the art direction established in Scene 1.

**Content**:
- Primary CTA (sign up, buy, contact, download)
- Brief reinforcement of core value proposition
- Footer with necessary links
- Visual callback to Scene 1's centerpiece element

**Camera**:
- Fly-through: Final pull-out to reveal the full miniature world
- Walkthrough: Slow deceleration, settling into the final frame
- Locked-iso: The world gently slides to a stop

**Internal Motion**:
- Settling/landing animation (elements come to rest)
- CTA button with attention-drawing pulse or glow
- Ambient loop (particles, gentle float) — the world is alive but calm

**Duration**: `100vh` exactly. Clean ending.

---

## Adapting the Blueprint

The 5-6 scene arc above is a **starting template**. Adapt it:

| Website Type      | Scene Adaptation                                         |
|:------------------|:---------------------------------------------------------|
| SaaS landing page | Scene 3 = live demo/screenshot walkthrough               |
| Portfolio         | Scene 3-5 = individual project showcases                 |
| E-commerce        | Scene 3 = product gallery, Scene 4 = reviews             |
| Documentation     | Scene 2-4 = feature deep-dives with code examples        |
| Event/conference  | Scene 3 = speaker lineup, Scene 4 = schedule             |
| Dashboard         | Reduce to 3-4 scenes, each is a functional panel         |

---

## Scene Timing Cheatsheet

| Camera Style    | Scene-to-Scene Transition | Internal Animation Pace |
|:----------------|:--------------------------|:------------------------|
| Fly-through     | 1.0–1.5s (complex 3D)    | Fast, energetic         |
| Walkthrough     | 0.6–1.0s (fade + Z)      | Medium, smooth          |
| Locked-iso      | 0.4–0.6s (translate)     | Slow, deliberate        |

---

## Accessibility Requirements (Per Scene)

Every scene must:
- [ ] Have a unique `id` attribute for deep-linking (`#scene-hook`, etc.)
- [ ] Be keyboard-navigable (Tab order follows scene order)
- [ ] Have `aria-label` on the scene container describing its purpose
- [ ] Respect `prefers-reduced-motion`:
  - Entrance: instant opacity fade (no transforms)
  - Internal: static layout, no parallax
  - Exit: instant opacity fade
- [ ] Maintain minimum contrast ratios regardless of parallax layer overlap
