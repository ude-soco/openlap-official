import { useContext, useState } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
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
    setState(() => ({ ...state, [name]: value }));
  };

  const handleConfirm = async () => {
    const response = await requestCreateLRSProvider(
      api,
      state.title,
      state.uniqueIdentifierType
    );
    toggleOpen(true, response.message);
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
          <Grid container direction="column" spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              name="title"
              label="LRS name"
              placeholder="Name your LRS"
              onChange={handleLrsDetails}
            />
            <FormControl fullWidth>
              <InputLabel>Unique Identifier Type</InputLabel>
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
        </DialogContent>
        <DialogActions>
          <Button fullWidth onClick={toggleOpen}>
            Cancel
          </Button>
          <Button
            fullWidth
            autoFocus
            onClick={handleConfirm}
            variant="contained"
            disabled={!Boolean(state.title.length)}
          >
            Create LRS
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddLrsProvider;
