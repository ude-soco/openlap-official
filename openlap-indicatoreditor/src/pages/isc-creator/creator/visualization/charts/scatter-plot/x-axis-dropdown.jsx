import { useEffect, useState } from "react";
import {
  Box,
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
  ListSubheader,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Edit as EditIcon,
  Info as InfoIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from "@mui/icons-material";

export default function XAxisDropdown({
  axisLabel,
  series,
  options,
  dataState: { rowData, columnData },
  handleSetXAxisOptions,
  handleDeleteCategoricalOptions,
  handleSetCountOccurrences,
  openEditor: { open },
  handleAddRows,
  handleEditColumnData,
  handleNameColumn,
  toggleEditPanel,
}) {
  let allowedDataType = "number";
  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorElMethod, setAnchorElMethod] = useState(null);
  const [anchorElUnique, setAnchorElUnique] = useState(null);
  const [tempSelectedColumn, setTempSelectedColumn] = useState([]);
  const openMenu = Boolean(anchorEl);
  const openMenuMethod = Boolean(anchorElMethod);
  const openMenuUnique = Boolean(anchorElUnique);

  const handleOpenMenu = (e) => setAnchorEl(e.currentTarget);
  const handleOpenMethodMenu = (e) => setAnchorElMethod(e.currentTarget);
  const handleOpenUniqueMenu = (e, data) => {
    setAnchorElUnique(e.currentTarget);
    setTempSelectedColumn(data);
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
  }, [columnName]);

  // The function is trigger via the submit button in the editor panel
  const handleSubmitNewColumnData = (event) => {
    event.preventDefault();
    if ((numberOfRows !== 0 || Boolean(rowData.length)) && columnName !== "") {
      setOpenColumnModal(false);
      if (rowData.length) {
        handleAddRows(rowData.length, allowedDataType);
      } else {
        handleAddRows(numberOfRows, allowedDataType);
      }
      handleNameColumn(columnName, allowedDataType);
      setColumnName("");
      setNumberOfRows(0);
      toggleEditPanel(allowedDataType, "xaxis");
    }
  };

  // Utility function to get unique values and counts
  function getUniqueValuesAndCounts(data) {
    const counts = {};
    for (const item of data) {
      if (counts[item]) {
        counts[item] += 1;
      } else {
        counts[item] = 1;
      }
    }
    return [Object.keys(counts), Object.values(counts)];
  }

  // The function is used to select the categorical data from the list
  const handleSelectCategoricalColumnData = (columnData) => {
    setAnchorEl(null);
    setAnchorElMethod(null);
    setAnchorElUnique(null);
    let categoricalColumnName = columnData.headerName;
    let categoricalColumnDataArray = rowData.map(
      (row) => row[columnData.field],
    );
    handleSetXAxisOptions(categoricalColumnName, categoricalColumnDataArray);
  };

  // The function is used to open the dialog, where users can input the axis title and number of columns
  const handleSelectCreateNewColumnData = () => {
    setAnchorEl(null);
    setOpenColumnModal((prevState) => !prevState);
  };

  // The function is used to count the number of occurrences
  const handleSelectCountOccurrences = (columnData) => {
    setAnchorEl(null);
    setAnchorElMethod(null);
    let categoricalColumnName = columnData.headerName;
    const categoricalColumnDataArray = rowData.map(
      (row) => row[columnData.field],
    );
    let [uniqueColumnDataArray, uniqueColumnDataCountArray] =
      getUniqueValuesAndCounts(categoricalColumnDataArray);

    handleSetCountOccurrences(
      categoricalColumnName,
      uniqueColumnDataArray,
      uniqueColumnDataCountArray,
    );
  };

  const handleSelectEditColumnData = (columnData) => {
    setAnchorEl(null);
    let numericalField = columnData.field;
    let numericalColumnName = columnData.headerName;
    let numericalColumnType = allowedDataType;
    let numericalColumnDataArray = rowData.map((row) => row[columnData.field]);
    toggleEditPanel(allowedDataType);
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
          {options.xaxis?.name ? (
            <Chip
              onDelete={handleDeleteCategoricalOptions}
              label={
                <Typography variant="body2">{options.xaxis?.name}</Typography>
              }
            />
          ) : (
            <Typography variant="body2">Select data</Typography>
          )}
        </Grid>

        <IconButton
          onClick={handleOpenMenu}
          disabled={open}
          color={open ? "" : "primary"}
        >
          <KeyboardArrowDownIcon />
        </IconButton>
      </Grid>

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
        <List
          subheader={
            <ListSubheader>
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
              >
                <Grid item>Numerical title</Grid>
                <Grid item>
                  <Tooltip
                    title={
                      <Typography variant="body2" sx={{ p: 1 }}>
                        Axis titles containing numerical type data in your
                        dataset
                      </Typography>
                    }
                  >
                    <IconButton>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
            </ListSubheader>
          }
        >
          {columnData
            .filter((col) => col.type === allowedDataType)
            .map((colData, index) => {
              return (
                <ListItem key={index} disablePadding sx={{ px: 1 }}>
                  <Grid container alignItems="center" spacing={1}>
                    {/* // TODO: Edit the column data */}
                    <Grid item>
                      <Tooltip
                        title={
                          <Typography variant="body2" sx={{ p: 1 }}>
                            Edit data
                          </Typography>
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleSelectEditColumnData(colData)}
                        >
                          <EditIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                    {/* Select standard values */}
                    <Grid item xs>
                      <ListItemButton
                        disabled={Boolean(
                          series.find(
                            () => options.xaxis.name === colData.field,
                          ), // TODO: Check this whether this need update
                        )}
                        onClick={() =>
                          handleSelectCategoricalColumnData(colData)
                        }
                      >
                        <ListItemText primary={colData.field} />
                      </ListItemButton>
                    </Grid>
                    {/* Select unique value button */}
                    <Grid item>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenUniqueMenu(e, colData)}
                      >
                        <KeyboardArrowRightIcon color="primary" />
                      </IconButton>

                      <Popover
                        open={openMenuUnique}
                        anchorEl={anchorElUnique}
                        onClose={() => {
                          setAnchorEl(null);
                          setAnchorElUnique(null);
                        }}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "center",
                        }}
                      >
                        <List>
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() =>
                                handleSelectCategoricalColumnData(
                                  tempSelectedColumn,
                                )
                              }
                            >
                              <ListItemText primary="Select only unique values" />
                            </ListItemButton>
                          </ListItem>
                        </List>
                      </Popover>
                    </Grid>
                  </Grid>
                </ListItem>
              );
            })}
          <ListItem disablePadding>
            <ListItemButton
              sx={{ color: "primary.main" }}
              onClick={handleSelectCreateNewColumnData}
            >
              <Typography variant="body2">+ NEW NUMERICAL TITLE</Typography>
            </ListItemButton>
          </ListItem>
        </List>
      </Popover>

      <Dialog open={openColumnModal} fullWidth maxWidth="xs">
        <DialogTitle>Create a new numerical title</DialogTitle>
        <form onSubmit={(e) => handleSubmitNewColumnData(e)}>
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -2 }}>
              What would you like to name your axis title?
            </Typography>
            <TextField
              autoFocus
              error={columnNameExists.status}
              helperText={columnNameExists.message}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              label="Axis title"
              onChange={(e) => setColumnName(e.target.value)}
              value={columnName}
              variant="outlined"
            />

            <Typography
              color={rowData.length ? "textSecondary" : ""}
              sx={{ pt: 3, pb: 2 }}
            >
              How many rows would you like to add?
            </Typography>

            <TextField
              autoFocus={columnName !== ""}
              defaultValue={rowData.length ? rowData.length : ""}
              fullWidth
              disabled={Boolean(rowData.length)}
              id="filled-number"
              label="Number of rows"
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => setNumberOfRows(e.target.value)}
              variant="outlined"
            />
            <Grid container alignItems="center">
              <Grid item>
                <Typography variant="body2">
                  Why can't I select the number of rows here?
                </Typography>
              </Grid>
              {Boolean(rowData.length) && (
                <Grid item>
                  <Tooltip
                    arrow
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          Your existing dataset has a total of {rowData.length}{" "}
                          rows. If you would like to add more rows, please click
                          on the "Edit data" button on one of the existing axis
                          title.
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Alternatively you can scroll down and use Select data
                          to add more the number of rows.
                        </Typography>
                      </Box>
                    }
                  >
                    <IconButton>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setOpenColumnModal(false);
                setNumberOfRows(0);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                (numberOfRows === 0 && !Boolean(rowData.length)) ||
                columnName === "" ||
                columnNameExists.status
              }
              type="submit"
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
