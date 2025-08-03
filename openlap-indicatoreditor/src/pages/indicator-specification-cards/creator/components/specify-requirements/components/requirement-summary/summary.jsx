import Grid from "@mui/material/Grid2";
import { Chip, Typography } from "@mui/material";

export default function Summary({
  verb,
  goal,
  goalName,
  question,
  indicatorName,
  indicatorData,
}) {
  const handleCheckGoal = () => {
    return goal !== "" && goalName !== "";
  };

  const handleCheckQuestion = () => {
    return question !== "";
  };

  const handleCheckIndicatorName = () => {
    return indicatorName !== "";
  };

  return (
    <Grid container spacing={1}>
      {handleCheckGoal() && (
        <Grid size={{ xs: 12 }}>
          <Grid container alignItems="center" spacing={1}>
            <Typography>I want to</Typography>
            <Chip label={verb} />
            <Chip label={goal} />
          </Grid>
        </Grid>
      )}
      {handleCheckQuestion() && (
        <Grid size={{ xs: 12 }}>
          <Grid container alignItems="center" spacing={1}>
            <Typography>I am interested in</Typography>
            <Chip label={question} />
          </Grid>
        </Grid>
      )}
      {handleCheckIndicatorName() && (
        <>
          <Grid size={{ xs: 12 }}>
            <Grid container alignItems="center" spacing={1}>
              <Typography>I need an indicator showing</Typography>
              <Chip label={indicatorName} />
            </Grid>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={1} alignItems="center">
              <Typography>I need the following data</Typography>
              {indicatorData.map((item, index) => {
                if (item.value !== "") {
                  return <Chip key={index} label={item.value} />;
                } else return undefined;
              })}
            </Grid>
          </Grid>
        </>
      )}
    </Grid>
  );
}
