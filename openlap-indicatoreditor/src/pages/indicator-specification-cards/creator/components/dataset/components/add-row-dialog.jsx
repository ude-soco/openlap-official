import React, { useContext, useState } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
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
import { v4 as uuidv4 } from "uuid";

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
      setState((prevState) => ({
        ...prevState,
        numberOfRows: parsedValue,
      }));
    }
  };

  const handleAddNewRows = () => {
    let tempColumnData = dataset.columns;
    const newRows = Array.from({ length: state.numberOfRows }, () => {
      const newRow = { id: uuidv4() };
      tempColumnData.forEach((column) => {
        newRow[column.field] = column.type === "number" ? 0 : "";
      });
      return newRow;
    });
    setDataset((prevState) => ({
      ...prevState,
      rows: [...prevState.rows, ...newRows],
    }));
    enqueueSnackbar("New row(s) added successfully", {
      variant: "success",
    });
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
              InputLabelProps={{
                shrink: true,
              }}
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

export default AddRowDialog;
