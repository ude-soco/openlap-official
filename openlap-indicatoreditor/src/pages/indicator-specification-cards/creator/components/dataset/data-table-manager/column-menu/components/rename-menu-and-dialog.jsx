import { useContext, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import { ISCContext } from "../../../../../indicator-specification-card.jsx";
import { useGridApiContext } from "@mui/x-data-grid";

const RenameMenuAndDialog = ({ props, columnMenu, setColumnMenu }) => {
  const { colDef } = props;
  const { dataset, setDataset, setRequirements } = useContext(ISCContext);
  const apiRef = useGridApiContext();

  const [column, setColumn] = useState({
    value: colDef.headerName,
    status: {
      exists: false,
      message: "",
    },
  });

  const handleToggleColumnRenameDialog = () => {
    setColumnMenu((prevState) => ({
      ...prevState,
      columnRename: !prevState.columnRename,
    }));
  };

  const handleRenameHeader = (event) => {
    const { value } = event.target;
    setColumn((prevState) => ({
      ...prevState,
      value: value,
    }));
    if (
      dataset.columns.find(
        (col) => col.headerName.toLowerCase() === value.toLowerCase()
      )
    ) {
      if (value.toLowerCase() !== colDef.headerName.toLowerCase()) {
        setColumn((prevState) => ({
          ...prevState,
          status: {
            ...prevState.status,
            exists: true,
            message: "Column name already exists",
          },
        }));
      } else {
        setColumn((prevState) => ({
          ...prevState,
          status: {
            ...prevState.status,
            exists: false,
            message: "",
          },
        }));
      }
    } else {
      setColumn((prevState) => ({
        ...prevState,
        status: {
          ...prevState.status,
          exists: false,
          message: "",
        },
      }));
    }
  };

  const handleConfirmRenameColumn = (e) => {
    e.preventDefault();
    apiRef.current.hideColumnMenu();

    if (column.value && !column.status.exists) {
      // 1. Update dataset.columns
      const updatedCols = dataset.columns.map((c) =>
        c.field === colDef.field ? { ...c, headerName: column.value } : c
      );
      setDataset((p) => ({ ...p, columns: updatedCols }));

      // 2. Update requirements.data
      setRequirements((prev) => {
        const updatedData = prev.data.map((item) =>
          item.value === colDef.headerName
            ? { ...item, value: column.value }
            : item
        );
        return { ...prev, data: updatedData };
      });

      handleToggleColumnRenameDialog();
    }
  };
  // const handleConfirmRenameColumn = (event) => {
  //   event.preventDefault();
  //   apiRef.current.hideColumnMenu();
  //   if (column.value !== "") {
  //     let tempColumnData = colDef;
  //     tempColumnData.headerName = column.value;
  //     let columnData = dataset.columns.map((col) => {
  //       if (col.field === tempColumnData.field) {
  //         col.headerName = tempColumnData.headerName;
  //       }
  //       return col;
  //     });
  //     setDataset((prevState) => ({
  //       ...prevState,
  //       columns: columnData,
  //     }));
  //     handleToggleColumnRenameDialog();
  //   }
  // };

  return (
    <>
      <MenuItem onClick={handleToggleColumnRenameDialog}>
        <ListItemIcon>
          <DriveFileRenameOutlineIcon fontSize="small" color="primary" />
        </ListItemIcon>
        <ListItemText primary="Rename column" />
      </MenuItem>

      <Dialog open={columnMenu.columnRename} fullWidth maxWidth="xs">
        <DialogTitle>Rename column</DialogTitle>

        <DialogContent>
          <Typography sx={{ pb: 2, mt: -3 }}>
            How would you like to rename the column?
          </Typography>
          <TextField
            autoFocus
            error={column.status.exists}
            helperText={column.status.message}
            fullWidth
            label="Column name"
            value={column.value}
            InputLabelProps={{
              shrink: true,
            }}
            onChange={(event) => handleRenameHeader(event)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            color="primary"
            onClick={handleToggleColumnRenameDialog}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            disabled={column.value === "" || column.status.exists}
            onClick={handleConfirmRenameColumn}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RenameMenuAndDialog;
