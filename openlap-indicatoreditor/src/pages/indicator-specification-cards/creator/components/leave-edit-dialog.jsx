import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

// Leave-page confirmation for an in-progress EDIT draft (Phase 3). Shown when the
// user navigates away (within the creator) before publishing changes to the
// saved ISC. Calm styling; only "Discard" is destructive.
const LeaveEditDialog = ({ open, saving, onSave, onKeep, onDiscard, onCancel }) => (
  <Dialog
    open={Boolean(open)}
    onClose={onCancel}
    aria-labelledby="leave-edit-title"
    aria-describedby="leave-edit-description"
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle id="leave-edit-title">Leave editing?</DialogTitle>
    <DialogContent>
      <DialogContentText id="leave-edit-description" sx={{ mb: 1 }}>
        You have unpublished changes for this ISC.
      </DialogContentText>
      <Stack gap={1.5}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          disabled={saving}
          onClick={onSave}
        >
          <Stack>
            <Typography variant="button">Save changes</Typography>
            <Typography variant="caption">
              Update the saved ISC and remove this draft.
            </Typography>
          </Stack>
        </Button>
        <Button fullWidth variant="outlined" disabled={saving} onClick={onKeep}>
          <Stack>
            <Typography variant="button">Keep draft</Typography>
            <Typography variant="caption">
              Leave now and continue editing later from My ISCs.
            </Typography>
          </Stack>
        </Button>
        <Button
          fullWidth
          variant="text"
          color="error"
          disabled={saving}
          onClick={onDiscard}
        >
          <Stack>
            <Typography variant="button">Discard changes</Typography>
            <Typography variant="caption">
              Delete this editing draft. The saved ISC will stay unchanged.
            </Typography>
          </Stack>
        </Button>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
);

LeaveEditDialog.propTypes = {
  open: PropTypes.bool,
  saving: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
  onKeep: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default LeaveEditDialog;
