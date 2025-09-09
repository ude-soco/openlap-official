import { useContext } from "react";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { logoItems } from "../utils/logo-data";

const logoStyle = {
  height: "70px",
  opacity: 0.7,
};

export default function LogoCollection() {
  const { darkMode } = useContext(CustomThemeContext);

  return (
    <Box sx={{ pb: 8 }}>
      <Typography component="p" align="center" color="textSecondary">
        Technologies Used
      </Typography>
      <Grid
        container
        justifyContent="center"
        sx={{ mt: 2, opacity: 0.6 }}
        spacing={3}
      >
        {logoItems
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((logo) => (
            <Stack
              direction="row"
              key={logo.id}
              alignItems="center"
              spacing={1}
            >
              <img
                src={darkMode ? logo.imageDark : logo.imageLight}
                alt={logo.name}
                style={logoStyle}
              />
              <Typography sx={{ fontWeight: "bold" }}>{logo.name}</Typography>
            </Stack>
          ))}
      </Grid>
    </Box>
  );
}
