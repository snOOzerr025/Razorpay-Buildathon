# Prompts & Reusable Tokens

CSS custom property blocks and animation keyframes that implement the art
direction and camera choices. Copy the relevant block based on the user's
selections from Steps 1 and 2.

---

## Shared Base Tokens (ALL art directions)

```css
:root {
  /* === Timing === */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-smooth: cubic-bezier(0.45, 0, 0.55, 1);
  --duration-scene-enter: 0.8s;
  --duration-scene-exit: 0.5s;
  --duration-element-stagger: 0.1s;

  /* === Layout === */
  --scene-height: 100vh;
  --scene-height-long: 150vh;
  --scene-padding-x: clamp(1rem, 5vw, 4rem);
  --scene-padding-y: clamp(2rem, 8vh, 6rem);
  --max-content-width: 1200px;

  /* === Z-Index Scale === */
  --z-background: 0;
  --z-scene-content: 10;
  --z-parallax-mid: 20;
  --z-parallax-fore: 30;
  --z-sticky-nav: 100;
  --z-overlay: 200;
  --z-modal: 300;
  --z-toast: 400;
}
```

---

## Art Direction Token Blocks

### Clay Diorama Tokens

```css
:root {
  /* Clay Diorama — "soft matte low-poly clay diorama, isometric, tilt-shift miniature, warm light" */
  --color-surface: hsl(35, 30%, 96%);
  --color-surface-elevated: hsl(35, 25%, 100%);
  --color-primary: hsl(22, 65%, 55%);
  --color-primary-hover: hsl(22, 65%, 48%);
  --color-accent: hsl(195, 50%, 55%);
  --color-accent-hover: hsl(195, 50%, 48%);
  --color-text: hsl(25, 20%, 18%);
  --color-text-muted: hsl(25, 15%, 45%);
  --color-border: hsl(30, 20%, 85%);

  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 9999px;

  --shadow-sm: 0 2px 8px hsl(30 40% 20% / 0.08);
  --shadow-md: 0 8px 32px hsl(30 40% 20% / 0.12);
  --shadow-lg: 0 16px 48px hsl(30 40% 20% / 0.16);

  --font-display: 'Nunito', 'Quicksand', sans-serif;
  --font-body: 'Inter', 'DM Sans', sans-serif;

  --texture-overlay: url('/textures/grain.png');
  --texture-opacity: 0.04;
  --texture-blend: multiply;
}
```

### Flat Papercraft Tokens

```css
:root {
  /* Flat Papercraft — "flat layered papercraft, cut-paper shadows, bold primaries, craft-table top-down" */
  --color-surface: hsl(45, 30%, 94%);
  --color-surface-elevated: hsl(45, 25%, 98%);
  --color-primary: hsl(355, 75%, 55%);
  --color-primary-hover: hsl(355, 75%, 48%);
  --color-accent: hsl(210, 70%, 50%);
  --color-accent-hover: hsl(210, 70%, 43%);
  --color-text: hsl(0, 0%, 12%);
  --color-text-muted: hsl(0, 0%, 35%);
  --color-border: hsl(40, 15%, 80%);

  --radius-sm: 0px;
  --radius-md: 2px;
  --radius-lg: 4px;
  --radius-pill: 4px;

  --shadow-sm: 2px 2px 0 hsl(0 0% 0% / 0.08);
  --shadow-md: 4px 4px 0 hsl(0 0% 0% / 0.12);
  --shadow-lg: 6px 6px 0 hsl(0 0% 0% / 0.16);

  --font-display: 'Fredoka', 'Baloo 2', sans-serif;
  --font-body: 'Source Sans 3', 'Karla', sans-serif;

  --texture-overlay: url('/textures/paper-fiber.png');
  --texture-opacity: 0.1;
  --texture-blend: multiply;
}
```

### Glossy Toy Tokens

```css
:root {
  /* Glossy Toy — "glossy injection-molded toy, candy-bright specular highlights, rounded pill shapes" */
  --color-surface: hsl(0, 0%, 98%);
  --color-surface-elevated: hsl(0, 0%, 100%);
  --color-primary: hsl(340, 80%, 55%);
  --color-primary-hover: hsl(340, 80%, 48%);
  --color-accent: hsl(165, 70%, 48%);
  --color-accent-hover: hsl(165, 70%, 41%);
  --color-text: hsl(240, 10%, 20%);
  --color-text-muted: hsl(240, 8%, 45%);
  --color-border: hsl(0, 0%, 88%);

  --radius-sm: 16px;
  --radius-md: 24px;
  --radius-lg: 9999px;
  --radius-pill: 9999px;

  --shadow-sm: 0 2px 8px hsl(0 0% 0% / 0.06);
  --shadow-md: 0 4px 16px hsl(0 0% 0% / 0.1);
  --shadow-lg: 0 8px 32px hsl(0 0% 0% / 0.14);

  --font-display: 'Outfit', 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Inter', 'Satoshi', sans-serif;

  --texture-overlay: none;
  --texture-opacity: 0;
  --texture-blend: normal;
}

/* Glossy highlight mixin — apply to elevated surfaces */
.glossy-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    hsl(0 0% 100% / 0.4) 0%,
    hsl(0 0% 100% / 0) 50%
  );
  pointer-events: none;
}
```

### Claymation Tokens

