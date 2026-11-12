import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useState } from "react";

const DeleteDialog = ({ reset, open, toggleOpen, message, handleDelete }) => {
  const [loading, setLoading] = useState(false);
  const handleClose = async () => {
    setLoading(true);
    try {
      await handleDelete();
      toggleOpen();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={Boolean(open)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button fullWidth onClick={toggleOpen}>
            Cancel
          </Button>
          <Button
            loading={loading}
            loadingPosition="start"
            loadingIndicator="Please wait..."
            onClick={handleClose}
            autoFocus
            fullWidth
            variant="contained"
            color="error"
          >
            {!loading && (reset ? "Reset" : "Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeleteDialog;
