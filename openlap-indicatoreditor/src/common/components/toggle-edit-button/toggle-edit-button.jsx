import PropTypes from "prop-types";
import { Button, IconButton, Grid, Tooltip, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export function ToggleEditButton({ openPanel, togglePanel, controls }) {
  return (
    <Grid size="auto">
      <Button
        onClick={togglePanel}
        aria-expanded={Boolean(openPanel)}
        aria-controls={controls}
      >
        {openPanel ? "Close" : "Open"}
      </Button>
    </Grid>
  );
}

export function ToggleEditIconButton({ openPanel, togglePanel }) {
  return (
    <Tooltip
      arrow
      title={<Typography>{openPanel ? "Close" : "Edit"}</Typography>}
    >
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

ToggleEditButton.propTypes = {
  openPanel: PropTypes.bool,
  togglePanel: PropTypes.func,
  controls: PropTypes.string,
};

ToggleEditIconButton.propTypes = {
  openPanel: PropTypes.bool,
  togglePanel: PropTypes.func,
};
