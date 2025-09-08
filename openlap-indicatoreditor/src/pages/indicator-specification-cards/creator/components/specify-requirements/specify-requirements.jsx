import { useContext } from "react";
import {
  Button,
  Collapse,
  Divider,
  Paper,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import Timeline from "@mui/lab/Timeline";
import TimelineItem, { timelineItemClasses } from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import { ISCContext } from "../../indicator-specification-card";
import SpecifyGoal from "./components/specify-goal/specify-goal";
import ConfirmGoal from "./components/specify-goal/confirm-goal";
import FormulateQuestion from "./components/formulate-question/formulate-question";
import ConfirmQuestion from "./components/formulate-question/confirm-question";
import SpecifyIndicator from "./components/specify-indicator/specify-indicator";
import RequirementSummary from "./components/requirement-summary/requirement-summary";
import FlagIcon from "@mui/icons-material/Flag";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import BarChartIcon from "@mui/icons-material/BarChart";

const SpecifyRequirements = () => {
  const { requirements, lockedStep, setLockedStep } = useContext(ISCContext);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      requirements: { ...p.requirements, openPanel: !p.requirements.openPanel },
    }));
  };

  const handleUnlockPath = () => {
    handleTogglePanel();
    if (lockedStep.path.locked) {
      setLockedStep((p) => ({
        ...p,
        path: {
          ...p.path,
          locked: false,
          openPanel: true,
        },
      }));
    }
  };

  const handleCheckDisabled = () => {
    return (
      requirements.goalType.verb === "" ||
      requirements.goal === "" ||
      requirements.question === "" ||
      requirements.indicatorName === "" ||
      requirements.data.some(
        (item) =>
          typeof item.value !== "string" ||
          item.value.trim() === "" ||
          !item.type ||
          typeof item.type.type !== "string" ||
          item.type.type.trim() === ""
      )
    );
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack gap={2}>
          <RequirementSummary />
          <Collapse
            in={lockedStep.requirements.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Stack gap={2}>
              <Grid container justifyContent="center">
                <Timeline
                  sx={{
                    display: "inline-flex",
                    [`& .${timelineItemClasses.root}:before`]: {
                      flex: isSmallScreen ? 0 : 0.2,
                      p: 0,
                    },
                  }}
                >
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot color="primary">
                        <FlagIcon />
                      </TimelineDot>
                      {requirements.show.question && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      {requirements.edit.goal ? (
                        <SpecifyGoal />
                      ) : (
                        <ConfirmGoal />
                      )}
                    </TimelineContent>
                  </TimelineItem>

                  {requirements.show.question && (
                    <TimelineItem>
                      <TimelineSeparator>
                        <TimelineDot color="primary">
                          <QuestionMarkIcon />
                        </TimelineDot>
                        {requirements.show.indicatorName && (
                          <TimelineConnector />
                        )}
                      </TimelineSeparator>
                      <TimelineContent>
                        {requirements.edit.question ? (
                          <FormulateQuestion />
                        ) : (
                          <ConfirmQuestion />
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  )}

                  {requirements.show.indicatorName && (
                    <TimelineItem>
                      <TimelineSeparator>
                        <TimelineDot color="primary">
                          <BarChartIcon />
                        </TimelineDot>
                      </TimelineSeparator>
                      <TimelineContent>
                        {requirements.show.indicatorName && (
                          <SpecifyIndicator />
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  )}
                </Timeline>
              </Grid>
              {requirements.show.indicatorName && lockedStep.path.locked && (
                <>
                  <Divider />
                  <Grid container justifyContent="center">
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={handleCheckDisabled()}
                        onClick={handleUnlockPath}
                      >
                        {lockedStep.path.locked ? "Next" : "Close"}
                      </Button>
                    </Grid>
                  </Grid>
                </>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </Paper>
    </>
  );
};

export default SpecifyRequirements;
