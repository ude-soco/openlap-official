import { useContext, useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Alert } from "@mui/material";
import { BasicContext } from "../../../basic-indicator";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";

const AnalyzedDataTable = () => {
  const {
    analysis: { analyzedData },
  } = useContext(BasicContext);
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Rows per page
  const [state, setState] = useState({
    tipAnchor: false,
    showSelections: true,
    tipDescription: `
              <b>Tip!</b><br/>
              To be decided!
          `,
  });

  const handleTipAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const columns = Object.keys(analyzedData).map((key) => ({
    title: analyzedData[key].configurationData.title,
    data: analyzedData[key].data,
  }));

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
    <Grid container spacing={1}>
      <Grid size={{ xs: 12 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Typography>Preview data</Typography>
          <TipPopover
            tipAnchor={state.tipAnchor}
            toggleTipAnchor={handleTipAnchor}
            description={state.tipDescription}
          />
        </Grid>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column, index) => (
                  <TableCell key={index}>
                    <b>{column.title}</b>
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
            The columns selected cannot be merged as they don’t share common
            data between the chosen indicators. Consider selecting columns with
            shared data.
          </Alert>
        </Grid>
      )}
    </Grid>
  );
};

export default AnalyzedDataTable;
