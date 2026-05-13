import { useContext } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import ModeNightRoundedIcon from "@mui/icons-material/ModeNightRounded";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";
import { IconButton, Tooltip } from "@mui/material";

function ToggleColorMode() {
  const { darkMode, toggleDarkMode } = useContext(CustomThemeContext);

  return (
    <Box sx={{ maxWidth: "32px" }}>
      <Tooltip
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        <IconButton
          color="primary"
          onClick={toggleDarkMode}
          size="small"
          aria-label="button to toggle theme"
          sx={{ minWidth: "32px", height: "32px", p: "4px" }}
        >
          {darkMode ? (
            <WbSunnyRoundedIcon fontSize="small" />
          ) : (
            <ModeNightRoundedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default ToggleColorMode;
