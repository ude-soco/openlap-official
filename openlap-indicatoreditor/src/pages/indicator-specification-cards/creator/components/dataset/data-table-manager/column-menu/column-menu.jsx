import React, { useContext, useState } from "react";
import {
  Divider,
  List,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { isNullOrEmpty } from "../../../../../../isc-creator/creator/data/utils/functions.js";
import { ISCContext } from "../../../../indicator-specification-card.jsx";
import RenameMenuAndDialog from "./components/rename-menu-and-dialog.jsx";
import DeleteMenuAndDialog from "./components/delete-menu-and-dialog.jsx";

const ColumnMenu = ({ props }) => {
  const { dataset } = useContext(ISCContext);
  const foundNullEmpty = [...dataset.rows].every((row) =>
    isNullOrEmpty(row[props.colDef.field]),
  );
  const [columnMenu, setColumnMenu] = useState({
    columnRename: false,
    columnDelete: false,
  });

  return (
    <>
      <Stack py={0.5}>
        {/* TODO: Make the rename and add row functionalities */}
        <List
          sx={{ width: "100%", mb: -1 }}
          subheader={
            <ListSubheader>
              Column type: {props.colDef.dataType.value}
            </ListSubheader>
          }
        />
        <Tooltip
          arrow
          placement="right"
          title={
            <Typography variant="body2" sx={{ p: 1 }}>
              {!foundNullEmpty
                ? "Cannot change column type because the column has values. Please delete all the values in this column and try again."
                : "Change column type"}
            </Typography>
          }
        >
          <span>
            <MenuItem
              sx={{ py: 1 }}
              disabled={!foundNullEmpty}
              // onClick={() => {
              //   handleOpenChangeColumnType(props.colDef);
              //   toggleEditPanel("", false);
              // }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Change column type" />
            </MenuItem>
          </span>
        </Tooltip>

        <RenameMenuAndDialog
          props={props}
          columnMenu={columnMenu}
          setColumnMenu={setColumnMenu}
        />
        <Divider />
        <DeleteMenuAndDialog
          props={props}
          columnMenu={columnMenu}
          setColumnMenu={setColumnMenu}
        />
      </Stack>
    </>
  );
};

export default ColumnMenu;
