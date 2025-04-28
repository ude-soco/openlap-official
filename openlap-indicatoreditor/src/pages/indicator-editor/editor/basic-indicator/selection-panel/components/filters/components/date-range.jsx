import { useContext } from "react";
import { Grid, Typography } from "@mui/material";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";
import dayjs from "dayjs";

const DateRange = () => {
  const { indicatorQuery, setIndicatorQuery, setAnalysisRef } = useContext(
    BasicIndicatorContext
  );

  const handleUpdateStartDate = (value) => {
    // If query is changed
    setAnalysisRef((prevState) => ({
      ...prevState,
      analyzedData: {},
    }));

    setIndicatorQuery((prevState) => ({
      ...prevState,
      duration: {
        ...prevState.duration,
        from: value.toISOString(),
      },
    }));
  };

  const handleUpdateEndDate = (value) => {
    // If query is changed
    setAnalysisRef((prevState) => ({
      ...prevState,
      analyzedData: {},
    }));

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
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Select a timeframe
      </Typography>
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