```css
:root {
  /* Claymation — "stop-motion claymation, lumpy organic surfaces, muted warm palette, soft diffuse light" */
  --color-surface: hsl(30, 15%, 92%);
  --color-surface-elevated: hsl(30, 12%, 96%);
  --color-primary: hsl(15, 55%, 50%);
  --color-primary-hover: hsl(15, 55%, 43%);
  --color-accent: hsl(85, 35%, 55%);
  --color-accent-hover: hsl(85, 35%, 48%);
  --color-text: hsl(20, 15%, 22%);
  --color-text-muted: hsl(20, 10%, 42%);
  --color-border: hsl(25, 12%, 82%);

  --radius-sm: 16px;
  --radius-md: 24px;
  --radius-lg: 32px;
  --radius-pill: 9999px;

  --shadow-sm: 0 4px 16px hsl(25 30% 20% / 0.06);
  --shadow-md: 0 12px 40px hsl(25 30% 20% / 0.1);
  --shadow-lg: 0 20px 60px hsl(25 30% 20% / 0.14);

  --font-display: 'Baloo 2', 'Bubblegum Sans', cursive;
  --font-body: 'Cabin', 'Rubik', sans-serif;

  --texture-overlay: url("data:image/svg+xml,..."); /* SVG feTurbulence */
  --texture-opacity: 0.06;
  --texture-blend: soft-light;
}
```

### Neon Night Tokens

```css
:root {
  /* Neon Night — "dark cyberpunk cityscape, neon glow tubes, wet asphalt reflections, scanline overlay" */
  --color-surface: hsl(230, 25%, 8%);
  --color-surface-elevated: hsl(230, 20%, 14%);
  --color-primary: hsl(280, 100%, 65%);
  --color-primary-hover: hsl(280, 100%, 72%);
  --color-accent: hsl(170, 100%, 50%);
  --color-accent-hover: hsl(170, 100%, 58%);
  --color-text: hsl(0, 0%, 90%);
  --color-text-muted: hsl(230, 10%, 55%);
  --color-border: hsl(230, 20%, 22%);

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 9999px;

  --shadow-sm: 0 0 10px hsl(280 100% 60% / 0.2);
  --shadow-md: 0 0 20px hsl(280 100% 60% / 0.3);
  --shadow-lg: 0 0 40px hsl(280 100% 60% / 0.4);

  --font-display: 'JetBrains Mono', 'Space Grotesk', monospace;
  --font-body: 'Outfit', 'Inter', sans-serif;

  --texture-overlay: repeating-linear-gradient(
    0deg,
    hsl(0 0% 100% / 0.03) 0px,
    hsl(0 0% 100% / 0.03) 1px,
    transparent 1px,
    transparent 3px
  );
  --texture-opacity: 1;
  --texture-blend: normal;
}

/* Neon glow mixin */
.neon-glow {
  text-shadow:
    0 0 7px hsl(280 100% 65% / 0.6),
    0 0 20px hsl(280 100% 65% / 0.4),
    0 0 40px hsl(280 100% 65% / 0.2);
}
.neon-glow-cyan {
  text-shadow:
    0 0 7px hsl(170 100% 50% / 0.6),
    0 0 20px hsl(170 100% 50% / 0.4),
    0 0 40px hsl(170 100% 50% / 0.2);
}
```

---

## Camera Architecture Keyframes

### Architecture B — Fly-Through Keyframes

```css
@keyframes scene-dive-in {
  from {
    transform: scale(0.7) translateZ(-200px) rotateX(20deg);
    opacity: 0;
  }
  to {
    transform: scale(1) translateZ(0) rotateX(0);
    opacity: 1;
  }
}

@keyframes scene-pull-out {
  from {
    transform: scale(1) translateZ(0) rotateX(0);
    opacity: 1;
  }
  to {
    transform: scale(0.7) translateZ(-200px) rotateX(20deg);
    opacity: 0;
  }
}

@keyframes scene-hop {
  0% {
    transform: translateX(0) rotateY(0);
  }
  50% {
    transform: translateX(30%) rotateY(15deg);
  }
  100% {
    transform: translateX(0) rotateY(0);
  }
}
```

### Architecture A — Walkthrough Keyframes

```css
@keyframes scene-glide-in {
  from {
    transform: translateZ(-100px) translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateZ(0) translateY(0);
    opacity: 1;
  }
}

@keyframes scene-glide-out {
  from {
    transform: translateZ(0) translateY(0);
    opacity: 1;
  }
  to {
    transform: translateZ(50px) translateY(-20px);
    opacity: 0;
  }
}
```

### Architecture A (Locked-Iso) — Translation-Only Keyframes

```css
/* The world container rotation is CONSTANT — never animate these values */
.world-container {
  transform: rotateX(30deg) rotateZ(45deg);
  transform-style: preserve-3d;
}

@keyframes scene-slide-in {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scene-slide-out {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}
```

---

## Texture Overlay Pattern

Apply this to the `body::after` or a fixed overlay element:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--texture-overlay);
  opacity: var(--texture-opacity);
  mix-blend-mode: var(--texture-blend);
  pointer-events: none;
  z-index: 9999;
}
```

---

## Reduced Motion Fallback

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Keep simple opacity fades for scene transitions */
  .scene {
    transition: opacity 0.3s ease;
  }
}
```

---

## Scroll Camera Controller (JavaScript)

Minimal scroll-progress → camera-transform controller. Expand per camera
architecture.

```js
/**
 * Maps scroll progress (0-1 per scene) to CSS custom properties
 * that the camera CSS reads via var().
 */
function initScrollCamera() {
  const scenes = document.querySelectorAll('.scene');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scene--active');
          entry.target.dispatchEvent(new CustomEvent('scene:enter'));
        } else {
          entry.target.classList.remove('scene--active');
          entry.target.dispatchEvent(new CustomEvent('scene:exit'));
        }
      });
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  scenes.forEach((scene) => observer.observe(scene));

  // Scroll progress per scene (for internal parallax)
  window.addEventListener('scroll', () => {
    scenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1,
        1 - (rect.top / window.innerHeight)
      ));
      scene.style.setProperty('--scroll-progress', progress);
    });
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initScrollCamera);
```
