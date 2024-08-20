import React, { useContext, useState } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import UniqueIdentifierTypes from "../utils/enums/unique-identifier-types.js";
import { requestCreateLRSProvider } from "../utils/account-manager-api.js";

const AddLrsProvider = ({ addLrsProvider, toggleOpen }) => {
  const { api } = useContext(AuthContext);
  const [state, setState] = useState({
    title: "",
    uniqueIdentifierType: UniqueIdentifierTypes["Account name"],
  });

  const handleLrsDetails = (event) => {
    const { name, value } = event.target;
    setState(() => ({
      ...state,
      [name]: value,
    }));
  };

  const handleConfirm = async () => {
    await requestCreateLRSProvider(
      api,
      state.title,
      state.uniqueIdentifierType,
    ).then((response) => {
      toggleOpen(true, response.message);
    });
  };

  return (
    <>
      <Dialog
        open={addLrsProvider.open}
        maxWidth="sm"
        fullWidth
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Create new LRS</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="title"
                label="LRS name"
                placeholder="Name your LRS"
                onChange={handleLrsDetails}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="unique-type-select-label">
                  Unique Identifier Type
                </InputLabel>
                <Select
                  labelId="unique-type-select-label"
                  name="uniqueIdentifierType"
                  value={state.uniqueIdentifierType}
                  label="Unique Identifier Type"
                  onChange={handleLrsDetails}
                >
                  {Object.entries(UniqueIdentifierTypes).map(([key, value]) => {
                    return (
                      <MenuItem key={key} value={value}>
                        {key}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Grid container spacing={1} justifyContent="space-between">
            <Grid item xs>
              <Button fullWidth onClick={toggleOpen}>
                Cancel
              </Button>
            </Grid>
            <Grid item xs>
              <Button
                fullWidth
                autoFocus
                onClick={handleConfirm}
                variant="contained"
                disabled={!Boolean(state.title.length)}
              >
                Create LRS
              </Button>
            </Grid>
          </Grid>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddLrsProvider;
