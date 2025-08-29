import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";
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
    <Typography variant="body2" color="text.secondary" mt={1}>
      {"Copyright © "}
      <Link href="https://www.uni-due.de/soco/" target="_blank">
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
        gap: { xs: 4, sm: 8 },
        py: { xs: 8, sm: 10 },
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
            minWidth: { xs: "100%", sm: "60%" },
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
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Newsletter
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Subscribe to our newsletter for weekly updates and promotions.
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap>
              <TextField
                id="outlined-basic"
                hiddenLabel
                size="small"
                variant="outlined"
                fullWidth
                aria-label="Enter your email address"
                placeholder="Your email address"
                inputProps={{ autoComplete: "off" }}
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ flexShrink: 0 }}
                disabled
              >
                Subscribe
              </Button>
            </Stack>
          </Box>
        </Box>
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            Product
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
        </Box>
        <Box
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
        </Box>
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
