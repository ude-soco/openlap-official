import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import { navigationIds } from "../utils/navigation-data";
import { useContext } from "react";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { Avatar, Button } from "@mui/material";
import { teamItems } from "../utils/team-data";

export default function Teams() {
  const { darkMode } = useContext(CustomThemeContext);
  return (
    <Container
      id={navigationIds.TEAM}
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 3, sm: 6 },
      }}
    >
      <Box
        sx={{
          width: { sm: "100%", md: "60%" },
          textAlign: { sm: "left", md: "center" },
        }}
      >
        <Typography component="h2" variant="h4" color="text.primary">
          Team
        </Typography>
        <Typography variant="body1" color="text.secondary">
          We are the people who make up Open Learning Analytics Platform
        </Typography>
      </Box>
      <Grid container spacing={10}>
        {teamItems.map((item) => (
          <Grid size={{ xs: 12, sm: 4, md: 3 }} key={item.id}>
            <Grid container direction="column" alignItems="center">
              <Avatar
                src={item.image}
                sx={{ width: 148, height: 148, mb: 2 }}
              />
              <Typography variant="body2" color="textSecondary">
                {item.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {item.title}
              </Typography>
            </Grid>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
