import { createTheme } from "@mui/material/styles";
import { createScopedTheme } from "./scoped-theme";

// Scoped theme for the AUTHENTICATED app (applied via a nested ThemeProvider
// inside AppShell only — the global theme and the public pages are untouched).
//
// It inherits the shared design foundation from `createScopedTheme` (Inter
// typography, `theme.custom.*` tokens, and the safe button/input/chip/dialog
// polish) but is deliberately CONSERVATIVE on global component overrides,
// because it wraps every authenticated route — including charts, data grids
// and editors we are not redesigning yet. The shell's own look (top bar,
// sidebar, content sheet) is styled per-component via `sx`, not global
// overrides, so it cannot leak into page internals.
export const createAppTheme = (base) => {
  const scoped = createScopedTheme(base);
  const isDark = scoped.palette.mode === "dark";

  return createTheme(scoped, {
    palette: {
      background: {
        // Soft canvas behind the white content sheet, replacing the flat
        // full-bleed white page. Dark mode keeps MUI's default dark canvas.
        default: isDark ? scoped.palette.background.default : "#f5f6f8",
      },
    },
    components: {
      // Neutralise the public theme's card hover-lift app-wide: existing pages
      // (ISC / Indicator / GQI cards) must not gain motion we haven't designed
      // for in this phase. Keep only the radius + flat-image-card fix.
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.custom.radii.card,
            backgroundImage: "none",
          }),
        },
      },
    },
  });
};

export default createAppTheme;
