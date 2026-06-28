import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { Chip, Collapse, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { BasicContext } from "../../../basic-indicator";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";
import WorkflowStepHeader from "../../../../../../../common/components/workflow-step-header/workflow-step-header.jsx";
import { Condition } from "../../../../utils/indicator-data";
import dayjs from "dayjs";

const MAX_DISPLAY_ITEMS = 3;
const MAX_LABEL_LENGTH = 21;

function ChipsWithMore({ items }) {
  const displayed = items.slice(0, MAX_DISPLAY_ITEMS);
  const hidden = items.slice(MAX_DISPLAY_ITEMS);
  const moreCount = hidden.length;

  const truncate = (text, length) =>
    text.length > length ? `${text.slice(0, length)}…` : text;

  return (
    <>
      {displayed.map((item) => (
        <Tooltip key={item.id} arrow title={item.name}>
          <Chip
            label={truncate(item.name, MAX_LABEL_LENGTH)}
            sx={{ cursor: "help" }}
          />
        </Tooltip>
      ))}

      {moreCount > 0 && (
        <Tooltip
          arrow
          title={hidden.map((item, index) => (
            <Typography variant="body2" key={index}>
              {item.name}
            </Typography>
          ))}
        >
          <Typography sx={{ fontStyle: "italic", cursor: "help" }}>
            {`${moreCount} more...`}
          </Typography>
        </Tooltip>
      )}
    </>
  );
}

ChipsWithMore.propTypes = {
  items: PropTypes.array,
};

export default function FilterSummary() {
  const { filters, lockedStep, setLockedStep } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: false,
    showSelections: true,
    tipDescription: `
      <b>Tip!</b><br/>
      To be decided!
    `,
  });

  const handleTipAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleToggleShowSelection = () => {
    setState((p) => ({ ...p, showSelections: !p.showSelections }));
  };

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      filters: { ...p.filters, openPanel: !p.filters.openPanel },
    }));
  };

  const handleCheckFiltersSelected = () => {
    return filters.selectedActivities.length !== 0;
  };

  // * Helper functions
  function getUserFilterLabel() {
    switch (filters.selectedUserFilter) {
      case Condition.only_me:
        return "Use only my data";
      case Condition.exclude_me:
        return "Use all except my data";
      default:
        return "Use data of all users";
    }
  }

  const locked = lockedStep.filters.locked;

  return (
    <>
      <WorkflowStepHeader
        stepNumber={lockedStep.filters.step}
        title="Filters"
        locked={locked}
        helper={
          !locked && (
            <TipPopover
              tipAnchor={state.tipAnchor}
              toggleTipAnchor={handleTipAnchor}
              description={state.tipDescription}
            />
          )
        }
        summaryToggle={
          !locked &&
          !lockedStep.filters.openPanel && (
            <ToggleSummaryButton
              showSelections={state.showSelections}
              toggleShowSelection={handleToggleShowSelection}
            />
          )
        }
        editToggle={
          <ToggleEditButton
            openPanel={lockedStep.filters.openPanel}
            togglePanel={handleTogglePanel}
          />
        }
      />
      <Collapse
        in={!locked && !lockedStep.filters.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 250 }}
        unmountOnExit
      >
        <Stack gap={1}>
          <Typography variant="body2" gutterBottom>
            Selection summary
          </Typography>
          <Grid container spacing={1} alignItems="center">
            <Typography>Timeframe:</Typography>
            <Chip
              label={`From (${dayjs(filters.selectedTime.from).format(
                "DD MMM YYYY"
              )})`}
            />
            <Chip
              label={`Until (${dayjs(filters.selectedTime.until).format(
                "DD MMM YYYY"
              )})`}
            />
          </Grid>
          <Grid container spacing={1} alignItems="center">
            <Typography>User(s):</Typography>
            <Chip label={getUserFilterLabel()} />
          </Grid>
          {handleCheckFiltersSelected() && (
            <>
              <Grid container spacing={1} alignItems="center">
                <Typography>Activity Types:</Typography>
                {filters.selectedActivities.map((activity) => (
                  <Chip
                    key={activity.id}
                    label={activity.selectedActivityType.name}
                  />
                ))}
              </Grid>

              <Grid container spacing={1} alignItems="center">
                <Typography>Actions:</Typography>
                {filters.selectedActivities.map((activity) => (
                  <ChipsWithMore
                    key={activity.id}
                    items={activity.selectedActionList}
                  />
                ))}
              </Grid>
              <Grid container spacing={1} alignItems="center">
                <Typography>Activities:</Typography>
                {filters.selectedActivities.map((activity) => (
                  <ChipsWithMore
                    key={activity.id}
                    items={activity.selectedActivityList}
                  />
                ))}
              </Grid>
            </>
          )}
        </Stack>
      </Collapse>
    </>
  );
}
