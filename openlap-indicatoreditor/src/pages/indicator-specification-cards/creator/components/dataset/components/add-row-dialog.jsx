import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { ISCContext } from "../../../isc-context.js";
import { useSnackbar } from "notistack";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";
import { createBlankRows } from "../utils/dataset-rows.js";

const AddRowDialog = ({ open, toggleOpen }) => {
  const { dataset, setDataset } = useContext(ISCContext);
  const { enqueueSnackbar } = useSnackbar();

  const [state, setState] = useState({
    numberOfRows: 1,
  });

  const handleRowNumber = (event) => {
    let { value } = event.target;
    const parsedValue = value === "" ? "" : parseInt(value, 10);
    if ((!isNaN(parsedValue) && parsedValue >= 0) || value === "") {
      setState((p) => ({ ...p, numberOfRows: parsedValue }));
    }
  };

  const handleAddNewRows = () => {
    // New rows are created visually empty (see createBlankRows) so the user
    // fills in their own values rather than starting from placeholders.
    const newRows = createBlankRows(dataset.columns, state.numberOfRows);
    setDataset((p) => ({ ...p, rows: [...p.rows, ...newRows] }));
    enqueueSnackbar("New row(s) added successfully", { variant: "success" });
    toggleOpen();
  };

  return (
    <>
      <Dialog open={Boolean(open)} fullWidth maxWidth="xs">
        <DialogTitle id="alert-dialog-title">Add Rows</DialogTitle>
        <DialogContent>
          <Grid container sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Number of rows"
              value={state.numberOfRows}
              type="number"
              InputLabelProps={{ shrink: true }}
              onChange={handleRowNumber}
              variant="outlined"
            />
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={toggleOpen}
            fullWidth
            color="primary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddNewRows}
            disabled={!state.numberOfRows}
            autoFocus
            fullWidth
            variant="contained"
            color="primary"
          >
            Add Rows
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

AddRowDialog.propTypes = {
  open: PropTypes.bool,
  toggleOpen: PropTypes.func,
};

export default AddRowDialog;
