import { useContext, useState } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { DataTypes } from "../../../utils/data/config.js";
import { v4 as uuidv4 } from "uuid";
import { useSnackbar } from "notistack";

const AddColumnDialog = ({ open, toggleOpen }) => {
  const { dataset, setRequirements } = useContext(ISCContext);
  const { enqueueSnackbar } = useSnackbar();

  const [state, setState] = useState({
    columnName: {
      value: "",
      exists: false,
    },
    typeSelected: Object.values(DataTypes)[0],
    numberOfRows: dataset.rows.length,
  });

  const handleAddColumn = (event) => {
    let { value } = event.target;
    const exists = dataset.columns.some(
      (col) => col.headerName.toLowerCase() === value.toLowerCase()
    );
    setState((p) => ({
      ...p,
      columnName: {
        value,
        exists,
      },
    }));
  };

  const handleSelectType = (value) => {
    setState((p) => ({ ...p, typeSelected: value }));
  };

  const handleRowNumber = (event) => {
    let { value } = event.target;
    const parsedValue = value === "" ? "" : parseInt(value, 10);
    if ((!isNaN(parsedValue) && parsedValue >= 0) || value === "") {
      setState((p) => ({
        ...p,
        numberOfRows: parsedValue,
      }));
    }
  };

  const handleAddNewColumn = () => {
    setState({
      columnName: { value: "", exists: false },
      typeSelected: Object.values(DataTypes)[0],
      numberOfRows: dataset.rows.length,
    });

    setRequirements((p) => ({
      ...p,
      data: [
        ...p.data,
        {
          id: uuidv4(),
          value: state.columnName.value,
          type: state.typeSelected,
          placeholder: undefined,
        },
      ],
    }));

    enqueueSnackbar("New column added successfully", {
      variant: "success",
    });
    toggleOpen();
  };

  return (
    <>
      <Dialog open={Boolean(open)} fullWidth maxWidth="xs">
        <DialogTitle id="alert-dialog-title">Add a column</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <TextField
              autoFocus
              error={state.columnName.exists}
              helperText={
                state.columnName.exists
                  ? `Column with name '${state.columnName.value}' already exists!`
                  : ""
              }
              fullWidth
              label="Column name"
              value={state.columnName.value}
              placeholder="e.g., Name of materials"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={handleAddColumn}
              variant="outlined"
              sx={{ mt: 1 }}
            />
            <Autocomplete
              options={Object.values(DataTypes)}
              fullWidth
              value={state.typeSelected}
              getOptionLabel={(option) => option.value}
              groupBy={() => "Column types"}
              renderOption={(props, option) => {
                const { key, ...restProps } = props;
                return (
                  <li {...restProps} key={key}>
                    <Grid container sx={{ py: 0.5 }}>
                      <Grid size={{ xs: 12 }}>
                        <Typography>{option.value}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontStyle: "italic" }}
                        >
                          {option.description}
                        </Typography>
                      </Grid>
                    </Grid>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select a data column type"
                />
              )}
              onChange={(event, value) => {
                if (value) handleSelectType(value);
              }}
            />
            {dataset.rows.length === 0 && (
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
            )}
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
            onClick={handleAddNewColumn}
            disabled={
              state.columnName.value.trim() === "" ||
              state.columnName.exists ||
              (dataset.rows.length === 0 && !state.numberOfRows) ||
              Object.entries(state.typeSelected).length === 0
            }
            autoFocus
            fullWidth
            variant="contained"
            color="primary"
          >
            Add column
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddColumnDialog;
