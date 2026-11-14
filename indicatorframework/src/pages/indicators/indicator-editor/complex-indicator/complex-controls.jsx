import { useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SectionCard from "../../../../common/components/section-card/section-card";
import { ElementsBar } from "../basic-indicator/components/visualization/components/customization/components/elements-bar";
import { StylesBar } from "../basic-indicator/components/visualization/components/customization/components/styles";
import { FiltersBar } from "../basic-indicator/components/visualization/components/customization/components/filter";
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

export function ResultTable({ dataset, title = "Data preview" }) {
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
  return (
    <SectionCard
      title={title}
      helper={`${rowCount} rows · ${columns.length} columns`}
    >
      {!rowCount ? (
        <Alert severity="info">
          No matching rows. Review the source filters or matching columns.
        </Alert>
      ) : (
        <>
          <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
            <Table size="small" aria-label={title}>
              <TableHead>
                <TableRow>
                  {columns.map(({ configurationData: column }) => (
                    <TableCell
                      key={column.id}
                      sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      {column.title || column.id}
                      <Typography
                        variant="caption"
                        component="div"
                        color="text.secondary"
                      >
                        {column.type === "Text"
                          ? "Categorical"
                          : column.type === "Numeric"
                            ? "Numerical"
                            : column.type}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from(
                  { length: Math.min(size, rowCount - safePage * size) },
                  (_, offset) => {
                    const index = safePage * size + offset;
                    return (
                      <TableRow key={index}>
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
          </TableContainer>
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
        </>
      )}
      {filled.size > 0 && (
        <Typography variant="caption" color="text.secondary">
          * {filled.size} cells were filled with zero for absent source rows.
          Other zeros are measured values.
        </Typography>
      )}
    </SectionCard>
  );
}
ResultTable.propTypes = { dataset: PropTypes.object, title: PropTypes.string };

export function ColumnMappings({
  inputs,
  dataset,
  mapping,
  onChange,
  title,
  helper,
}) {
  const columns = datasetColumns(dataset);
  return (
    <SectionCard title={title} helper={helper}>
      <Stack sx={{ gap: 2 }}>
        {inputs.map((input) => {
          const options = columns.filter(
            (column) => column.configurationData.type === input.type,
          );
          const id = `${title.replaceAll(" ", "-")}-${input.id}`;
          return (
            <FormControl fullWidth key={input.id}>
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
          );
        })}
        {!inputs.length && (
          <Typography color="text.secondary">
            This method declares no input mappings.
          </Typography>
        )}
      </Stack>
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
      helper="Review the method's declared defaults. Data is not normalized automatically."
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

// The existing customization controls are presentational and can be reused
// without mounting another indicator type's state/context.
export function ChartCustomization({
  params,
  onChange,
  chartConfiguration,
  categories,
}) {
  const [tab, setTab] = useState(0);
  const setState = (updater) =>
    onChange(typeof updater === "function" ? updater(params) : updater);
  const canFilter =
    chartConfiguration.categoriesFilteringAvailable ||
    chartConfiguration.sortingOrderChangeable;
  return (
    <SectionCard
      title="Customize chart"
      helper="Use the same elements, styles and filters as the Basic editor."
    >
      <Tabs
        value={tab}
        onChange={(_, next) => setTab(next)}
        aria-label="Chart customization"
        variant="scrollable"
      >
        <Tab
          label="Elements"
          id="complex-customize-0"
          aria-controls="complex-customize-panel-0"
        />
        <Tab
          label="Styles"
          id="complex-customize-1"
          aria-controls="complex-customize-panel-1"
        />
        {canFilter && (
          <Tab
            label="Filters"
            id="complex-customize-2"
            aria-controls="complex-customize-panel-2"
          />
        )}
      </Tabs>
      {[0, 1, ...(canFilter ? [2] : [])].map((index) => (
        <Box
          key={index}
          role="tabpanel"
          id={`complex-customize-panel-${index}`}
          aria-labelledby={`complex-customize-${index}`}
          hidden={tab !== index}
          sx={{ p: 1 }}
        >
          {tab === index &&
            (index === 0 ? (
              <ElementsBar
                state={params}
                setState={setState}
                chartConfiguration={chartConfiguration}
              />
            ) : index === 1 ? (
              <StylesBar
                categories={categories}
                state={params}
                setState={setState}
                chartConfiguration={chartConfiguration}
              />
            ) : (
              <FiltersBar
                categories={categories}
                state={params}
                setState={setState}
                chartConfiguration={chartConfiguration}
              />
            ))}
        </Box>
      ))}
    </SectionCard>
  );
}
ChartCustomization.propTypes = {
  params: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  chartConfiguration: PropTypes.object.isRequired,
  categories: PropTypes.array,
};
