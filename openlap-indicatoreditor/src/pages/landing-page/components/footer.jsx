import React from "react";
import {
  Box,
  Container,
  IconButton,
  Link,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
import SocoLogo from "../../../assets/home/soco-logo.svg";
import {
  navigationItems,
  socialItems,
  legalItems,
} from "../utils/navigation-data";

const logoStyle = {
  width: "140px",
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
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 4 },
        py: { xs: 8 },
        textAlign: { sm: "center", md: "left" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: { xs: "100%", sm: "40%" },
            pb: 5,
          }}
        >
          <Box sx={{ width: { xs: "100%", sm: "60%" } }}>
            <Box
              component="img"
              src={OpenLAPLogo}
              style={logoStyle}
              alt="logo of OpenLAP"
              sx={{ pb: 2 }}
            />
            <Grid container direction="column" spacing={2}>
              <Grid size="grow">
                <Grid container spacing={1} alignItems="center">
                  <CallIcon color="primary" />
                  <Typography>+49 (0) 203 379-3707</Typography>
                </Grid>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1} alignItems="center">
                  <EmailIcon color="primary" />
                  <Typography>socogroup.ude@gmail.com</Typography>
                </Grid>
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <LocationOnIcon color="primary" />
                  <Typography>Forsthausweg 2, 47057 Duisburg</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </Box>
        <Box
          sx={{
            display: { xs: "flex" },
            flexDirection: "column",
            gap: 1,
            pb: 5,
          }}
        >
          <Box
            component="img"
            src={SocoLogo}
            style={logoStyle}
            alt="Logo of Social Computing Group"
          />
          <Grid container direction="column" spacing={2}>
            <Grid size="auto">
              <Typography gutterBottom>
                <b>Social Computing Group</b>
              </Typography>
              <Typography color="textSecondary">
                Faculty of Computer Science
                <br />
                University of Duisburg-Essen
              </Typography>
            </Grid>
          </Grid>
        </Box>
        <Stack
          direction="column"
          gap={1}
          sx={{ display: { xs: "none", lg: "flex" } }}
        >
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
        {/* <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            Legal
          </Typography>
          {legalItems.map((item) => (
            <Typography
              key={item.id}
              color="textSecondary"
              onClick={() => navigate(item.link)}
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
        </Box> */}
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          pt: { xs: 4 },
          width: "100%",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <div>
          <Copyright />
        </div>
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
      </Box>
    </Container>
  );
}
