// Offset (in px) to account for the fixed AppBar when scrolling to a section.
const SCROLL_OFFSET = 128;
const HIGHLIGHT_CLASS = "section-arrival-highlight";
const HIGHLIGHT_DURATION = 1150;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Smoothly scrolls the page to the section whose DOM element id matches.
 * Shared by the landing-page AppBar, Hero and Footer so the scroll behavior
 * stays consistent in one place.
 *
 * @param {string} sectionId  target element id
 * @param {{ highlight?: boolean }} [options]  briefly highlight the destination
 *   to reassure the user they arrived (skipped under reduced motion)
 */
export const scrollToSection = (sectionId, { highlight = false } = {}) => {
  const sectionElement = document.getElementById(sectionId);
  if (!sectionElement) return;

  const reduce = prefersReducedMotion();
  // Absolute document position of the target. Using getBoundingClientRect +
  // scrollY (instead of offsetTop) is robust to transformed ancestors — e.g.
  // the reveal-animation wrappers around the feature rows, whose CSS transform
  // would otherwise make offsetTop resolve relative to the wrapper (~0) and
  // scroll the page to the top.
  const targetScroll =
    sectionElement.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
  window.scrollTo({ top: targetScroll, behavior: reduce ? "auto" : "smooth" });

  if (highlight && !reduce) {
    sectionElement.classList.remove(HIGHLIGHT_CLASS);
    // Force a reflow so the animation restarts on repeat triggers.
    void sectionElement.offsetWidth;
    sectionElement.classList.add(HIGHLIGHT_CLASS);
    window.setTimeout(() => {
      sectionElement.classList.remove(HIGHLIGHT_CLASS);
    }, HIGHLIGHT_DURATION);
  }
};
