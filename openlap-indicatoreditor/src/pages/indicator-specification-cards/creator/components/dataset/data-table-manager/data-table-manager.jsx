import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { ClearAll as ClearAllIcon } from "@mui/icons-material";
import { Grid } from "@mui/material";
import Footer from "./components/footer.jsx";
import NoRowsOverlay from "./components/no-rows-overlay.jsx";
import ColumnMenu from "./column-menu/column-menu.jsx";
import TableHeaderBar from "./components/table-header-bar.jsx";

const DataTableManager = () => {
  const { dataset, setDataset } = useContext(ISCContext);
  const [state, setState] = useState({
    cellModesModel: {},
    selectionModel: [],
    value: "",
    anchorEl: null,
    page: 1,
    pageSize: 5,
    gridHeight: 450,
  });

  const style = {
    dataGrid: {
      "& .MuiDataGrid-columnHeaders": {
        cursor: "pointer",
        fontSize: "17px",
        textDecorationLine: "underline",
      },
      "& .MuiDataGrid-cell:hover": {
        color: "primary.main",
      },
      height: state.gridHeight,
    },
  };

  useEffect(() => {
    const calculateGridHeight = () => {
      const rowHeight = 50;
      const footerHeight = 60;
      const padding = 20;

      const numRows = state.pageSize;
      const calculatedHeight = numRows * rowHeight + footerHeight + padding;
      setState((prevState) => ({
        ...prevState,
        gridHeight: calculatedHeight,
      }));
    };
    calculateGridHeight();
  }, [state.pageSize, dataset.rows]);

  const apiRef = useGridApiRef();
  const popperRef = useRef();

  const handleCellModesModelChange = useCallback((newModel) => {
    setState((prevState) => ({
      ...prevState,
      cellModesModel: newModel,
    }));
  }, []);

  const handleCellClick = useCallback((params) => {
    setState((prevState) => ({
      ...prevState,
      cellModesModel: {
        // Revert the mode of the other cells from other rows
        ...Object.keys(prevState.cellModesModel).reduce(
          (acc, id) => ({
            ...acc,
            [id]: Object.keys(prevState.cellModesModel[id]).reduce(
              (acc2, field) => ({
                ...acc2,
                [field]: { mode: "view" },
              }),
              {},
            ),
          }),
          {},
        ),
        [params.id]: {
          // Revert the mode of other cells in the same row
          ...Object.keys(prevState.cellModesModel[params.id] || {}).reduce(
            (acc, field) => ({ ...acc, [field]: { mode: "view" } }),
            {},
          ),
          [params.field]: { mode: "edit" },
        },
      },
    }));
  }, []);

  const handleRowSelectionModelChange = (newSelectionModel) => {
    setState((prevState) => ({
      ...prevState,
      selectionModel: newSelectionModel,
    }));
  };

  const handleProcessRowUpdate = (updatedRow) => {
    // toggleEditPanel("", false);
    const rowIndex = dataset.rows.findIndex((row) => row.id === updatedRow.id);
    const updatedRows = [...dataset.rows];
    updatedRows[rowIndex] = updatedRow;
    setDataset((prevState) => ({
      ...prevState,
      rows: updatedRows,
    }));
    return updatedRow;
  };

  const handleColumnHeaderClick = (params) => {
    apiRef.current.showColumnMenu(params.field);
  };

  const handlePopperOpen = (event) => {
    const id = event.currentTarget.dataset.id;
    const row = dataset.rows.find((r) => r.id === id);
    setState((prevState) => ({
      ...prevState,
      value: row,
      anchorEl: event.currentTarget,
    }));
  };

  const handlePopperClose = (event) => {
    if (
      state.anchorEl == null ||
      popperRef.current.contains(event.nativeEvent.relatedTarget)
    ) {
      return;
    }
    setState((prevState) => ({
      ...prevState,
      anchorEl: null,
    }));
  };

  const paginatedRows = dataset.rows.slice(
    (state.page - 1) * state.pageSize,
    state.page * state.pageSize,
  );

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TableHeaderBar />
        </Grid>
        <Grid item xs={12}>
          <DataGrid
            columns={dataset.columns}
            rows={paginatedRows}
            apiRef={apiRef}
            columnMenuClearIcon={<ClearAllIcon />}
            cellModesModel={state.cellModesModel}
            checkboxSelection
            disableRowSelectionOnClick={true}
            disableColumnMenu={false}
            onColumnHeaderClick={(params) => handleColumnHeaderClick(params)}
            onCellModesModelChange={handleCellModesModelChange}
            onCellClick={handleCellClick}
            onRowSelectionModelChange={(newSelectionModel) =>
              handleRowSelectionModelChange(newSelectionModel)
            }
            pageSizeOptions={[5, 10, 25]}
            processRowUpdate={handleProcessRowUpdate}
            rowHeight={40}
            selectionModel={state.selectionModel}
            showCellVerticalBorder
            showFooterRowCount
            showFooterSelectedRowCount
            slots={{
              noRowsOverlay: () => <NoRowsOverlay />,
              columnMenu: (props) => <ColumnMenu props={props} />,
              footer: () => <Footer state={state} setState={setState} />,
            }}
            sx={style.dataGrid}
            componentsProps={{
              row: {
                onMouseEnter: handlePopperOpen,
                onMouseLeave: handlePopperClose,
              },
            }}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default DataTableManager;
