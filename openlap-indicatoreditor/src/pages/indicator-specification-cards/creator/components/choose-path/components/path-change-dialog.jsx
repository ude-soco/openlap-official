import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

// Confirmation shown before changing the workflow path when reset-worthy
// downstream (visualization/finalize) state exists. Requirements + dataset are
// preserved; only path-specific choices are cleared.
const PathChangeDialog = ({ open, onCancel, onConfirm }) => (
  <Dialog
    open={Boolean(open)}
    onClose={onCancel}
    aria-labelledby="path-change-title"
    aria-describedby="path-change-description"
    maxWidth="xs"
  >
    <DialogTitle id="path-change-title">
      Changing the workflow path will reset choices that depend on the previous
      path.
    </DialogTitle>
    <DialogContent>
      <DialogContentText id="path-change-description">
        The selected analytical task, visualization, and final chart settings
        will be cleared. Your requirements and dataset will be preserved.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} variant="outlined" color="primary" fullWidth>
        Cancel
      </Button>
      <Button onClick={onConfirm} variant="contained" color="primary" fullWidth>
        Change path
      </Button>
    </DialogActions>
  </Dialog>
);

PathChangeDialog.propTypes = {
  open: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default PathChangeDialog;
