import { useContext } from "react";
import { Stack } from "@mui/material";
import { BasicContext } from "../../../basic-indicator";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import FilterSection from "./filter-section";

export default function DateFilter() {
  const { filters, setFilters, setAnalysis } = useContext(BasicContext);

  const handleUpdateDate = (value, name) => {
    if (!value) return;
    setFilters((p) => ({
      ...p,
      selectedTime: { ...p.selectedTime, [name]: value.toISOString() },
    }));
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
  };

  return (
    <FilterSection
      title="Timeframe"
      helper="Choose the start and end dates that define the period of data to analyse."
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack gap={2} direction={{ xs: "column", sm: "row" }}>
          <DatePicker
            format="DD MMM YYYY"
            label="Start date"
            maxDate={dayjs(filters.selectedTime.until)}
            onChange={(value) => handleUpdateDate(value, "from")}
            value={dayjs(filters.selectedTime.from)}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DatePicker
            format="DD MMM YYYY"
            label="End date"
            minDate={dayjs(filters.selectedTime.from)}
            onChange={(value) => handleUpdateDate(value, "until")}
            value={dayjs(filters.selectedTime.until)}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Stack>
      </LocalizationProvider>
    </FilterSection>
  );
}
