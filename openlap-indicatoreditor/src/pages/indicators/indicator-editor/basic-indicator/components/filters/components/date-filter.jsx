import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useContext, useState } from "react";
import { BasicContext } from "../../../basic-indicator";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";

export default function DateFilter() {
  const { filters, setFilters } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
        <b>Tip!</b><br/>
        To be decided!
      `,
  });

  const handleDateFilterPopoverAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleUpdateDate = (value, name) => {
    setFilters((p) => ({
      ...p,
      selectedTime: { ...p.selectedTime, [name]: value.toISOString() },
    }));
  };

  return (
    <>
      <Accordion
        defaultExpanded
        sx={{
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <AccordionDetails>
          <Grid container spacing={1} alignItems="center">
            <Typography>Select date range</Typography>
            <TipPopover
              tipAnchor={state.tipAnchor}
              toggleTipAnchor={handleDateFilterPopoverAnchor}
              description={state.tipDescription}
            />
          </Grid>
          <Grid container spacing={2}>
            <Grid size="auto">
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
            </Grid>
            <Grid size="auto">
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
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
