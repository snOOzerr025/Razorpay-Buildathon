# Camera Styles

The camera style is the film's personality. It determines how the user
experiences the transitions between scenes and the overall sense of movement
across the website.

**ALWAYS ask the user.** Present by *feel*, not by architecture name.

---

## Option 1 — "Fly Through the World" (Architecture B)

> **Recommended for**: Clay Diorama, Claymation, Glossy Toy — any art
> direction that reads as a miniature/toy world.

The camera **dives into** each scene, **pulls up and out**, and **hops
across** the miniature world to the next. Angles change constantly — big
expressive aerial moves, like a drone filming a model village.

### Feel
- Each scene is a discovery: the camera swoops down to explore it
- Between scenes the camera lifts to a bird's-eye overview, pans, then
  plunges into the next scene from a new angle
- Playful, energetic, the "flagship demo" look

### CSS/JS Architecture
```
Zoom-in → Scene plays → Zoom-out → Pan/hop → Zoom-in → next scene
```

- **Container**: `transform-style: preserve-3d` on the world wrapper
- **Scroll-driven**: Map `scrollY` progress to keyframed `translateZ` +
  `rotateX` + `rotateY` transforms
- **Scene boundaries**: `scroll-snap-type: y mandatory` on the scroll
  container
- **Transition between scenes**: scale down (0.6–0.8) + rotate (15-30deg)
  then scale back up + rotate to new angle
- **Parallax layers**: Each scene has 2-3 depth layers at different
  `translateZ` values

### Camera Grammar Table

| Phase            | Transform                                     | Duration  |
|:-----------------|:----------------------------------------------|:----------|
| Dive in          | `scale(1.2) translateZ(100px) rotateX(-5deg)` | 0.6s ease |
| Scene hold       | `scale(1) translateZ(0) rotateX(0)`           | scroll    |
| Pull out         | `scale(0.7) translateZ(-200px) rotateX(20deg)`| 0.4s ease |
| Hop/pan          | `translateX(±30%) rotateY(±15deg)`            | 0.5s ease |
| Dive in (next)   | `scale(1.2) translateZ(100px) rotateX(-5deg)` | 0.6s ease |

### Trade-off
> Reverses direction at seams — **charming in miniature**, jarring in
> realism.

---

## Option 2 — "One Continuous Walkthrough" (Architecture A)

> **Recommended for**: Flat Papercraft, Neon Night — any art direction
> that reads as grounded/photoreal or has a strong directional narrative.

A single forward flight that **glides through each scene straight into the
next**, never pulling back. The camera always moves forward — expressive
tilts and pans within each scene, but the overall trajectory is one-way.

### Feel
- Like walking through a gallery or flying through a tunnel
- Each scene flows naturally into the next without interruption
- Cinematic, immersive, slightly more serious than fly-through

### CSS/JS Architecture
```
Section 1 → translateZ scroll → Section 2 → translateZ scroll → ...
```

- **Container**: Sections stacked vertically, each `100vh` minimum
- **Scroll-driven**: `scroll-timeline` or `IntersectionObserver` → transforms
- **Transitions**: `opacity` + `transform: translateY / translateZ` crossfade
- **Per-scene motion**: Each scene can have its own internal parallax and
  camera tilt, but the *inter-scene* motion is always forward

### Camera Grammar Table

| Phase            | Transform                                     | Duration  |
|:-----------------|:----------------------------------------------|:----------|
| Enter (from far) | `translateZ(-100px) opacity(0)` → `0 / 1`    | 0.8s ease |
| Scene hold       | Subtle `translateY(-5%)` parallax on scroll   | scroll    |
| Internal tilt    | `rotateX(±3deg)` based on scroll position     | scroll    |
| Exit (into far)  | `translateZ(50px) opacity(0)`                 | 0.5s ease |

### Trade-off
> Sits between the two other options — more dynamic than locked-iso, less
> playful than fly-through. Works across most art directions.

---

## Option 3 — "Locked Isometric Glide" (Architecture A + locked-iso clause)

> **Recommended for**: Any art direction when the user wants calm, editorial
> control, or the cheapest option to iterate on.

The camera keeps **one fixed angle** for the whole film, Emons-style. The
world slides past or toward the camera — no rotation, no reveals, no
surprises.

### Feel
- Like watching a conveyor belt of beautiful scenes pass by
- Calm, controlled, meditative
- The "art book" of camera styles — lets the content speak

### CSS/JS Architecture
```
Fixed camera angle (e.g., rotateX(30deg) rotateZ(45deg)) on world container
All motion is pure translation (translateX / translateY)
```

- **Container**: Apply `perspective` + fixed `rotateX/Z` to the world
  wrapper; **never change these values**
- **All scene transitions**: Pure `translateY` (vertical slide) or
  `translateX` (horizontal slide)
- **No rotation, no scale, no perspective shifts**
- **Per-scene motion**: Limited to internal element animations (floating,
  bobbing, pulsing) — the camera itself never moves

### Camera Grammar Table

| Phase            | Transform                                     | Duration  |
|:-----------------|:----------------------------------------------|:----------|
| World container  | `rotateX(30deg) rotateZ(45deg)` — CONSTANT    | —         |
| Scene enter      | `translateY(100%)` → `translateY(0)`          | 0.6s ease |
| Scene hold       | No camera motion; internal elements animate   | scroll    |
| Scene exit       | `translateY(0)` → `translateY(-100%)`         | 0.6s ease |

### Locked-Iso Clause for Prompts
When this camera is chosen, append to every scene's CSS:
```css
.world-container {
  transform: rotateX(30deg) rotateZ(45deg);
  /* LOCKED — do not modify for any scene transition */
}
```

### Trade-off
> The **calmest and cheapest to re-roll** — since there's no complex 3D
> choreography, iterating on individual scenes is fast and independent.

---

## Comparison Summary

| Aspect           | Fly-Through (B)     | Walkthrough (A)     | Locked-Iso (A+)     |
|:-----------------|:--------------------|:--------------------|:---------------------|
| Energy           | High, playful       | Medium, cinematic   | Low, meditative      |
| Complexity       | High (3D keyframes) | Medium (Z + fade)   | Low (translate only) |
| Re-roll cost     | High (coupled)      | Medium              | Low (independent)    |
| Best for         | Miniature worlds    | Narrative sites     | Editorial/showcase   |
| Worst for        | Photoreal           | —                   | Playful brands       |
| Seam behavior    | Reverses (charming) | Always forward      | Slides past          |
