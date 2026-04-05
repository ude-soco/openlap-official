import { useContext } from "react";
import {
  Accordion,
  AccordionDetails,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../basic-indicator";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function DateFilter() {
  const { filters, setFilters, setAnalysis } = useContext(BasicContext);

  const isValidDate = (value) => {
    if (!value) return false;
    return dayjs(value).isValid();
  };

  const toPickerDate = (value) => {
    if (!isValidDate(value)) return null;
    return dayjs(value);
  };

  const handleUpdateDate = (value, name) => {
    const hasValidDate = isValidDate(value);
    setFilters((p) => ({
      ...p,
      selectedTime: {
        ...p.selectedTime,
        [name]: hasValidDate ? dayjs(value).toISOString() : null,
      },
    }));
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
  };

  return (
    <>
      <Stack gap={1} component={Paper} variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center">
          <Typography>
            Select <b>Timeframe</b>
          </Typography>
          <CustomTooltip
            type="description"
            message={`Choose the start and end dates to define the period of data you want to include in your analysis.`}
          />
        </Stack>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack gap={2} justifyContent="center" direction={{ xs: "column", lg: "row" }}>
            <DatePicker
              format="DD MMM YYYY"
              label="Start date"
              maxDate={toPickerDate(filters?.selectedTime?.until)}
              onChange={(value) => handleUpdateDate(value, "from")}
              value={toPickerDate(filters?.selectedTime?.from)}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />
            <DatePicker
              format="DD MMM YYYY"
              label="End date"
              minDate={toPickerDate(filters?.selectedTime?.from)}
              onChange={(value) => handleUpdateDate(value, "until")}
              value={toPickerDate(filters?.selectedTime?.until)}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />
          </Stack>
        </LocalizationProvider>
      </Stack>
    </>
  );
}
