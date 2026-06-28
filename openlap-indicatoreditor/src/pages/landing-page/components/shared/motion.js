import { keyframes } from "@mui/system";

// Subtle on-mount entrance animations for the landing page. CSS keyframes only
// (no animation library). Reusable across sections in later phases.
export const fadeUp = keyframes({
  from: { opacity: 0, transform: "translateY(12px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const fadeDown = keyframes({
  from: { opacity: 0, transform: "translateY(-8px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

// Returns an sx fragment that plays an entrance animation once on mount.
// Respects prefers-reduced-motion by rendering the final state with no motion.
export const entrance = (animationName, { delay = 0, duration = 600 } = {}) => ({
  animation: `${animationName} ${duration}ms cubic-bezier(0, 0, 0.2, 1) ${delay}ms both`,
  "@media (prefers-reduced-motion: reduce)": {
    animation: "none",
    opacity: 1,
    transform: "none",
  },
});
