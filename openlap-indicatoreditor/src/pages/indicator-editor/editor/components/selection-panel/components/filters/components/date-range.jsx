import { useContext } from "react";
import { Grid, Typography } from "@mui/material";
import { SelectionContext } from "../../../selection-panel";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const DateRange = () => {
  const { indicatorQuery, setIndicatorQuery } = useContext(SelectionContext);

  const handleUpdateStartDate = (value) => {
    setIndicatorQuery((prevState) => ({
      ...prevState,
      duration: {
        ...prevState.duration,
        from: value.toISOString(),
      },
    }));
  };

  const handleUpdateEndDate = (value) => {
    setIndicatorQuery((prevState) => ({
      ...prevState,
      duration: {
        ...prevState.duration,
        until: value.toISOString(),
      },
    }));
  };

  return (
    <>
      <Typography gutterBottom>Date range</Typography>
      <Grid container spacing={2}>
        <Grid item>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DemoContainer components={["DatePicker"]}>
              <DatePicker
                label="Start date"
                value={dayjs(indicatorQuery.duration.from)}
                maxDate={dayjs(indicatorQuery.duration.until)}
                fullWidth
                onChange={(value) => handleUpdateStartDate(value)}
              />
            </DemoContainer>
          </LocalizationProvider>
        </Grid>
        <Grid item>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DemoContainer components={["DatePicker"]}>
              <DatePicker
                label="End date"
                value={dayjs(indicatorQuery.duration.until)}
                minDate={dayjs(indicatorQuery.duration.from)}
                fullWidth
                onChange={(value) => handleUpdateEndDate(value)}
              />
            </DemoContainer>
          </LocalizationProvider>
        </Grid>
      </Grid>
    </>
  );
};

export default DateRange;
