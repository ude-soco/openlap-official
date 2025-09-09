import { useContext } from "react";
import {
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Grid,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import { ISCContext } from "../../../../indicator-specification-card.jsx";

const Footer = ({ state, setState }) => {
  const { dataset, setDataset } = useContext(ISCContext);
  const totalPages = Math.ceil(dataset.rows.length / state.pageSize);

  const handleDeleteSelectedRows = () => {
    setDataset((p) => ({
      ...p,
      rows: p.rows.filter((row) => !state.selectionModel.includes(row.id)),
    }));
    setState((p) => ({ ...p, selectionModel: [] }));
  };

  const handlePageChange = (event, newPage) => {
    setState((p) => ({ ...p, page: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    setState((p) => ({
      ...p,
      pageSize: parseInt(event.target.value, 10),
      page: 1,
    }));
  };

  return (
    <>
      <Grid container>
        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>
      </Grid>
      <Grid
        container
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        px={2}
        py={2}
      >
        <Grid size="grow">
          <Grid container spacing={1} alignItems="center">
            {state.selectionModel.length !== 0 && (
              <>
                <Typography variant="body2">
                  {state.selectionModel.length} row(s) selected
                </Typography>
                <Tooltip
                  arrow
                  title={<Typography>Delete selected rows</Typography>}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleDeleteSelectedRows}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </>
            )}
          </Grid>
        </Grid>

        <Grid size="auto">
          <Pagination
            count={totalPages}
            page={state.page}
            onChange={handlePageChange}
          />
        </Grid>
        <Grid size="auto">
          <FormControl fullWidth size="small">
            <InputLabel sx={{ ml: -0.25 }}>Show rows</InputLabel>
            <Select
              value={state.pageSize}
              label="Page size"
              onChange={handleRowsPerPageChange}
            >
              {[5, 10, 20, 50].map((size) => (
                <MenuItem key={size} value={size}>
                  {size} rows per page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
};

export default Footer;
