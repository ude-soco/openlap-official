import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import { entrance, fadeUp } from "./motion";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Reveals its children with a subtle fade-up the first time they scroll into
// view. Built on the shared motion helper (CSS keyframes, no animation
// library) and respects prefers-reduced-motion (renders visible immediately,
// no motion). One-shot: it does not re-animate on scroll back.
const Reveal = ({ children, delay = 0, sx, ...rest }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (inView) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  return (
    <Box
      ref={ref}
      sx={{ ...(inView ? entrance(fadeUp, { delay }) : { opacity: 0 }), ...sx }}
      {...rest}
    >
      {children}
    </Box>
  );
};

Reveal.propTypes = {
  children: PropTypes.node,
  delay: PropTypes.number,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};

export default Reveal;
