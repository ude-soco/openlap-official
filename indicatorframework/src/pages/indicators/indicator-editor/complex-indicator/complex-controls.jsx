import { useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SectionCard from "../../../../common/components/section-card/section-card";
import CustomTooltip from "../../../../common/components/custom-tooltip/custom-tooltip";
import { DataTypes } from "../../../indicator-specification-cards/creator/utils/data/config";
import { datasetColumns, datasetRows, withMapping } from "./complex-model";

export function Failure({ message, retry }) {
  return message ? (
    <Alert
      severity="error"
      action={
        retry && (
          <Button color="inherit" size="small" onClick={retry}>
            Retry
          </Button>
        )
      }
    >
      {message}
    </Alert>
  ) : null;
}
Failure.propTypes = { message: PropTypes.string, retry: PropTypes.func };

export function ResultTable({ dataset, title = "Data preview", framed = true }) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(5);
  const columns = datasetColumns(dataset).sort((a, b) => {
    const order = dataset?.columnOrder || [];
    return (
      order.indexOf(a.configurationData.id) -
      order.indexOf(b.configurationData.id)
    );
  });
  const rowCount = datasetRows(dataset);
  const safePage = Math.min(page, Math.max(0, Math.ceil(rowCount / size) - 1));
  const filled = new Set(
    (dataset?.filledCells || []).map(
      (cell) => `${cell.rowIndex}:${cell.columnId}`,
    ),
  );
  const content = (
    <Stack sx={{ gap: 2, minWidth: 0 }}>
      {!framed && (
        <Typography variant="caption" color="text.secondary" role="status" aria-live="polite">
          {rowCount} rows · {columns.length} columns
        </Typography>
      )}
      {!rowCount ? (
        <Alert severity="info">
          No matching rows. Review the source filters or matching columns.
        </Alert>
      ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={(theme) => ({
              maxWidth: "100%",
              overflowX: "auto",
              borderRadius: `${theme.custom.radii.card}px`,
            })}
          >
            <Table size="small" aria-label={title}>
              <TableHead>
                <TableRow>
                  {columns.map(({ configurationData: column }) => {
                    const typeName = column.type === "Text" ? "Categorical"
                      : column.type === "Numeric" ? "Numerical" : column.type;
                    const description = DataTypes[typeName.toLowerCase()]?.description;
                    return (
                    <TableCell
                      key={column.id}
                      component="th"
                      scope="col"
                      sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                        {column.title || column.id} ({typeName})
                        {description && (
                          <CustomTooltip
                            type="description"
                            message={`What is <b>${typeName}</b> data type?<br/>${description}`}
                          />
                        )}
                      </Box>
                    </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from(
                  { length: Math.min(size, rowCount - safePage * size) },
                  (_, offset) => {
                    const index = safePage * size + offset;
                    return (
                      <TableRow key={index} hover>
                        {columns.map(({ configurationData: column, data }) => (
                          <TableCell key={column.id}>
                            {filled.has(`${index}:${column.id}`) ? (
                              <Tooltip title="Filled with zero because this source has no matching row">
                                <span>{String(data?.[index] ?? "")} *</span>
                              </Tooltip>
                            ) : (
                              String(data?.[index] ?? "—")
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          <TablePagination
            component="div"
            count={rowCount}
            page={safePage}
            rowsPerPage={size}
            rowsPerPageOptions={[5, 10, 25]}
            onPageChange={(_, next) => setPage(next)}
            onRowsPerPageChange={(event) => {
              setSize(Number(event.target.value));
              setPage(0);
            }}
          />
          </TableContainer>
      )}
      {filled.size > 0 && (
        <Typography variant="caption" color="text.secondary">
          * {filled.size} cells were filled with zero for absent source rows.
          Other zeros are measured values.
        </Typography>
      )}
    </Stack>
  );
  return framed ? (
    <SectionCard title={title} helper={`${rowCount} rows · ${columns.length} columns`}>
      {content}
    </SectionCard>
  ) : content;
}
ResultTable.propTypes = { dataset: PropTypes.object, title: PropTypes.string, framed: PropTypes.bool };

export function ColumnMappings({
  inputs,
  dataset,
  mapping,
  onChange,
  title,
  helper,
  columns: layoutColumns = 1,
}) {
  const columns = datasetColumns(dataset);
  return (
    <SectionCard title={title} helper={helper}>
      <Grid container spacing={2}>
        {inputs.map((input) => {
          const options = columns.filter(
            (column) => column.configurationData.type === input.type,
          );
          const id = `${title.replaceAll(" ", "-")}-${input.id}`;
          return (
            <Grid size={{ xs: 12, md: layoutColumns === 2 ? 6 : 12 }} key={input.id}>
            <FormControl fullWidth>
              <InputLabel id={`${id}-label`} required={Boolean(input.required)}>
                {input.title || input.id} (
                {input.type === "Text" ? "Categorical" : "Numerical"})
              </InputLabel>
              <Select
                labelId={`${id}-label`}
                label={`${input.title || input.id} (${input.type === "Text" ? "Categorical" : "Numerical"})`}
                value={
                  mapping?.mapping?.find(
                    (entry) => entry.inputPort.id === input.id,
                  )?.outputPort?.id || ""
                }
                onChange={(event) =>
                  onChange(
                    withMapping(
                      mapping,
                      input,
                      options.find(
                        (column) =>
                          column.configurationData.id === event.target.value,
                      )?.configurationData,
                    ),
                  )
                }
              >
                <MenuItem value="">
                  <em>{input.required ? "Select a column" : "Not used"}</em>
                </MenuItem>
                {options.map((column) => (
                  <MenuItem
                    key={column.configurationData.id}
                    value={column.configurationData.id}
                  >
                    {column.configurationData.title ||
                      column.configurationData.id}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {!options.length
                  ? "No compatible column is available. Review the combined data."
                  : input.description}
              </FormHelperText>
            </FormControl>
            </Grid>
          );
        })}
        {!inputs.length && (
          <Typography color="text.secondary">
            This method declares no input mappings.
          </Typography>
        )}
      </Grid>
    </SectionCard>
  );
}
ColumnMappings.propTypes = {
  inputs: PropTypes.array.isRequired,
  dataset: PropTypes.object,
  mapping: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  helper: PropTypes.string,
  columns: PropTypes.oneOf([1, 2]),
};

export function MethodParameters({ params, onChange }) {
  if (!params.length) return null;
  const update = (id, value) =>
    onChange(
      params.map((param) => (param.id === id ? { ...param, value } : param)),
    );
  return (
    <SectionCard
      title="Method parameters"
      helper="Parameters come with sensible defaults — adjust them only if needed."
    >
      <Stack sx={{ gap: 2 }}>
        {params.map((param) =>
          param.type === "Choice" ? (
            <TextField
              key={param.id}
              select
              fullWidth
              label={param.title || param.id}
              required={Boolean(param.required)}
              value={param.value ?? param.defaultValue ?? ""}
              helperText={param.description}
              onChange={(event) => update(param.id, event.target.value)}
            >
              {String(param.possibleValues || "")
                .split(",")
                .map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
            </TextField>
          ) : (
            <TextField
              key={param.id}
              fullWidth
              label={param.title || param.id}
              required={Boolean(param.required)}
              type={
                ["INTEGER", "DOUBLE", "FLOAT"].includes(param.dataType)
                  ? "number"
                  : "text"
              }
              value={param.value ?? param.defaultValue ?? ""}
              helperText={param.description}
              onChange={(event) => update(param.id, event.target.value)}
            />
          ),
        )}
      </Stack>
    </SectionCard>
  );
}
MethodParameters.propTypes = {
  params: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
