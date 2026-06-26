import { useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { alpha, Box, Paper, Stack, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { createScopedTheme } from "../../theme/scoped-theme";
import AuthHeader from "../auth-header/auth-header";

// Shared layout for the public auth pages. Applies the scoped design system
// (Inter, radii, shadows, dark-mode polish) via a nested ThemeProvider — so the
// authenticated app is unaffected — and centers the form inside a polished card
// over a subtle landing-style background.
const AuthLayout = ({
  title,
  subtitle,
  crossLink,
  maxWidth = 460,
  children,
}) => {
  const { theme } = useContext(CustomThemeContext);
  const scopedTheme = useMemo(() => createScopedTheme(theme), [theme]);

  return (
    <ThemeProvider theme={scopedTheme}>
      <Box
        sx={(t) => ({
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          backgroundImage:
            t.palette.mode === "dark"
              ? `linear-gradient(180deg, ${alpha(t.palette.primary.dark, 0.18)}, ${alpha(t.palette.background.default, 0)})`
              : `linear-gradient(180deg, ${alpha(t.palette.primary.light, 0.14)}, ${alpha(t.palette.background.default, 0)})`,
          backgroundSize: "100% 360px",
          backgroundRepeat: "no-repeat",
        })}
      >
        <AuthHeader crossLink={crossLink} />
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 2,
            py: { xs: 4, md: 6 },
          }}
        >
          <Box sx={{ width: "100%", maxWidth, mx: "auto" }}>
            <Paper
              elevation={0}
              sx={(t) => ({
                borderRadius: `${t.custom.radii.card}px`,
                border: `1px solid ${t.palette.divider}`,
                boxShadow: t.custom.shadows.card,
                p: { xs: 3, md: 4 },
              })}
            >
              {(title || subtitle) && (
                <Stack spacing={1} sx={{ mb: 3, textAlign: "center" }}>
                  {title && (
                    <Typography variant="h4" component="h1">
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography variant="body2" color="text.secondary">
                      {subtitle}
                    </Typography>
                  )}
                </Stack>
              )}
              {children}
            </Paper>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

AuthLayout.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  crossLink: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
  }),
  maxWidth: PropTypes.number,
  children: PropTypes.node,
};

export default AuthLayout;
