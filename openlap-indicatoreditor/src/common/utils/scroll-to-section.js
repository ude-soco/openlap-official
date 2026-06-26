// Offset (in px) to account for the fixed AppBar when scrolling to a section.
const SCROLL_OFFSET = 128;

/**
 * Smoothly scrolls the page to the section whose DOM element id matches.
 * Shared by the landing-page AppBar, Hero and Footer so the scroll behavior
 * stays consistent in one place.
 */
export const scrollToSection = (sectionId) => {
  const sectionElement = document.getElementById(sectionId);
  if (!sectionElement) return;

  const targetScroll = sectionElement.offsetTop - SCROLL_OFFSET;
  sectionElement.scrollIntoView({ behavior: "smooth" });
  window.scrollTo({
    top: targetScroll,
    behavior: "smooth",
  });
};
