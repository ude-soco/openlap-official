import React from "react";
import { navigationIds } from "../utils/navigation-data";
import {
  Avatar,
  Box,
  Typography,
  Container,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { memberItems, peopleItems } from "../utils/team-data";

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
          Meet the minds building OpenLAP and shaping the future of open and
          personalized learning analytics
        </Typography>
      </Box>
      <Grid
        container
        spacing={10}
        justifyContent="center"
        sx={{ width: "100%" }}
      >
        {memberItems.map((item) => (
          <Grid size={{ xs: 12, sm: 4, md: 3 }} key={item.id}>
            <Grid container direction="column" alignItems="center">
              <Box
                sx={{
                  position: "relative",
                  width: 148,
                  height: 148,
                  mb: 2,
                  "&:hover .overlay-member": {
                    opacity: 1,
                  },
                }}
              >
                <Avatar
                  src={item.image}
                  sx={{ width: "100%", height: "100%" }}
                />

                <Tooltip arrow title={`View ${item.name}'s profile`}>
                  <Box
                    className="overlay-member"
                    sx={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      bgcolor: "rgba(0,0,0,0.5)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.3s ease",
                    }}
                    onClick={() => window.open(item.link, "_blank")}
                  >
                    <SearchIcon fontSize="large" sx={{ color: "white" }} />
                  </Box>
                </Tooltip>
              </Box>
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
      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{ width: "100%" }}
      >
        {peopleItems
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={item.id}>
              <Grid container direction="column" alignItems="center">
                <Box
                  sx={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    mb: 2,
                    "&:hover .overlay-people": {
                      opacity: 1,
                    },
                  }}
                >
                  <Avatar
                    src={item.image}
                    sx={{ width: "100%", height: "100%" }}
                  />

                  <Tooltip arrow title={`View ${item.name}'s profile`}>
                    <Box
                      className="overlay-people"
                      sx={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        bgcolor: "rgba(0,0,0,0.5)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                      }}
                      onClick={() => window.open(item.link, "_blank")}
                    >
                      <SearchIcon sx={{ color: "white" }} />
                    </Box>
                  </Tooltip>
                </Box>

                <Typography
                  variant="body2"
                  color="textSecondary"
                  align="center"
                >
                  {item.name}
                </Typography>

                {item.title && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    align="center"
                  >
                    {item.title}
                  </Typography>
                )}
              </Grid>
            </Grid>
          ))}
      </Grid>
    </Container>
  );
}
