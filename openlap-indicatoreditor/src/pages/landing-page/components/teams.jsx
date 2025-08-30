import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import { navigationIds } from "../utils/navigation-data";
import { Avatar, IconButton, Tooltip } from "@mui/material";

import { teamItems, studentItems } from "../utils/team-data";

export default function Teams() {
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
      <Grid container spacing={10} justifyContent="center">
        {teamItems.map((item) => (
          <Grid size={{ xs: 12, sm: 4, md: 3 }} key={item.id}>
            <Grid container direction="column" alignItems="center">
              <Avatar
                src={item.image}
                sx={{ width: 148, height: 148, mb: 2 }}
              />
              <Typography variant="body2" color="textSecondary" align="center">
                {item.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                {item.title}
              </Typography>
              <Grid container spacing={1}>
                {item.social?.map((social) => (
                  <Tooltip
                    key={social.id}
                    arrow
                    title={`View ${social.name} profile`}
                  >
                    <IconButton
                      color="primary"
                      onClick={() => window.open(social.link)}
                    >
                      {React.createElement(social.icon)}
                    </IconButton>
                  </Tooltip>
                ))}
              </Grid>
            </Grid>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2} justifyContent="center">
        {studentItems.map((item) => (
          <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={item.id}>
            <Grid container direction="column" alignItems="center">
              <Avatar src={item.image} sx={{ width: 96, height: 96, mb: 2 }} />
              <Typography variant="body2" color="textSecondary" align="center">
                {item.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                {item.title}
              </Typography>
            </Grid>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
