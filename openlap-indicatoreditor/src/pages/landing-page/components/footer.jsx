import React from "react";
import {
  Box,
  Container,
  Divider,
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

const logoStyle = {
  width: "150px",
  height: "auto",
};

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" mt={1}>
      {"Copyright © "}
      <Link
        sx={{ cursor: "pointer" }}
        underline="hover"
        onClick={() => window.open("https://www.uni-due.de/soco/")}
      >
        Social Computing Group
      </Link>
      &nbsp;{new Date().getFullYear()}
    </Typography>
  );
}

export default function Footer() {
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
    <>
      <Container maxWidth="lg" sx={{ py: 8, px: 4 }}>
        <Stack gap={4}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            gap={10}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Box>
              <Box
                component="img"
                src={OpenLAPLogo}
                style={logoStyle}
                alt="logo of OpenLAP"
                sx={{ pb: 2 }}
              />
              <Stack gap={2}>
                <Stack direction="row" gap={1} alignItems="center">
                  <CallIcon color="primary" />
                  <Typography>+49 (0) 203 379-3707</Typography>
                </Stack>
                <Stack direction="row" gap={1} alignItems="center">
                  <EmailIcon color="primary" />
                  <Typography>socogroup.ude@gmail.com</Typography>
                </Stack>
                <Stack direction="row" gap={1}>
                  <LocationOnIcon color="primary" />
                  <Typography>Forsthausweg 2, 47057 Duisburg</Typography>
                </Stack>
              </Stack>
            </Box>
            <Box>
              <Stack gap={1}>
                <Box
                  component="img"
                  src={SocoLogo}
                  style={logoStyle}
                  alt="Logo of Social Computing Group"
                />
                <Typography>
                  <b>Social Computing Group</b>
                </Typography>
                <Typography color="textSecondary">
                  Faculty of Computer Science
                  <br />
                  University of Duisburg-Essen
                </Typography>
              </Stack>
            </Box>
            <Stack direction="column" gap={1}>
              <Typography>
                <b>OpenLAP</b>
              </Typography>
              {navigationItems.map((item) => (
                <Typography
                  key={item.id}
                  color="text.secondary"
                  onClick={() => scrollToSection(item.id)}
                  sx={{
                    "&:hover": {
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
          </Stack>
        </Stack>
      </Container>
      <Divider />
      <Container maxWidth="lg" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between">
          <Copyright />
          <Stack
            direction="row"
            justifyContent="left"
            spacing={1}
            useFlexGap
            sx={{ color: "primary.main" }}
          >
            {socialItems.map((item) => (
              <IconButton
                key={item.id}
                color="inherit"
                href={item.link}
                target="_blank"
                sx={{ alignSelf: "center" }}
              >
                {React.createElement(item.icon)}
              </IconButton>
            ))}
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
