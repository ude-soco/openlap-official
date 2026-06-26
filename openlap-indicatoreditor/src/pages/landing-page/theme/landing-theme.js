import { createTheme } from "@mui/material/styles";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

// Landing-page design system.
//
// This produces a theme that LAYERS modern design tokens on top of the app's
// base theme (light/dark). It is applied only to the public landing page via a
// nested ThemeProvider, so the authenticated app is unaffected.
//
// Phase 5A intentionally defines the system (tokens + primitive component
// styles). Section layouts are NOT restructured here — later phases consume
// theme.custom.* (radii, shadows, motion, appBar, layout, link).

const FONT_FAMILY = [
  "'Inter'",
  "-apple-system",
  "BlinkMacSystemFont",
  "'Segoe UI'",
  "Roboto",
  "'Helvetica Neue'",
  "Arial",
  "sans-serif",
].join(", ");

const lightShadows = {
  sm: "0 1px 2px rgba(16, 24, 40, 0.06)",
  card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 2px 6px rgba(16, 24, 40, 0.06)",
  cardHover: "0 6px 20px rgba(16, 24, 40, 0.10), 0 2px 8px rgba(16, 24, 40, 0.06)",
  md: "0 4px 16px rgba(16, 24, 40, 0.08)",
  lg: "0 16px 40px rgba(16, 24, 40, 0.12)",
};

const darkShadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.5)",
  card: "0 1px 2px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.4)",
  cardHover: "0 8px 24px rgba(0, 0, 0, 0.55)",
  md: "0 4px 16px rgba(0, 0, 0, 0.5)",
  lg: "0 16px 40px rgba(0, 0, 0, 0.6)",
};

const motion = {
  duration: { fast: 120, hover: 160, normal: 200, slow: 320, dialog: 280 },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1)",
    entrance: "cubic-bezier(0, 0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
};

const radii = {
  button: 12,
  card: 16,
  input: 12,
  dialog: 16,
  image: 16,
  pill: 999,
};

export const createLandingTheme = (base) => {
  const isDark = base.palette.mode === "dark";
  const shadows = isDark ? darkShadows : lightShadows;

  const custom = {
    radii,
    shadows,
    motion,
    colors: {
      // Mode-aware accent used for eyebrows, icon badges and highlights.
      accent: isDark
        ? base.palette.primary.light
        : base.palette.primary.main,
    },
    appBar: {
      height: 64,
      blur: 12,
      bgOpacity: isDark ? 0.6 : 0.72,
      borderColor: base.palette.divider,
      shadow: shadows.sm,
    },
    layout: {
      // MUI spacing units (×8px). Defined here; applied in later phases.
      sectionPy: { xs: 8, md: 12 },
      sectionGap: { xs: 4, md: 6 },
      cardPadding: 3,
      gridGap: { xs: 2, md: 3 },
      containerMaxWidth: "lg",
    },
    // Opt-in sx for an animated hover/focus underline on text links. Applied
    // per-link in later phases (not globally, to avoid affecting icon links).
    link: {
      animatedUnderline: {
        textDecoration: "none",
        backgroundImage: "linear-gradient(currentColor, currentColor)",
        backgroundSize: "0% 1px",
        backgroundPosition: "0 100%",
        backgroundRepeat: "no-repeat",
        transition: `background-size ${motion.duration.normal}ms ${motion.easing.standard}`,
        "&:hover, &:focus-visible": { backgroundSize: "100% 1px" },
      },
    },
  };

  return createTheme(base, {
    shape: { borderRadius: radii.button },
    custom,
    typography: {
      fontFamily: FONT_FAMILY,
      h1: {
        fontWeight: 700,
        fontSize: "clamp(2.5rem, 1.5rem + 4vw, 3.75rem)",
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontWeight: 700,
        fontSize: "clamp(2rem, 1.4rem + 2.4vw, 2.75rem)",
        lineHeight: 1.15,
        letterSpacing: "-0.015em",
      },
      h3: {
        fontWeight: 600,
        fontSize: "clamp(1.5rem, 1.2rem + 1.2vw, 1.875rem)",
        lineHeight: 1.25,
        letterSpacing: "-0.01em",
      },
      h4: {
        fontWeight: 700,
        fontSize: "clamp(1.75rem, 1.4rem + 1vw, 2.125rem)",
        lineHeight: 1.2,
        letterSpacing: "-0.01em",
      },
      h5: { fontWeight: 600, fontSize: "1.25rem", lineHeight: 1.3 },
      h6: { fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.4 },
      subtitle1: { fontWeight: 500, lineHeight: 1.5 },
      subtitle2: { fontWeight: 600, lineHeight: 1.5 },
      body1: { fontWeight: 400, fontSize: "1rem", lineHeight: 1.6 },
      body2: { fontWeight: 400, fontSize: "0.875rem", lineHeight: 1.55 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: "none",
            fontWeight: 600,
            borderRadius: theme.custom.radii.button,
            transition: `background-color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}, box-shadow ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.hover}ms ${theme.custom.motion.easing.standard}`,
          }),
          sizeSmall: { padding: "6px 14px" },
          sizeMedium: { padding: "8px 18px" },
          sizeLarge: { padding: "11px 26px", fontSize: "1rem" },
          contained: ({ theme }) => ({
            boxShadow: "none",
            "&:hover": { boxShadow: theme.custom.shadows.sm },
          }),
          outlined: ({ theme }) => ({
            borderColor: theme.palette.divider,
            "&:hover": { backgroundColor: theme.palette.action.hover },
          }),
          startIcon: { marginRight: 8 },
          endIcon: { marginLeft: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          // elevation === 0 (e.g. image cards) keep a clean frame: radius +
          // transition only. Content cards get the premium surface + hover.
          root: ({ ownerState, theme }) => ({
            borderRadius: theme.custom.radii.card,
            backgroundImage: "none",
            transition: `box-shadow ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.hover}ms ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}`,
            ...(ownerState.elevation !== 0 && {
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.custom.shadows.card,
              "&:hover": {
                boxShadow: theme.custom.shadows.cardHover,
                transform: "translateY(-2px)",
              },
            }),
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({ borderRadius: theme.custom.radii.input }),
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({ borderRadius: theme.custom.radii.dialog }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 500 },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.palette.divider }),
        },
      },
      MuiLink: {
        defaultProps: { underline: "hover" },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 2,
            transition: `color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}`,
            "&:focus-visible": {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          }),
        },
      },
    },
  });
};
