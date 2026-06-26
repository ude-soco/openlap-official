import {
  alpha,
  Box,
  Button,
  Container,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { navigationIds } from "../utils/navigation-data";
import { scrollToSection } from "../../../common/utils/scroll-to-section";
import { entrance, fadeUp } from "./shared/motion";
import HeroLight from "../../../assets/home/hero-light.png";
import HeroDark from "../../../assets/home/hero-dark.png";
import OpenLAPFull from "../../../assets/home/soco-openlap-full.svg";
import LAY from "../../../assets/home/soco-lay.png";

export default function Hero() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "primary.light" : "primary.main";

  // Smoothly scroll to an in-page section; `highlight` briefly flags arrival.
  const handleScroll = (id, highlight) => (e) => {
    if (e) e.preventDefault();
    scrollToSection(id, { highlight });
  };

  // Layered, soft elevation so the product preview reads as the centerpiece.
  const visualShadow = isDark
    ? `0 24px 70px -24px rgba(0, 0, 0, 0.8), 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 90px ${alpha(
        theme.palette.primary.main,
        0.18
      )}`
    : `0 30px 70px -28px rgba(16, 24, 40, 0.30), 0 12px 28px rgba(16, 24, 40, 0.08), 0 0 90px ${alpha(
        theme.palette.primary.main,
        0.1
      )}`;

  return (
    <Box
      id={navigationIds.HERO}
      sx={{
        width: "100%",
        backgroundImage: isDark
          ? `linear-gradient(180deg, ${alpha(theme.palette.primary.dark, 0.25)}, ${alpha(theme.palette.background.default, 0)})`
          : `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.18)}, ${alpha(theme.palette.background.default, 0)})`,
        backgroundSize: "100% 60%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: { xs: 14, md: 22 },
          pb: { xs: 10, md: 16 },
        }}
      >
        {/* Headline / content */}
        <Stack
          spacing={{ xs: 3.5, md: 4.5 }}
          alignItems="center"
          sx={{
            width: "100%",
            maxWidth: 840,
            textAlign: "center",
            ...entrance(fadeUp),
          }}
        >
          {/* eyebrow + headline kept tight together */}
          <Stack spacing={2} alignItems="center">
            <Typography
              variant="overline"
              sx={{ color: accent, fontWeight: 600, letterSpacing: "0.1em" }}
            >
              Open Learning Analytics Platform
            </Typography>

            <Typography variant="h1">
              Build Learning Analytics Indicators{" "}
              <Box component="span" sx={{ color: accent }}>
                without writing code
              </Box>
            </Typography>
          </Stack>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 680, fontSize: { md: "1.125rem" } }}
          >
            A self-service learning analytics platform that lets teachers,
            students, and researchers design and implement their own indicators
            — no code required — through the{" "}
            <Link
              href="#isc-creator"
              onClick={handleScroll("isc-creator", true)}
              sx={{ cursor: "pointer" }}
            >
              ISC Creator
            </Link>{" "}
            and the{" "}
            <Link
              href="#indicator-editor"
              onClick={handleScroll("indicator-editor", true)}
              sx={{ cursor: "pointer" }}
            >
              Indicator Editor
            </Link>
            .
          </Typography>

          {/* CTAs */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Button
              variant="contained"
              size="large"
              endIcon={<RocketLaunchIcon />}
              onClick={() => navigate("/register")}
            >
              Try it now
            </Button>
            <Button
              variant="outlined"
              size="large"
              href={`#${navigationIds.FEATURE}`}
              onClick={handleScroll(navigationIds.FEATURE, false)}
            >
              Explore features
            </Button>
          </Stack>

          {/* Trust strip */}
          <Stack alignItems="center" spacing={2.5} sx={{ pt: { xs: 1, md: 2 } }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", letterSpacing: "0.01em" }}
            >
              Developed by the Social Computing Group · University of
              Duisburg-Essen
            </Typography>
            <Stack
              direction="row"
              spacing={4}
              alignItems="center"
              sx={{ opacity: 0.65, display: { xs: "none", sm: "flex" } }}
            >
              <Box
                component="img"
                src={OpenLAPFull}
                alt="OpenLAP"
                sx={{ height: 48 }}
              />
              <Box
                component="img"
                src={LAY}
                alt="LAY project"
                sx={{ height: 48 }}
              />
            </Stack>
          </Stack>
        </Stack>

        {/* Product visual */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 1080,
            mt: { xs: 8, md: 13 },
            ...entrance(fadeUp, { delay: 160 }),
          }}
        >
          <Box
            sx={{
              borderRadius: `${theme.custom.radii.image}px`,
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              overflow: "hidden",
              bgcolor: "background.paper",
              boxShadow: visualShadow,
            }}
          >
            <Box
              component="img"
              src={isDark ? HeroDark : HeroLight}
              alt="The OpenLAP platform interface for designing and visualizing learning analytics indicators"
              sx={{ display: "block", width: "100%", height: "auto" }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
