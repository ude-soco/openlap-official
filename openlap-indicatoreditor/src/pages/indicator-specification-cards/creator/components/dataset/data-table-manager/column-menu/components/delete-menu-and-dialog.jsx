import { useContext } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { ISCContext } from "../../../../../indicator-specification-card.jsx";
import { useGridApiContext } from "@mui/x-data-grid";

const DeleteMenuAndDialog = ({ props, columnMenu, setColumnMenu }) => {
  const {
    colDef: { field },
  } = props;
  const { dataset, setDataset, setRequirements } = useContext(ISCContext);
  const apiRef = useGridApiContext();

  const handleToggleColumnDeleteDialog = () => {
    setColumnMenu((p) => ({ ...p, columnDelete: !p.columnDelete }));
  };

  const handleConfirmDeleteColumn = () => {
    let index = dataset.columns.findIndex((col) => col.field === field);
    if (index !== -1) {
      let newColumnData = [
        ...dataset.columns.slice(0, index),
        ...dataset.columns.slice(index + 1),
      ];
      let newRowData = dataset.rows.map((row) => {
        let { [field]: _, ...newRow } = row;
        return newRow;
      });

      setDataset((p) => ({
        ...p,
        rows: newColumnData.length === 0 ? [] : newRowData,
        columns: newColumnData,
      }));

      setRequirements((prev) => ({
        ...prev,
        data: prev.data.filter((_, i) => i !== index),
      }));
    }
    apiRef.current.hideColumnMenu();
    handleToggleColumnDeleteDialog();
  };

  return (
    <>
      <MenuItem onClick={handleToggleColumnDeleteDialog}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText primary="Delete column" />
      </MenuItem>

      <Dialog open={columnMenu.columnDelete} fullWidth maxWidth="sm">
        <DialogTitle>Are you sure you want to delete this column?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Deleting this dataset will permanently remove all associated data
            and cannot be undone. Please consider the following before
            proceeding:
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            onClick={handleToggleColumnDeleteDialog}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteColumn}
            variant="contained"
            color="error"
            fullWidth
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeleteMenuAndDialog;
