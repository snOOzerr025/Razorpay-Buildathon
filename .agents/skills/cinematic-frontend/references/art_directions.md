# Art Direction Options

These are the visual style presets for cinematic frontends. Each one defines
a complete visual world — palette, texture, shadow language, border treatment,
and typographic mood. The user picks one; it becomes the **shared style
preamble** reused verbatim across every scene.

---

## 1. Soft Matte Clay Diorama ← DEFAULT

> `soft matte low-poly clay diorama, isometric, tilt-shift miniature, warm light`

| Token             | Value                                                    |
|:------------------|:---------------------------------------------------------|
| `--radius`        | `16px` – `24px`                                          |
| `--shadow`        | `0 8px 32px hsl(30 40% 20% / 0.15)` (warm, layered)     |
| `--surface`       | `hsl(35, 30%, 96%)` — warm off-white clay                |
| `--primary`       | `hsl(22, 65%, 55%)` — terracotta                         |
| `--accent`        | `hsl(195, 50%, 55%)` — dusty teal                        |
| `--text`          | `hsl(25, 20%, 18%)` — warm near-black                    |
| `--texture`       | Subtle grain overlay (`mix-blend-mode: multiply`, 3-5%)  |
| `--font-display`  | Nunito / Quicksand (rounded, friendly)                   |
| `--font-body`     | Inter / DM Sans (clean, readable)                        |

**Mood**: Handcrafted, tactile, toybox warmth. Objects feel like they have
weight and a matte finish. Shadows are soft and diffused, never hard-edged.

---

## 2. Flat Papercraft

> `flat layered papercraft, cut-paper shadows, bold primaries, craft-table top-down`

| Token             | Value                                                    |
|:------------------|:---------------------------------------------------------|
| `--radius`        | `0px` – `4px`                                            |
| `--shadow`        | `4px 4px 0 hsl(0 0% 0% / 0.12)` (hard-edge drop)       |
| `--surface`       | `hsl(45, 30%, 94%)` — kraft paper                        |
| `--primary`       | `hsl(355, 75%, 55%)` — construction-paper red            |
| `--accent`        | `hsl(210, 70%, 50%)` — bold blue                         |
| `--text`          | `hsl(0, 0%, 12%)` — near-black ink                       |
| `--texture`       | Paper fiber texture background (opacity 8-12%)           |
| `--font-display`  | Fredoka One / Baloo 2 (bold, rounded block)              |
| `--font-body`     | Source Sans 3 / Karla (clean, slightly humanist)         |

**Mood**: Playful, editorial, like a well-designed children's book or a
Museum of Design pop-up. Layers stack with visible "cut" edges. Shadows
are always offset and hard, never blurred.

---

## 3. Glossy Toy

> `glossy injection-molded toy, candy-bright specular highlights, rounded pill shapes`

| Token             | Value                                                    |
|:------------------|:---------------------------------------------------------|
| `--radius`        | `50%` / `9999px` (pill shapes)                           |
| `--shadow`        | `0 4px 16px hsl(0 0% 0% / 0.1)` + specular highlight    |
| `--surface`       | `hsl(0, 0%, 98%)` — pure white showroom                  |
| `--primary`       | `hsl(340, 80%, 55%)` — hot pink                          |
| `--accent`        | `hsl(165, 70%, 48%)` — mint                              |
| `--text`          | `hsl(240, 10%, 20%)` — cool near-black                   |
| `--texture`       | Glossy gradient overlays (`linear-gradient` highlights)  |
| `--font-display`  | Outfit / Plus Jakarta Sans (geometric, modern)           |
| `--font-body`     | Inter / Satoshi (neutral, crisp)                         |

**Mood**: Joyful, premium-toy-unboxing energy. Everything feels molded and
shiny. Specular highlights and subtle reflections make surfaces feel glossy.
High contrast, saturated, clean.

---

## 4. Claymation

> `stop-motion claymation, lumpy organic surfaces, muted warm palette, soft diffuse light`

| Token             | Value                                                    |
|:------------------|:---------------------------------------------------------|
| `--radius`        | `20px` – `32px` (extra soft, organic)                    |
| `--shadow`        | `0 12px 40px hsl(25 30% 20% / 0.12)` (very soft diffuse)|
| `--surface`       | `hsl(30, 15%, 92%)` — warm putty                        |
| `--primary`       | `hsl(15, 55%, 50%)` — muted rust                        |
| `--accent`        | `hsl(85, 35%, 55%)` — sage green                        |
| `--text`          | `hsl(20, 15%, 22%)` — warm dark brown                   |
| `--texture`       | Organic noise/displacement (SVG filter `feTurbulence`)   |
| `--font-display`  | Baloo 2 / Bubblegum Sans (soft, rounded, imperfect)     |
| `--font-body`     | Cabin / Rubik (slightly rounded, humanist)               |

**Mood**: Wallace & Gromit meets Aardman. Everything looks hand-shaped,
slightly imperfect, with visible thumb-print texture. Edges wobble.
No hard lines, no sharp corners. The whole world has been sculpted by hand.

---

## 5. Neon Night

> `dark cyberpunk cityscape, neon glow tubes, wet asphalt reflections, scanline overlay`

| Token             | Value                                                    |
|:------------------|:---------------------------------------------------------|
| `--radius`        | `8px` – `12px`                                           |
| `--shadow`        | `0 0 20px hsl(280 100% 60% / 0.4)` (neon glow)          |
| `--surface`       | `hsl(230, 25%, 8%)` — deep night                        |
| `--primary`       | `hsl(280, 100%, 65%)` — electric purple                  |
| `--accent`        | `hsl(170, 100%, 50%)` — cyan neon                        |
| `--text`          | `hsl(0, 0%, 90%)` — off-white                           |
| `--texture`       | Scanline overlay (repeating 2px lines, 3-5% opacity)    |
| `--font-display`  | JetBrains Mono / Space Grotesk (technical, geometric)   |
| `--font-body`     | Outfit / Inter (geometric sans, crisp on dark)           |

**Mood**: Blade Runner, Rain World, neon-soaked streets. Dark surfaces with
glowing edges. Elements pulse subtly. Reflections on wet-look surfaces.
High contrast between the darkness and the neon highlights. Everything
feels electric and alive.
