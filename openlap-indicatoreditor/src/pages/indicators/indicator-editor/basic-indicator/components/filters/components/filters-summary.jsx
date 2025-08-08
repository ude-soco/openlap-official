import { useContext, useState } from "react";
import { Box, Chip, Collapse, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BasicContext } from "../../../basic-indicator";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditIconButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";
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

  const getUserFilterLabel = () => {
    switch (filters.selecedUserFilter) {
      case Condition.only_me:
        return "Use only my data";
      case Condition.exclude_me:
        return "Exclude only my data";
      default:
        return "Use data of all users";
    }
  };

  return (
    <>
      <Grid container>
        <Grid size={{ xs: 12 }}>
          <Grid container justifyContent="space-between" spacing={1}>
            <Grid size="grow">
              <Grid container alignItems="center" spacing={1}>
                <Chip label={lockedStep.filters.step} color="primary" />
                <Typography>Filters</Typography>
                <TipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                  description={state.tipDescription}
                />
                {!lockedStep.filters.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.filters.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
        <Collapse
          in={!lockedStep.filters.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 0 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={1}>
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected users</Typography>
                  <Chip label={getUserFilterLabel()} />
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Timeframe</Typography>
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
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Activity Types</Typography>
                  {filters.selectedActivities.map((activity) => (
                    <Chip
                      key={activity.id}
                      label={activity.selectedActivityType.name}
                    />
                  ))}
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Actions</Typography>
                  {filters.selectedActivities.map((activity) => (
                    <ChipsWithMore
                      key={activity.id}
                      items={activity.selectedActionList}
                    />
                  ))}
                </Grid>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Activities</Typography>
                  {filters.selectedActivities.map((activity) => (
                    <ChipsWithMore
                      key={activity.id}
                      items={activity.selectedActivityList}
                    />
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Collapse>
      </Grid>
    </>
  );
}
