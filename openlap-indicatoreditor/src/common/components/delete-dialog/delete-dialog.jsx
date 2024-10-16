import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { useState } from "react";

const DeleteDialog = ({ open, toggleOpen, message, handleDelete }) => {
  const [loading, setLoading] = useState(false);
  const handleClose = () => {
    // toggleOpen();
    setLoading(true);
    handleDelete().then(() => {
      toggleOpen();
      setLoading(false);
    });
  };

  return (
    <>
      <Dialog
        open={Boolean(open)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Are you sure you want to delete this indicator?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button fullWidth onClick={toggleOpen}>
            Cancel
          </Button>
          <LoadingButton
            loading={loading}
            loadingPosition="start"
            onClick={handleClose}
            autoFocus
            fullWidth
            variant="contained"
            color="error"
          >
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeleteDialog;
