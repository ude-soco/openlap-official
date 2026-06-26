import { useContext } from "react";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { Box, Container, Stack, Typography } from "@mui/material";
import { logoItems } from "../data/logo-data";
import Reveal from "./shared/reveal";

export default function LogoCollection() {
  const { darkMode } = useContext(CustomThemeContext);
  const sorted = [...logoItems].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 9 } }}>
      <Reveal>
        <Typography
          variant="overline"
          component="p"
          align="center"
          sx={{ color: "text.secondary", letterSpacing: "0.12em" }}
        >
          Built with
        </Typography>
        <Stack
          direction="row"
          useFlexGap
          flexWrap="wrap"
          justifyContent="center"
          alignItems="center"
          sx={{ mt: 3, gap: { xs: 3, md: 6 } }}
        >
          {sorted.map((logo) => (
            <Stack
              key={logo.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                opacity: 0.6,
                filter: "grayscale(0.4)",
                transition: "opacity 200ms ease, filter 200ms ease",
                "&:hover": { opacity: 1, filter: "grayscale(0)" },
              }}
            >
              <Box
                component="img"
                src={darkMode ? logo.imageDark : logo.imageLight}
                alt={logo.name}
                loading="lazy"
                sx={{ height: 34 }}
              />
              <Typography sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {logo.name}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Reveal>
    </Container>
  );
}
