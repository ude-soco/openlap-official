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
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function DateFilter() {
  const { filters, setFilters, setAnalysis } = useContext(BasicContext);

  const handleUpdateDate = (value, name) => {
    setFilters((p) => ({
      ...p,
      selectedTime: { ...p.selectedTime, [name]: value.toISOString() },
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
        <Stack gap={2} justifyContent="center" direction={{ xs: "column", lg: "row" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DemoContainer components={["DatePicker"]}>
              <DatePicker
                format="DD MMM YYYY"
                fullWidth
                label="Start date"
                maxDate={dayjs(filters.selectedTime.until)}
                onChange={(value) => handleUpdateDate(value, "from")}
                value={dayjs(filters.selectedTime.from)}
              />
            </DemoContainer>
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DemoContainer components={["DatePicker"]}>
              <DatePicker
                format="DD MMM YYYY"
                fullWidth
                label="End date"
                minDate={dayjs(filters.selectedTime.from)}
                onChange={(value) => handleUpdateDate(value, "until")}
                value={dayjs(filters.selectedTime.until)}
              />
            </DemoContainer>
          </LocalizationProvider>
        </Stack>
      </Stack>
    </>
  );
}
