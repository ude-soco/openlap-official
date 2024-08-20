import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";

const NameDialog = ({ open, toggleOpen }) => {
  const [state, setState] = React.useState({
    indicatorName: "",
  });

  const handleChangeName = (event) => {
    const { name, value } = event.target;
    setState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleCloseDialog = () => {
    toggleOpen();
  };

  const handleSaveIndicator = () => {
    toggleOpen();
  };

  return (
    <>
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
                value={state.name}
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
          <Button
            fullWidth
            disabled={state.name === ""}
            onClick={handleSaveIndicator}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NameDialog;
