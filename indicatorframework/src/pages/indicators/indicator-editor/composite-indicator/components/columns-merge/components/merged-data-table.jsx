import { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  Grid,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";

const MergedDataTable = ({
  indicatorsToAnalyze,
  columnToMerge,
  analyzedData,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Extract data to use in rows
  const mergedColumnData = analyzedData[columnToMerge.id]?.data || [];
  const itemNames =
    Array.isArray(mergedColumnData) && mergedColumnData.length > 0
      ? mergedColumnData
      : [];

  // Handle change of page
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle change of rows per page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate the data to be displayed on the current page
  const currentRows = itemNames.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Grid container spacing={1}>
      <Typography>Preview data</Typography>
      <Grid size={{ xs: 12 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {Object.entries(analyzedData).length > 0 && (
                  <>
                    <TableCell>{columnToMerge.title}</TableCell>
                    {Object.entries(analyzedData).map(([key, value]) => {
                      if (key !== columnToMerge.id) {
                        let title = value.configurationData.title;
                        return value.data.map((_, index) => {
                          return (
                            <TableCell key={`${key}-${index}`}>
                              <Typography
                                variant="caption"
                                sx={{ fontStyle: "italic" }}
                              >
                                {indicatorsToAnalyze.indicators[index].name}
                              </Typography>
                              <Typography variant="body2">{title}</Typography>
                            </TableCell>
                          );
                        });
                      }
                      return null;
                    })}
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {currentRows.map((itemName, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell>{itemName}</TableCell>
                  {Object.entries(analyzedData).map(([key, value]) => {
                    if (key !== columnToMerge.id) {
                      return value.data.map((item, index) => (
                        <TableCell key={`${key}-${rowIndex}-${index}`}>
                          {item[rowIndex + page * rowsPerPage]}
                        </TableCell>
                      ));
                    }
                    return null;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={itemNames.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, { label: "All", value: -1 }]}
          />
        </TableContainer>
      </Grid>
    </Grid>
  );
};

export default MergedDataTable;
