import { useState } from "react";
import { Divider } from "@mui/material";
import { GridColumnMenuContainer } from "@mui/x-data-grid";
import RenameMenuAndDialog from "./components/rename-menu-and-dialog.jsx";
import DeleteMenuAndDialog from "./components/delete-menu-and-dialog.jsx";
import ChangeTypeMenuAndDialog from "./components/change-type-menu-and-dialog.jsx";

const ColumnMenu = ({ props }) => {
  const [columnMenu, setColumnMenu] = useState({
    columnChangeType: false,
    columnRename: false,
    columnDelete: false,
  });

  return (
    <>
      <GridColumnMenuContainer {...props} sx={{ py: 0.5 }}>
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
      </GridColumnMenuContainer>
    </>
  );
};

export default ColumnMenu;
