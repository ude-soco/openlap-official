import { useContext, useState } from "react";
import {
  Alert,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../basic-indicator";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";
import { DataTypes } from "../../../../../../indicator-specification-cards/creator/utils/data/config";

const AnalyzedDataTable = () => {
  const {
    analysis: { analyzedData },
  } = useContext(BasicContext);
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Rows per page

  const formatTypeName = (type) => {
    if (type === "Text") return "Categorical";
    if (type === "Numeric") return "Numerical";
    return type;
  };

  const columns = Object.keys(analyzedData).map((key) => ({
    title: `${analyzedData[key].configurationData.title} (${formatTypeName(
      analyzedData[key].configurationData.type
    )})`,
    data: analyzedData[key].data,
    type: formatTypeName(analyzedData[key].configurationData.type),
  }));

  const handleTooltipDescription = (type) => {
    return `What is <b>${type}</b> data type?<br/>
    ${DataTypes[type.toLowerCase()].description}`;
  };

  const numRows = columns[0].data.length;

  // Calculate the rows to display based on the current page and rows per page
  const displayedRows = [...Array(numRows).keys()].slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };

  return (
    <Grid container>
      <Grid size={{ xs: 12 }}>
        <Grid container alignItems="center">
          <Typography>Preview data</Typography>
          <Grid size="auto">
            <CustomTooltip
              type="description"
              message={`View a sample of the data based on the selected method, inputs and parameters.<br/>
                Each column can either be of type Categorical or Numerical
                `}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column, index) => (
                  <TableCell key={index}>
                    <Grid container alignItems="center">
                      <b>{column.title}</b>
                      <CustomTooltip
                        type="description"
                        message={handleTooltipDescription(column.type)}
                      />
                    </Grid>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedRows.map((rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>
                      {column.data[rowIndex]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={numRows}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Grid>
      {/* // ! TODO: This error is generic and has issues! */}
      {numRows === 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="warning">
            There are not enough data to perform the analysis. Please change the
            filters.
          </Alert>
        </Grid>
      )}
    </Grid>
  );
};

export default AnalyzedDataTable;
