import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  // 1. Setup Navigation effect on scroll
  const nav = document.querySelector('.pill-nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.style.background = 'rgba(255, 255, 255, 0.98)';
        nav.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
      } else {
        nav.style.background = 'rgba(245, 248, 255, 0.85)';
        nav.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
      }
    });
  }

  // 2. Setup Scroll Storytelling
  const storyContainer = document.getElementById("scroll-story-container");
  const slides = document.querySelectorAll(".story-slide");
  
  if (storyContainer && slides.length > 0) {
    ScrollTrigger.create({
      trigger: storyContainer,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const progress = self.progress;
        const totalSlides = slides.length;
        
        let activeIndex = Math.floor(progress * totalSlides);
        if (activeIndex >= totalSlides) activeIndex = totalSlides - 1;

        slides.forEach((slide, idx) => {
          if (idx === activeIndex) {
            slide.classList.add("active");
            slide.classList.remove("up");
          } else if (idx < activeIndex) {
            slide.classList.remove("active");
            slide.classList.add("up");
          } else {
            slide.classList.remove("active");
            slide.classList.remove("up");
          }
        });
      }
    });
  }

  // 3. Background Color Transition (Dark to Light)
  const featuresGrid = document.querySelector('.features-grid');
  if (featuresGrid) {
    ScrollTrigger.create({
      trigger: featuresGrid,
      start: "top 60%", // Trigger transition when features grid is in view
      onEnter: () => document.body.classList.add("light-mode"),
      onLeaveBack: () => document.body.classList.remove("light-mode")
    });
  }
});
