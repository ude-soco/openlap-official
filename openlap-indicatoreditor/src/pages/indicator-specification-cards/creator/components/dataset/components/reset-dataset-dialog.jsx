import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";

// Dataset reset confirmation (Phase 4E follow-up).
//
// Dedicated to Step 4 so the copy/hierarchy match the Dataset Builder; the
// shared DeleteDialog is left untouched for its other consumers. Presentation
// only — the actual reset (clearing rows/columns/requirements.data) lives in the
// caller's onConfirm handler and is unchanged.
const ResetDatasetDialog = ({ open, onCancel, onConfirm }) => (
  <Dialog
    open={Boolean(open)}
    onClose={onCancel}
    aria-labelledby="reset-dataset-title"
    aria-describedby="reset-dataset-description"
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle id="reset-dataset-title">Reset dataset?</DialogTitle>
    <DialogContent>
      <DialogContentText id="reset-dataset-description" component="div">
        <Typography gutterBottom>
          This will remove all rows and dataset columns for this indicator. Your
          previous data cannot be restored.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your requirements in Step 1 may also be affected if columns are
          removed.
        </Typography>
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} variant="outlined" color="primary" fullWidth>
        Cancel
      </Button>
      <Button onClick={onConfirm} variant="contained" color="error" fullWidth>
        Reset dataset
      </Button>
    </DialogActions>
  </Dialog>
);

ResetDatasetDialog.propTypes = {
  open: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ResetDatasetDialog;
