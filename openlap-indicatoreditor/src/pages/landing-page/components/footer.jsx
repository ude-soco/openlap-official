import {
  Box,
  Container,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import SocoLogo from "../../../assets/home/soco-logo.svg";
import { navigationItems, socialItems } from "../utils/navigation-data";
import { scrollToSection } from "../../../common/utils/scroll-to-section";
import Reveal from "./shared/reveal";

const openLapLogoStyle = { width: "130px", height: "auto" };
const socoLogoStyle = { width: "120px", height: "auto" };

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary">
      {"Copyright © "}
      <Link
        href="https://www.uni-due.de/soco/"
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
      >
        Social Computing Group
      </Link>
      &nbsp;{new Date().getFullYear()}
    </Typography>
  );
}

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Reveal>
          <Grid container spacing={{ xs: 5, md: 4 }}>
            {/* OpenLAP identity */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={2} sx={{ maxWidth: 360 }}>
                <Box
                  component="img"
                  src={OpenLAPLogo}
                  style={openLapLogoStyle}
                  alt="logo of OpenLAP"
                />
                <Typography variant="body2" color="text.secondary">
                  Do-it-yourself learning analytics — design and implement your
                  own indicators without writing code.
                </Typography>
              </Stack>
            </Grid>

            {/* Social Computing Group / university context */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Stack spacing={2}>
                <Box
                  component="img"
                  src={SocoLogo}
                  style={socoLogoStyle}
                  alt="Logo of Social Computing Group"
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Social Computing Group
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Faculty of Computer Science
                    <br />
                    University of Duisburg-Essen
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <CallIcon color="primary" fontSize="small" />
                    <Typography variant="body2">+49 (0) 203 379-3707</Typography>
                  </Stack>
                  <Stack direction="row" gap={1} alignItems="center">
                    <EmailIcon color="primary" fontSize="small" />
                    <Typography variant="body2">socogroup.ude@gmail.com</Typography>
                  </Stack>
                  <Stack direction="row" gap={1} alignItems="flex-start">
                    <LocationOnIcon color="primary" fontSize="small" />
                    <Typography variant="body2">
                      Forsthausweg 2, 47057 Duisburg
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Grid>

            {/* Navigation */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Explore
                </Typography>
                {navigationItems.map((item) => (
                  <Typography
                    key={item.id}
                    variant="body2"
                    role="button"
                    tabIndex={0}
                    color="text.secondary"
                    onClick={() => scrollToSection(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        scrollToSection(item.id);
                      }
                    }}
                    sx={{
                      width: "fit-content",
                      "&:hover, &:focus-visible": {
                        color: "primary.main",
                        cursor: "pointer",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {item.name}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Reveal>
      </Container>

      <Divider />

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          <Copyright />
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            sx={{ color: "primary.main" }}
          >
            {socialItems.map((item) => (
              <IconButton
                key={item.id}
                color="inherit"
                aria-label={`OpenLAP on ${item.name}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {<item.icon />}
              </IconButton>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
