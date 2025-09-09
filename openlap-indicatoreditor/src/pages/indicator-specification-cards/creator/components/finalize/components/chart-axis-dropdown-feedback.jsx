import { Alert, AlertTitle, Grid, Typography } from "@mui/material";

export default function ChartAxisDropdownFeedback({
  axisName,
  columnTypeValue,
}) {
  return (
    <>
      <Grid container spacing={1} sx={{ pt: 1 }}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">
            <Typography
              sx={{ whiteSpace: "pre-line" }}
              dangerouslySetInnerHTML={{
                __html: `${axisName} requires at least 1 <b>${columnTypeValue}</b> column`,
              }}
            />
          </Alert>
        </Grid>
        <Grid size="grow">
          <Alert severity="info">
            <AlertTitle>
              Possible fix for adding data to <b>{axisName}</b>
            </AlertTitle>
            <Typography
              sx={{ whiteSpace: "pre-line" }}
              dangerouslySetInnerHTML={{
                __html: `• Make sure to insert the missing type of column(s) in the <b>Dataset</b> step <em>OR</em>
                        • Make sure to add the missing type of data in the <b>Specify your goal, question, and indicator</b> step`,
              }}
            />
          </Alert>
        </Grid>
      </Grid>
    </>
  );
}
