import { useContext, useState } from "react";
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
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import { isNullOrEmpty } from "../../../../../../isc-creator/creator/data/utils/functions.js";
import { ISCContext } from "../../../../indicator-specification-card.jsx";
import RenameMenuAndDialog from "./components/rename-menu-and-dialog.jsx";
import DeleteMenuAndDialog from "./components/delete-menu-and-dialog.jsx";
import ChangeTypeMenuAndDialog from "./components/change-type-menu-and-dialog.jsx";

const ColumnMenu = ({ props }) => {
  const { dataset } = useContext(ISCContext);
  const foundNullEmpty = [...dataset.rows].every((row) =>
    isNullOrEmpty(row[props.colDef.field])
  );
  const [columnMenu, setColumnMenu] = useState({
    columnChangeType: false,
    columnRename: false,
    columnDelete: false,
  });

  return (
    <>
      <Stack py={0.5}>
        {/* TODO: Make the rename and add row functionalities */}

        {/* <MenuItem
          sx={{ py: 1 }}
          onClick={() => {
            // handleOpenChangeColumnType(props.colDef);
            toggleEditPanel("", false);
          }}
        >
          <ListItemIcon>
            <ChangeCircleIcon fontSize="small" color="primary"/>
          </ListItemIcon>
          <ListItemText primary="Change data type" />
        </MenuItem> */}
        <ChangeTypeMenuAndDialog
          props={props}
          columnMenu={columnMenu}
          setColumnMenu={setColumnMenu}
        />

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
