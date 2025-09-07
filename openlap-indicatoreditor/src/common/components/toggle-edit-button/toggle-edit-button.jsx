import { Button, Fab, IconButton, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export function ToggleEditButton({ openPanel, togglePanel }) {
  return (
    <Grid size="auto">
      <Button
        variant="outlined"
        // startIcon={openPanel ? <CloseIcon /> : <SettingsIcon />}
        onClick={togglePanel}
      >
        {openPanel ? "Close" : "Open"}
      </Button>
    </Grid>
  );
}

export function ToggleEditIconButton({ openPanel, togglePanel }) {
  return (
    <Tooltip arrow title={<Typography>{openPanel ? "Close" : "Edit"}</Typography>}>
      <Grid
        container
        spacing={0.5}
        direction="column"
        alignItems="center"
        onClick={togglePanel}
      >
        <IconButton
          size="small"
          color="primary"
          sx={{
            transform: openPanel ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <KeyboardArrowDownIcon />
        </IconButton>
      </Grid>
    </Tooltip>
  );
}
