import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { ISCContext } from "../../../isc-context.js";
import { ClearAll as ClearAllIcon } from "@mui/icons-material";
import { Grid } from "@mui/material";
import Footer from "./components/footer.jsx";
import NoRowsOverlay from "./components/no-rows-overlay.jsx";
import ColumnMenu from "./column-menu/column-menu.jsx";
import TableSideBar from "./components/table-side-bar.jsx";
import ExampleDatasetOnboarding from "./components/example-dataset-onboarding.jsx";
import { isExampleDatasetActive } from "../utils/example-dataset.js";
import { createBlankRows, INITIAL_MANUAL_ROWS } from "../utils/dataset-rows.js";

const DataTableManager = () => {
  const { dataset, setDataset, id } = useContext(ISCContext);

  // Example Mode replaces the editable grid with a read-only illustrative table
  // while the dataset is still a pristine auto-seeded draft. Read-only decision:
  // it never alters dataset/state.
  const exampleActive = isExampleDatasetActive({
    dataset,
    isExistingIsc: Boolean(id),
  });

  // "Start with an empty table": replace the pristine auto-seeded placeholder
  // rows with genuinely empty rows and drop straight into the editable grid
  // (this exits Example Mode, since the rows are no longer all-default). Uses
  // the existing setDataset rows path — no persistence/shape change.
  const handleStartEmpty = () => {
    setDataset((p) => ({
      ...p,
      rows: createBlankRows(p.columns, INITIAL_MANUAL_ROWS),
    }));
  };
  const [state, setState] = useState({
    cellModesModel: {},
    selectionModel: [],
    value: "",
    anchorEl: null,
    page: 1,
    pageSize: 10,
    gridHeight: 450,
  });

  const style = {
    dataGrid: {
      "& .MuiDataGrid-columnHeaders": {
        cursor: "pointer",
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
      setState((p) => ({ ...p, gridHeight: calculatedHeight }));
    };
    calculateGridHeight();
  }, [state.pageSize, dataset.rows]);

  const apiRef = useGridApiRef();
  const popperRef = useRef();

  const handleCellModesModelChange = useCallback((newModel) => {
    setState((p) => ({ ...p, cellModesModel: newModel }));
  }, []);

  const handleCellClick = useCallback((params) => {
    setState((p) => ({
      ...p,
      cellModesModel: {
        // Revert the mode of the other cells from other rows
        ...Object.keys(p.cellModesModel).reduce(
          (acc, id) => ({
            ...acc,
            [id]: Object.keys(p.cellModesModel[id]).reduce(
              (acc2, field) => ({
                ...acc2,
                [field]: { mode: "view" },
              }),
              {}
            ),
          }),
          {}
        ),
        [params.id]: {
          // Revert the mode of other cells in the same row
          ...Object.keys(p.cellModesModel[params.id] || {}).reduce(
            (acc, field) => ({ ...acc, [field]: { mode: "view" } }),
            {}
          ),
          [params.field]: { mode: "edit" },
        },
      },
    }));
  }, []);

  const handleRowSelectionModelChange = (newSelectionModel) => {
    setState((p) => ({ ...p, selectionModel: newSelectionModel }));
  };

  const handleProcessRowUpdate = (updatedRow) => {
    // toggleEditPanel("", false);
    const rowIndex = dataset.rows.findIndex((row) => row.id === updatedRow.id);
    const updatedRows = [...dataset.rows];
    updatedRows[rowIndex] = updatedRow;
    setDataset((p) => ({ ...p, rows: updatedRows }));
    return updatedRow;
  };

  const handleColumnHeaderClick = (params) => {
    apiRef.current.showColumnMenu(params.field);
  };

  const handlePopperOpen = (event) => {
    const id = event.currentTarget.dataset.id;
    const row = dataset.rows.find((r) => r.id === id);
    setState((p) => ({ ...p, value: row, anchorEl: event.currentTarget }));
  };

  const handlePopperClose = (event) => {
    if (
      state.anchorEl == null ||
      popperRef.current.contains(event.nativeEvent.relatedTarget)
    ) {
      return;
    }
    setState((p) => ({ ...p, anchorEl: null }));
  };

  const paginatedRows = dataset.rows.slice(
    (state.page - 1) * state.pageSize,
    state.page * state.pageSize
  );

  return (
    <>
      <Grid container spacing={2}>
        <Grid size="auto">
          <TableSideBar />
        </Grid>
        <Grid size="grow">
          {exampleActive ? (
            <ExampleDatasetOnboarding
              columns={dataset.columns}
              onStartEmpty={handleStartEmpty}
            />
          ) : (
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
          )}
        </Grid>
      </Grid>
    </>
  );
};

export default DataTableManager;
