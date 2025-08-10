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
    } finally {
      setState((p) => ({ ...p, loading: false }));
    }
  };

  return (
    <>
      <Dialog open={Boolean(open)}>
        <DialogTitle>{config.title}</DialogTitle>
        <DialogContent>
          <DialogContentText dangerouslySetInnerHTML={{ __html: content }} />
        </DialogContent>
        <DialogActions>
          <Button fullWidth onClick={toggleOpen}>
            Cancel
          </Button>
          <LoadingButton
            loading={state.loading}
            loadingPosition="start"
            onClick={handleClose}
            autoFocus
            fullWidth
            variant="contained"
            color={config.color}
          >
            {config.label}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CustomDialog;
