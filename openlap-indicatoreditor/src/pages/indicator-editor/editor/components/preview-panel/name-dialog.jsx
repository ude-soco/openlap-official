import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";

export default function NameDialog({
  indicator,
  setIndicator,
  open,
  toggleOpen,
  handleSaveIndicator,
}) {
  const [state, setState] = useState({
    loading: false,
  });

  const handleChangeName = (event) => {
    const { name, value } = event.target;
    setIndicator((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleCloseDialog = () => {
    toggleOpen();
  };

  const handleSave = () => {
    setState((prevState) => ({
      ...prevState,
      loading: true,
    }));
    handleSaveIndicator().then(() => {
      setState((prevState) => ({
        ...prevState,
        loading: false,
      }));
      toggleOpen();
    });
  };

  return (
    <div>
      <Dialog open={open} fullWidth maxWidth="md">
        <DialogTitle>Provide a name</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                fullWidth
                name="indicatorName"
                label="Indicator name"
                value={indicator.indicatorName}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={(event) => handleChangeName(event)}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button fullWidth color="primary" onClick={handleCloseDialog}>
            Cancel
          </Button>
          <LoadingButton
            loading={state.loading}
            loadingPosition="start"
            fullWidth
            disabled={indicator.indicatorName.length < 1}
            onClick={handleSave}
            variant="contained"
          >
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </div>
  );
}
