import { Button, Fab, IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

export function ToggleEditButton({ openPanel, togglePanel }) {
  return (
    <Grid size="auto">
      <Button
        startIcon={openPanel ? <CloseIcon /> : <EditIcon />}
        onClick={togglePanel}
      >
        {openPanel ? "Close" : "Edit"}
      </Button>
    </Grid>
  );
}

export function ToggleEditIconButton({ openPanel, togglePanel }) {
  return (
    <Grid container spacing={0.5} direction="column" alignItems="center">
      <IconButton size="small" color="primary" onClick={togglePanel}>
        {openPanel ? <CloseIcon /> : <EditIcon />}
      </IconButton>
      <Typography variant="body2" color="primary">
        {openPanel ? "Close" : "Edit"}
      </Typography>
    </Grid>
  );
}
