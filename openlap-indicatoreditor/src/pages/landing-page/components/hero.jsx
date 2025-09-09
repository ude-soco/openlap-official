import { alpha, Button, Link } from "@mui/material";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";
import { navigationIds } from "../utils/navigation-data";
import HeroLight from "../../../assets/home/hero-light.png";
import HeroDark from "../../../assets/home/hero-dark.png";
import OpenLAPFull from "../../../assets/home/soco-openlap-full.svg";
import LAY from "../../../assets/home/soco-lay.png";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();
  const scrollToSection = (sectionId) => {
    const sectionElement = document.getElementById(sectionId);
    const offset = 128;
    if (sectionElement) {
      const targetScroll = sectionElement.offsetTop - offset;
      sectionElement.scrollIntoView({ behavior: "smooth" });
      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <Box
      id={navigationIds.HERO}
      sx={(theme) => ({
        width: "100%",
        backgroundImage:
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, #CEE5FD, #FFF)"
            : `linear-gradient(#02294F, ${alpha("#090E10", 0.0)})`,
        backgroundSize: "100% 20%",
        backgroundRepeat: "no-repeat",
      })}
    >
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: { xs: 14, sm: 20 },
          pb: { xs: 8, sm: 12 },
        }}
      >
        <Stack spacing={2} useFlexGap sx={{ width: { xs: "100%", sm: "70%" } }}>
          <Typography
            variant="h4"
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignSelf: "center",
              textAlign: "center",
              fontSize: "clamp(1rem, 10vw, 1.5rem)",
            }}
          >
            Do-it-yourself Learning Analytics with
          </Typography>
          <Typography
            variant="h1"
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignSelf: "center",
              textAlign: "center",
              fontSize: "clamp(3.5rem, 10vw, 4rem)",
            }}
          >
            <Typography
              component="span"
              variant="h1"
              sx={{
                fontSize: "clamp(3rem, 10vw, 4rem)",
                color: (theme) =>
                  theme.palette.mode === "light"
                    ? "primary.main"
                    : "primary.light",
              }}
            >
              Open Learning Analytics Platform
            </Typography>
          </Typography>

          <Typography textAlign="center" color="textSecondary">
            A scalable, transparent, and interactive platform for self-service
            learning analytics. <br />
            Follows a human-centered learning analytics approach by empowering
            stakeholders (e.g., teachers, students, researchers, institutions)
            to take control of the learning analytics indicator design and
            implementation process, using no-code-environments, namely the{" "}
            <Link
              underline="hover"
              sx={{ cursor: "pointer" }}
              onClick={() => scrollToSection(navigationIds.FEATURE)}
            >
              Indicator Specification Card (ISC) Creator
            </Link>{" "}
            and the{" "}
            <Link
              underline="hover"
              sx={{ cursor: "pointer" }}
              onClick={() => scrollToSection(navigationIds.FEATURE)}
            >
              Indicator Editor
            </Link>
            .
          </Typography>
        </Stack>
        <Grid
          container
          sx={{ pt: 3, pb: 5, width: { xs: "100%", sm: "70%" } }}
          justifyContent="space-around"
        >
          <Box
            component="img"
            sx={{ height: 48, display: { xs: "none", md: "flex" } }}
            src={OpenLAPFull}
            alt="Soco logo"
          />
          <Button
            variant="contained"
            size="large"
            endIcon={<RocketLaunchIcon />}
            onClick={() => navigate("/register")}
          >
            Try it now
          </Button>
          <Box
            component="img"
            sx={{ height: 48, display: { xs: "none", md: "flex" } }}
            src={LAY}
            alt="LAY logo"
          />
        </Grid>
        <Box
          id="image"
          sx={(theme) => ({
            alignSelf: "center",
            height: { xs: 200, sm: 700 },
            width: "100%",
            backgroundImage:
              theme.palette.mode === "light"
                ? `url(${HeroLight})`
                : `url(${HeroDark})`,
            backgroundSize: "cover",
            borderRadius: "10px",
            outline: "1px solid",
            outlineColor:
              theme.palette.mode === "light"
                ? alpha("#BFCCD9", 0.5)
                : alpha("#9CCCFC", 0.1),
            boxShadow:
              theme.palette.mode === "light"
                ? `0 0 12px 8px ${alpha("#9CCCFC", 0.2)}`
                : `0 0 24px 12px ${alpha("#033363", 0.2)}`,
          })}
        />
      </Container>
    </Box>
  );
}
