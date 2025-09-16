import { IconButton, Link, Tooltip, Typography, Stack } from "@mui/material";
import YouTubeIcon from "@mui/icons-material/YouTube";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useContext } from "react";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";

const Footer = () => {
  const { darkMode } = useContext(CustomThemeContext);
  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        sx={{ p: 2 }}
      >
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
        <Stack direction="row" gap={1} alignItems="center">
          <Tooltip title="Visit our YouTube channel">
            <IconButton
              color="primary"
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
              color="primary"
              onClick={() => window.open("https://github.com/ude-soco")}
            >
              <GitHubIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </>
  );
};

export default Footer;
