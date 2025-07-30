import { useContext, useState } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { DataTypes } from "../../../utils/data/config.js";
import { v4 as uuidv4 } from "uuid";
import { useSnackbar } from "notistack";

const AddColumnDialog = ({ open, toggleOpen }) => {
  const { dataset, setDataset, setRequirements } = useContext(ISCContext);
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
    setState((prev) => ({
      ...prev,
      columnName: {
        value,
        exists,
      },
    }));
  };

  const handleSelectType = (value) => {
    setState((prevState) => ({
      ...prevState,
      typeSelected: value,
    }));
  };

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

  const handleAddNewColumn = () => {
    let fieldUUID = uuidv4();
    const newColumnData = [
      ...dataset.columns,
      {
        field: fieldUUID,
        headerName: state.columnName.value,
        sortable: false,
        editable: true,
        width: 200,
        type: state.typeSelected.type,
        dataType: state.typeSelected,
        align: "left",
        headerAlign: "left",
        renderHeader: () => (
          <span>
            <Typography>{state.columnName.value}</Typography>
            <Typography variant="caption">
              {state.typeSelected.value}
            </Typography>
          </span>
        ),
      },
    ];
    let newRows = [];
    if (Boolean(dataset.rows.length)) {
      newRows = dataset.rows.map((row, index) => ({
        ...row,
        [fieldUUID]:
          state.typeSelected.type === "string"
            ? `${state.columnName.value} ${index + 1}`
            : 0,
      }));
    } else {
      for (let i = 0; i < state.numberOfRows; i++) {
        newRows.push({
          id: uuidv4(),
          [fieldUUID]:
            state.typeSelected.type === "string"
              ? `${state.columnName.value} ${i + 1}`
              : 0,
        });
      }
    }

    // setState((prevState) => ({
    //   ...prevState,
    //   columnName: {
    //     ...prevState.columnName,
    //     value: "",
    //     exists: false,
    //   },
    //   typeSelected: {},
    //   numberOfRows: 0,
    // }));
    setState({
      columnName: { value: "", exists: false },
      typeSelected: Object.values(DataTypes)[0],
      numberOfRows: dataset.rows.length,
    });

    setDataset((prevState) => ({
      ...prevState,
      rows: newRows,
      columns: newColumnData,
    }));

    setRequirements((prev) => ({
      ...prev,
      data: [
        ...prev.data,
        {
          value: state.columnName.value,
          type: {
            type: state.typeSelected.type,
            value: state.typeSelected.value,
          },
          placeholder: "",
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
