import { useState } from "react";
import { Divider, Stack } from "@mui/material";
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
      <Stack py={0.5}>
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
