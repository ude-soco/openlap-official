import { useContext, useState } from "react";
import {
  Alert,
  AlertTitle,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import { ISCContext } from "../../../../../indicator-specification-card.jsx";
import { useGridApiContext } from "@mui/x-data-grid";
import { DataTypes } from "../../../../../utils/data/config.js";

const ChangeTypeMenuAndDialog = ({ props, columnMenu, setColumnMenu }) => {
  const { colDef } = props;
  const { setRequirements } = useContext(ISCContext);
  const apiRef = useGridApiContext();
  const [state, setState] = useState({
    typeSelected: props.colDef.dataType,
  });

  const handleColumnDataTypeChangeDialog = () => {
    setColumnMenu((p) => ({ ...p, columnChangeType: !p.columnChangeType }));
  };

  const handleSelectType = (value) => {
    setState((p) => ({ ...p, typeSelected: value }));
  };

  const handleConfirmUpdateColumnType = (e) => {
    e.preventDefault();
    apiRef.current.hideColumnMenu();

    setRequirements((p) => {
      let tempData = p.data.map((item) => {
        if (item.id === colDef.field) {
          item.type = state.typeSelected;
        }
        return item;
      });
      return {
        ...p,
        data: tempData,
      };
    });

    handleColumnDataTypeChangeDialog();
  };

  return (
    <>
      <MenuItem onClick={handleColumnDataTypeChangeDialog}>
        <ListItemIcon>
          <ChangeCircleIcon fontSize="small" color="primary" />
        </ListItemIcon>
        <ListItemText primary="Change column type" />
      </MenuItem>

      <Dialog open={columnMenu.columnChangeType} fullWidth maxWidth="sm">
        <DialogTitle>Change data type</DialogTitle>

        <DialogContent>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning">
                <AlertTitle>Attention!</AlertTitle>
                Changing the type of this data will reset the data of{" "}
                <b>{props.colDef.headerName}</b> column in the <b>Dataset</b>.
                It will cause the loss of data <b>only</b> in this column! Other
                columns remain uneffected. Please proceed with caution!
              </Alert>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                options={Object.values(DataTypes)}
                fullWidth
                value={props.colDef.dataType}
                getOptionLabel={(o) => o.value}
                groupBy={() =>
                  `Current column type: ${props.colDef.dataType.value}`
                }
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
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            color="primary"
            onClick={handleColumnDataTypeChangeDialog}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={handleConfirmUpdateColumnType}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChangeTypeMenuAndDialog;
