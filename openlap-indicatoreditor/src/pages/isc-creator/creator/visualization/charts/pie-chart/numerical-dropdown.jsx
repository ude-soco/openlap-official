import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Info as InfoIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

export default function NumericalDropdown({
  axisLabel,
  series,
  options,
  dataState: { rowData, columnData },
  handleSetNumericalSeries,
  handleDeleteNumericalSeries,
  handleNameColumn,
  handleEditColumnData,
  toggleEditPanel,
}) {
  let allowedDataType = "number";
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (e) => {
    toggleEditPanel("", false);
    setAnchorEl(e.currentTarget);
  };

  const [columnName, setColumnName] = useState("");
  const [columnNameExists, setColumnNameExist] = useState({
    status: false,
    message: "",
  });
  const [numberOfRows, setNumberOfRows] = useState(0);
  const [openColumnModal, setOpenColumnModal] = useState(false);

  useEffect(() => {
    if (Boolean(columnName)) {
      if (
        columnData.find(
          (col) => col.headerName.toLowerCase() === columnName.toLowerCase(),
        )
      ) {
        setColumnNameExist({
          status: true,
          message: "Axis title already exists",
        });
      } else {
        setColumnNameExist({ status: false, message: "" });
      }
    }
  }, [columnName, options]);

  const handleSubmitNewColumnData = (event) => {
    event.preventDefault();
    if ((numberOfRows !== 0 || Boolean(rowData.length)) && columnName !== "") {
      setOpenColumnModal(false);
      let tempNumberOfRows = rowData.length ? rowData.length : numberOfRows;
      handleNameColumn(columnName, allowedDataType, tempNumberOfRows);
      setColumnName("");
      setNumberOfRows(0);
      toggleEditPanel(allowedDataType, true);
    }
  };

  const handleSelectNumericalColumnData = (columnData) => {
    setAnchorEl(null);
    let numericalColumnField = columnData.field;
    let numericalColumnName = columnData.headerName;
    const numericalColumnDataArray = rowData.map(
      (row) => row[numericalColumnField],
    );
    handleSetNumericalSeries(
      numericalColumnField,
      numericalColumnName,
      numericalColumnDataArray,
    );
  };

  const handleSelectCreateNewColumnData = () => {
    setAnchorEl(null);
    setOpenColumnModal((prevState) => !prevState);
  };

  const handleSelectEditColumnData = (columnData) => {
    setAnchorEl(null);
    let numericalField = columnData.field;
    let numericalColumnName = columnData.headerName;
    let numericalColumnType = allowedDataType;
    let numericalColumnDataArray = rowData.map((row) => row[columnData.field]);
    setTimeout(() => {
      toggleEditPanel(allowedDataType);
    }, 100);
    handleEditColumnData(
      numericalField,
      numericalColumnName,
      numericalColumnType,
      numericalColumnDataArray,
    );
  };

  return (
    <>
      <Grid container justifyContent="center" alignItems="center">
        <Grid item>
          <Grid container alignItems="center" spacing={1}>
            {Boolean(options.headerNameSeries) ? (
              <Grid item>
                {options.headerNameSeries !== "" ? (
                  <>
                    <Tooltip
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          {options.headerNameSeries}
                        </Typography>
                      }
                    >
                      <Chip
                        label={
                          <Typography variant="body2">
                            {options.headerNameSeries}
                          </Typography>
                        }
                        sx={{
                          maxWidth: "120px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      />
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ pt: 1 }}>
                      Select data
                    </Typography>
                  </>
                )}
              </Grid>
            ) : (
              <Typography variant="body2" sx={{ pt: 1 }}>
                Select data
              </Typography>
            )}
          </Grid>
        </Grid>

        <IconButton onClick={handleOpenMenu}>
          <KeyboardArrowDownIcon color="primary" />
        </IconButton>

        <Popover
          open={openMenu}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
        >
          <ListItem disablePadding sx={{ px: 2 }}>
            <ListItemText
              primary={<Typography variant="overline">{axisLabel}</Typography>}
            />
          </ListItem>
          <Divider />
          <List sx={{ minWidth: "200px" }}>
            {columnData.some((item) => item.type === allowedDataType) ? (
              <>
                {columnData
                  .filter((col) => col.type === allowedDataType)
                  .map((colData, index) => {
                    return (
                      <ListItem key={index} disablePadding sx={{ px: 1 }}>
                        <Grid container alignItems="center" spacing={1}>
                          {/* Select standard values */}
                          <Grid item xs>
                            <ListItemButton
                              // disabled={Boolean(
                              //   options.headerNameSeries === colData.headerName
                              // )}
                              onClick={() =>
                                handleSelectNumericalColumnData(colData)
                              }
                            >
                              <ListItemText primary={colData.headerName} />
                            </ListItemButton>
                          </Grid>
                        </Grid>
                        <Grid item>
                          <Tooltip
                            title={
                              <Typography variant="body2" sx={{ p: 1 }}>
                                {Boolean(
                                  options.headerNameSeries !==
                                    colData.headerName,
                                )
                                  ? `Select "${colData.headerName}" first to edit data`
                                  : "Edit data"}
                              </Typography>
                            }
                          >
                            <span>
                              <IconButton
                                color="primary"
                                disabled={Boolean(
                                  options.headerNameSeries !==
                                    colData.headerName,
                                )}
                                onClick={() =>
                                  handleSelectEditColumnData(colData)
                                }
                                size="small"
                              >
                                <SettingsIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Grid>
                      </ListItem>
                    );
                  })}
              </>
            ) : (
              <>
                <ListItem disablePadding>
                  <Grid
                    container
                    sx={{ px: 2, py: 1, width: "300px" }}
                    alignItems="center"
                  >
                    <Grid item xs>
                      <Typography>No data available </Typography>
                    </Grid>
                    <Grid item>
                      <Tooltip
                        arrow
                        title={
                          <Typography variant="body2" sx={{ p: 1 }}>
                            Create a new column of type <b>numerical</b> from
                            the data table below
                          </Typography>
                        }
                      >
                        <IconButton color="primary">
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                  {/* <Button
                fullWidth
                size="large"
                onClick={handleSelectCreateNewColumnData}
                startIcon={<AddIcon />}
              >
                CREATE NEW SLICE VALUE
              </Button> */}
                </ListItem>
              </>
            )}
          </List>
        </Popover>
      </Grid>

      <Dialog open={openColumnModal} fullWidth maxWidth="xs">
        <DialogTitle>Create a new slice value</DialogTitle>
        <form onSubmit={(e) => handleSubmitNewColumnData(e)}>
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -2 }}>
              What would you like to name your slice value?
            </Typography>
            <TextField
              autoFocus
              error={columnNameExists.status}
              helperText={columnNameExists.message}
              fullWidth
              value={columnName}
              label="Name of slice value"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => setColumnName(e.target.value)}
              variant="outlined"
            />

            <Grid container alignItems="center">
              {!Boolean(rowData.length) && (
                <>
                  <Typography
                    color={rowData.length ? "textSecondary" : ""}
                    sx={{ pt: 3, pb: 2 }}
                  >
                    How many slice values would you like to add?
                  </Typography>

                  <TextField
                    autoFocus={columnName !== ""}
                    defaultValue={rowData.length ? rowData.length : ""}
                    fullWidth
                    label="Number of slice values"
                    type="number"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(e) => setNumberOfRows(e.target.value)}
                    variant="outlined"
                  />
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              color="primary"
              onClick={() => {
                setOpenColumnModal(false);
                setNumberOfRows(0);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                (numberOfRows === 0 && !Boolean(rowData.length)) ||
                columnName === "" ||
                columnNameExists.status
              }
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
