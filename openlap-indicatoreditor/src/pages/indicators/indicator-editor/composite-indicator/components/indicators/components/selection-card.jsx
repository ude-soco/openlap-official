import { useContext } from "react";
import CheckIcon from "@mui/icons-material/Check";
import { CompositeContext } from "../../../composite-indicator";
import { Button, Paper, Grid, Typography } from "@mui/material";
import ChartPreview from "../../../../components/chart-preview";
import { handleDisplayType } from "../../../../../dashboard/utils/utils";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

const SelectionCard = ({ cardItem }) => {
  const { indicator, setIndicator } = useContext(CompositeContext);

  const handleToggleSelectIndicator = (indicator) => {
    if (isSelected(indicator.id)) {
      setIndicator((p) => ({
        ...p,
        selectedIndicators: p.selectedIndicators.filter(
          (selected) => selected.id !== indicator.id
        ),
      }));
      return;
    }
    setIndicator((p) => ({
      ...p,
      selectedIndicators: [...p.selectedIndicators, indicator],
    }));
  };

  const isCompatible = (checkIndicator) => {
    return (
      indicator.selectedIndicators.at(0)?.analyticsMethod.id ===
      checkIndicator.analyticsMethod.id
    );
  };

  const isSelected = (indicatorId) => {
    return indicator.selectedIndicators.some(
      (selected) => selected.id === indicatorId
    );
  };

  // * Helper function
  function changeTimeFormat(time) {
    return new Date(time).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return (
    <>
      <Grid size="auto" key={cardItem.id} sx={{ flexShrink: 0 }}>
        <Grid
          container
          component={Paper}
          variant="outlined"
          direction="column"
          spacing={2}
          sx={{ p: 3 }}
        >
          <Grid container direction="column" spacing={0}>
            <Typography variant="h6">{cardItem.name}</Typography>
            <Typography variant="body2" gutterBottom>
              {handleDisplayType(cardItem.type)} ● Created on:{" "}
              {changeTimeFormat(cardItem.createdOn)} ● Created by:{" "}
              {cardItem.createdBy}
            </Typography>
            <Typography variant="body2">
              Analytics method: <b>{cardItem.analyticsMethod.name}</b>
            </Typography>
          </Grid>
          <ChartPreview previewData={cardItem.previewData} />
          <Grid container spacing={1}>
            <Grid size="grow">
              <Button
                fullWidth
                variant="contained"
                disabled={
                  indicator.selectedIndicators.length > 0 &&
                  !isCompatible(cardItem)
                }
                startIcon={isSelected(cardItem.id) && <CheckIcon />}
                color={isSelected(cardItem.id) ? "success" : "primary"}
                onClick={() => handleToggleSelectIndicator(cardItem)}
              >
                {isSelected(cardItem.id)
                  ? "Selected"
                  : indicator.selectedIndicators.length > 0 &&
                    !isCompatible(cardItem)
                  ? "Not compatible"
                  : "Select"}
              </Button>
            </Grid>
            {indicator.selectedIndicators.length > 0 &&
              !isCompatible(cardItem) && (
                <CustomTooltip
                  type="help"
                  message={`This button is disabled because:<br/>
                            ● This indicator is not compatible.<br/>
                            ● This indicator used a different <b>Analytics Method</b> than the one you have selected.<br/>
                            ● This indicator used <b>${
                              cardItem.analyticsMethod.name
                            }</b> as the analytics than the indicator(s).<br/>
                            ● Your selected indicator(s) used <b>${
                              indicator.selectedIndicators.at(0)
                                ?.analyticsMethod.name
                            }</b>.<br/><br/>
                            You have two ways to fix:<br/>
                            ● You can find another indicator that used <b>${
                              indicator.selectedIndicators.at(0)
                                ?.analyticsMethod.name
                            }</b> analytics method.<br/>
                            ● You can deselect all selected indicators, select this indicator, and find compatible indicators with the same Analytics Method.`}
                />
              )}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default SelectionCard;
