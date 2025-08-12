import { Box, IconButton, Link, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import YouTubeIcon from "@mui/icons-material/YouTube";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useContext } from "react";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";

const Footer = () => {
  const { darkMode } = useContext(CustomThemeContext);
  return (
    <>
      <Grid
        container
        sx={{ p: 2 }}
        justifyContent="space-between"
        alignItems="center"
      >
        <Grid item xs sx={{ zIndex: 1 }}>
          <Typography variant="body2">
            {" Copyright @ "}
            <Link
              color="inherit"
              href="https://www.uni-due.de/soco"
              target="_blank"
            >
              Social Computing Group
            </Link>{" "}
            {new Date().getFullYear()}
            {"."}
          </Typography>
        </Grid>
        <Grid item>
          <Grid container alignItems="center">
            <Typography sx={{ mr: 1 }} variant="body2">
              Follow us
            </Typography>
            <Tooltip title="Visit our YouTube channel">
              <IconButton
                sx={{ color: "red" }}
                onClick={() =>
                  window.open(
                    "https://www.youtube.com/channel/UCQV36Dfq-mfmAG0SqrQ_QbA"
                  )
                }
              >
                <YouTubeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Visit our GitHub">
              <IconButton
                sx={{ color: darkMode ? "white" : "black" }}
                onClick={() => window.open("https://github.com/ude-soco")}
              >
                <GitHubIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default Footer;
