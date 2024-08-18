import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import {
  Add as AddIcon,
  ClearAll as ClearAllIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import {
  Button,
  ButtonGroup,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { isNullOrEmpty } from "../../../../../isc-creator/creator/data/utils/functions.js";
import ImportDialog from "../components/import-dialog.jsx";
import Footer from "./components/footer.jsx";
import NoRowsOverlay from "./components/no-rows-overlay.jsx";
import TableMenu from "./components/table-menu.jsx";

const gridHeight = 450;
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
    height: gridHeight,
  },
};

const DataTableManager = () => {
  const { dataset, setDataset } = useContext(ISCContext);
  const [state, setState] = useState({
    openCsvImport: false,
    cellModesModel: {},
    selectionModel: [],
    value: "",
    anchorEl: null,
    page: 1,
    pageSize: 5,
    gridHeight: gridHeight,
  });

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

  const handleOpenImportDataset = () => {
    setState((prevState) => ({
      ...prevState,
      openCsvImport: !prevState.openCsvImport,
    }));
  };

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
          <Grid
            container
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Grid item xs>
              <ButtonGroup variant="contained" disableElevation>
                <Button startIcon={<AddIcon />}>Column</Button>
                <Button startIcon={<AddIcon />}>Rows</Button>
              </ButtonGroup>
            </Grid>
            <Grid item>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Button onClick={handleOpenImportDataset}>Upload CSV</Button>
                </Grid>
                <Grid item>
                  <Tooltip
                    arrow
                    title={
                      <Typography variant="body2" sx={{ p: 1 }}>
                        More options
                      </Typography>
                    }
                  >
                    <IconButton
                      color="primary"
                      onClick={(event) =>
                        setState((prevState) => ({
                          ...prevState,
                          anchorEl: event.currentTarget,
                        }))
                      }
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
            </Grid>
            <ImportDialog
              open={state.openCsvImport}
              toggleOpen={handleOpenImportDataset}
            />
            <TableMenu state={state} setState={setState} />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <DataGrid
            columns={dataset.columns}
            rows={paginatedRows}
            apiRef={apiRef}
            columnMenuClearIcon={<ClearAllIcon />}
            cellModesModel={state.cellModesModel}
            checkboxSelection
            disableRowSelectionOnClick={false}
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
              columnMenu: (props) => {
                const foundNullEmpty = [...dataset.rows].every((row) =>
                  isNullOrEmpty(row[props.colDef.field]),
                );
                return (
                  <Stack py={0.5}>
                    {/* TODO: Make the rename and add row functionalities */}
                    <List
                      sx={{ width: "100%", mb: -1 }}
                      subheader={
                        <ListSubheader>
                          Column type:{" "}
                          {props.colDef.type === "string"
                            ? "Categorical"
                            : "Numerical"}
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

                    <MenuItem
                    // onClick={() => {
                    //   toggleEditPanel("", false);
                    //   handleOpenRenameColumn(props.colDef);
                    // }}
                    >
                      <ListItemIcon>
                        <EditIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Rename column" />
                    </MenuItem>
                    <Divider />
                    <MenuItem
                    // onClick={() => {
                    //   setOpenDeleteColumnModal({
                    //     columnToBeDeleted: props.colDef.field,
                    //     open: true,
                    //   });
                    //   toggleEditPanel("", false);
                    // }}
                    >
                      <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText primary="Delete column" />
                    </MenuItem>
                  </Stack>
                );
              },
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
