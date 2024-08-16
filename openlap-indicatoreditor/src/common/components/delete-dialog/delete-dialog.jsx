import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

const DeleteDialog = ({ open, toggleOpen, message, handleDelete }) => {
  const handleClose = () => {
    toggleOpen();
    handleDelete();
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
          <Button
            onClick={handleClose}
            autoFocus
            fullWidth
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeleteDialog;
