import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { ISCContext } from "../../../isc-context.js";
import { ClearAll as ClearAllIcon } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import Footer from "./components/footer.jsx";
import NoRowsOverlay from "./components/no-rows-overlay.jsx";
import ColumnMenu from "./column-menu/column-menu.jsx";
import DatasetToolbar from "./components/dataset-toolbar.jsx";
import { decorateColumns } from "./components/dataset-grid-columns.jsx";
import ExampleDatasetOnboarding from "./components/example-dataset-onboarding.jsx";
import { isExampleDatasetActive } from "../utils/example-dataset.js";
import { createBlankRows, INITIAL_MANUAL_ROWS } from "../utils/dataset-rows.js";
import { generatePrototypeRows } from "../utils/generated-dataset.js";

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

  // "Generate dataset": an explicit user action that turns the generated rows
  // into REAL editable data (replacing the pristine auto-seeded placeholders).
  // From this point they autosave/save/edit/delete exactly like typed data.
  const handleGenerate = () => {
    setDataset((p) => ({
      ...p,
      rows: generatePrototypeRows(p.columns),
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
      height: state.gridHeight,
      "& .MuiDataGrid-columnHeaders": {
        cursor: "pointer",
      },
      // Clearer row affordances: hover highlight + emphasized cell being edited.
      "& .MuiDataGrid-row:hover": {
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
      },
      "& .MuiDataGrid-cell:hover": {
        color: "primary.main",
      },
      "& .MuiDataGrid-cell--editing": {
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
      },
    },
  };

  // Display-only decoration: styled headers (name + subtle type) and an
  // "Enter value…" placeholder for empty cells. Does not touch dataset.columns.
  const displayColumns = useMemo(
    () => decorateColumns(dataset.columns),
    [dataset.columns]
  );

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

  if (exampleActive) {
    return (
      <ExampleDatasetOnboarding
        columns={dataset.columns}
        onGenerate={handleGenerate}
        onStartEmpty={handleStartEmpty}
      />
    );
  }

  return (
    <>
      <DatasetToolbar />
      <DataGrid
        columns={displayColumns}
        rows={paginatedRows}
        apiRef={apiRef}
        columnMenuClearIcon={<ClearAllIcon />}
        cellModesModel={state.cellModesModel}
        checkboxSelection
        disableRowSelectionOnClick={true}
        disableColumnMenu={false}
        columnHeaderHeight={58}
        onColumnHeaderClick={(params) => handleColumnHeaderClick(params)}
        onCellModesModelChange={handleCellModesModelChange}
        onCellClick={handleCellClick}
        onRowSelectionModelChange={(newSelectionModel) =>
          handleRowSelectionModelChange(newSelectionModel)
        }
        pageSizeOptions={[5, 10, 25]}
        processRowUpdate={handleProcessRowUpdate}
        rowHeight={44}
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
    </>
  );
};

export default DataTableManager;
