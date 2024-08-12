import { Box, Grid, IconButton, Link, Typography } from "@mui/material";
import YouTubeIcon from "@mui/icons-material/YouTube";
import GitHubIcon from "@mui/icons-material/GitHub";

const Footer = () => {
  return (
    <>
      <Grid
        container
        sx={{
          px: 2,
          py: 1,
        }}
        justifyContent="space-between"
        component={Box}
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
            <IconButton
              onClick={() =>
                window.open(
                  "https://www.youtube.com/channel/UCQV36Dfq-mfmAG0SqrQ_QbA"
                )
              }
            >
              <YouTubeIcon />
            </IconButton>
            <IconButton
              onClick={() => window.open("https://github.com/ude-soco")}
            >
              <GitHubIcon />
            </IconButton>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default Footer;
