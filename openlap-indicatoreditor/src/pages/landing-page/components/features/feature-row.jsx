import PropTypes from "prop-types";
import {
  Box,
  Button,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Section from "../shared/section";
import ZoomableImageCard from "../shared/zoomable-image-card";

const featureShape = PropTypes.shape({
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  dialogLabel: PropTypes.string,
  buttonLabel: PropTypes.string.isRequired,
  buttonIcon: PropTypes.elementType.isRequired,
  to: PropTypes.string.isRequired,
  imageSide: PropTypes.oneOf(["left", "right"]).isRequired,
  imageWidth: PropTypes.string.isRequired,
  pb: PropTypes.object,
});

// Title + description + call-to-action for a feature. Rendered once and placed
// in both the desktop side column and the card's mobile content, so the markup
// is not duplicated.
const FeatureText = ({ feature, onClick }) => {
  const ButtonIcon = feature.buttonIcon;
  return (
    <Stack gap={4}>
      <Box>
        <Typography variant="h4" gutterBottom>
          {feature.title}
        </Typography>
        <Typography>{feature.description}</Typography>
      </Box>
      <Box>
        <Button variant="contained" endIcon={<ButtonIcon />} onClick={onClick}>
          {feature.buttonLabel}
        </Button>
      </Box>
    </Stack>
  );
};

FeatureText.propTypes = {
  feature: featureShape.isRequired,
  onClick: PropTypes.func.isRequired,
};

// One feature presented as an image card beside a text column. The image sits
// on the left or right per `feature.imageSide`; on mobile only the card shows
// (with the text inside it).
const FeatureRow = ({ feature }) => {
  const navigate = useNavigate();
  const text = (
    <FeatureText feature={feature} onClick={() => navigate(feature.to)} />
  );
  const textWidth = `${100 - parseInt(feature.imageWidth, 10)}%`;

  const imageColumn = (
    <Box sx={{ width: { xs: "100%", md: feature.imageWidth } }}>
      <ZoomableImageCard
        image={feature.image}
        dialogLabel={feature.dialogLabel}
        sx={{ border: { xs: "1px solid #bdbdbd", md: "none" } }}
      >
        <CardContent sx={{ display: { xs: "flex", md: "none" } }}>
          {text}
        </CardContent>
      </ZoomableImageCard>
    </Box>
  );

  const textColumn = (
    <Box
      sx={{
        width: { xs: "100%", md: textWidth },
        display: { xs: "none", md: "flex" },
      }}
    >
      {text}
    </Box>
  );

  return (
    <Section sx={{ pt: { xs: 4, md: 12 }, pb: feature.pb }}>
      <Stack
        direction={{ xs: "column-reverse", md: "row" }}
        gap={4}
        alignItems="center"
      >
        {feature.imageSide === "left" ? (
          <>
            {imageColumn}
            {textColumn}
          </>
        ) : (
          <>
            {textColumn}
            {imageColumn}
          </>
        )}
      </Stack>
    </Section>
  );
};

FeatureRow.propTypes = {
  feature: featureShape.isRequired,
};

export default FeatureRow;
