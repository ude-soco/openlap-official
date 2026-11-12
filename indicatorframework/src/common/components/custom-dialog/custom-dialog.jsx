import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useState } from "react";

const dialogConfig = {
  confirm: {
    label: "Confirm",
    title: "Please Confirm",
    color: "primary",
  },
  delete: {
    label: "Confirm delete",
    title: "Are you sure?",
    color: "error",
  },
};

const CustomDialog = ({
  type = "confirm",
  content,
  open,
  toggleOpen,
  handler,
}) => {
  const [state, setState] = useState({ loading: false });
  const config = dialogConfig[type] || dialogConfig.confirm;
  const handleClose = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      await handler();
      toggleOpen();
    } finally {
      setState((p) => ({ ...p, loading: false }));
    }
  };

  return (
    <>
      <Dialog open={Boolean(open)} fullWidth maxWidth="sm">
        <DialogTitle>{config.title}</DialogTitle>
        <DialogContent>
          <DialogContentText dangerouslySetInnerHTML={{ __html: content }} />
        </DialogContent>
        <DialogActions>
          <Button fullWidth onClick={toggleOpen}>
            Cancel
          </Button>
          <Button
            loading={state.loading}
            loadingPosition="start"
            loadingIndicator="Please wait..."
            onClick={handleClose}
            autoFocus
            fullWidth
            variant="contained"
            color={config.color}
          >
            {!state.loading && config.label}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CustomDialog;
