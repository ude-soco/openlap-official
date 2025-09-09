import { IconButton, Link, Grid, Tooltip, Typography } from "@mui/material";
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
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Grid size={{ xs: 8 }}>
          <Typography variant="body2">
            {"Copyright @ "}
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
        <Grid size="auto">
          <Grid container spacing={1} alignItems="center">
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
