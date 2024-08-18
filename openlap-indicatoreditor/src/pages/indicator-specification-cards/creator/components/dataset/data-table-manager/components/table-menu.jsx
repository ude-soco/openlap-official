import React, { useContext } from "react";
import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import DeleteDialog from "../../../../../../../common/components/delete-dialog/delete-dialog.jsx";
import { ISCContext } from "../../../../indicator-specification-card.jsx";

const TableMenu = ({ state, setState }) => {
  const { setDataset } = useContext(ISCContext);

  const handleToggleMenu = () => {
    setState((prevState) => ({
      ...prevState,
      anchorEl: null,
    }));
  };

  const handleOpenDeleteDialog = () => {
    setState((prevState) => ({
      ...prevState,
      deleteDialog: !prevState.deleteDialog,
    }));
  };

  const handleDeleteDataset = () => {
    setDataset((prevState) => ({
      ...prevState,
      rows: [],
      columns: [],
      file: { name: "" },
    }));
  };

  return (
    <>
      <Menu
        anchorEl={state.anchorEl}
        open={Boolean(state.anchorEl)}
        onClose={handleToggleMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleOpenDeleteDialog}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete dataset</ListItemText>
        </MenuItem>
      </Menu>
      <DeleteDialog
        open={state.deleteDialog}
        toggleOpen={handleOpenDeleteDialog}
        message={
          <>
            <Typography gutterBottom>
              Deleting this dataset will permanently remove all associated data
              and cannot be undone. Please consider the following before
              proceeding:
            </Typography>
            <Typography gutterBottom>
              <li>All data contained within this dataset will be lost.</li>
              <li>
                Any analyses or reports dependent on this dataset may be
                affected.
              </li>
              <li>
                There is no way to recover this dataset once it is deleted.
              </li>
            </Typography>
            <Typography gutterBottom>
              If you are certain about deleting this dataset, please click the
              "Delete" button below. Otherwise, click "Cancel" to keep the
              dataset intact.
            </Typography>
          </>
        }
        handleDelete={handleDeleteDataset}
      />
    </>
  );
};

export default TableMenu;
