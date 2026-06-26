import PropTypes from "prop-types";
import { alpha, Box, Button, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import Section from "../shared/section";
import ZoomableImageCard from "../shared/zoomable-image-card";

const featureShape = PropTypes.shape({
  id: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  imageAlt: PropTypes.string,
  dialogLabel: PropTypes.string,
  buttonLabel: PropTypes.string.isRequired,
  buttonIcon: PropTypes.elementType.isRequired,
  to: PropTypes.string.isRequired,
  step: PropTypes.string,
  imageSide: PropTypes.oneOf(["left", "right"]).isRequired,
  imageWidth: PropTypes.string.isRequired,
  pb: PropTypes.object,
});

// Purpose eyebrow + title + description + CTA. Rendered once per row.
const FeatureText = ({ feature, onClick }) => {
  const theme = useTheme();
  const accent = theme.custom.colors.accent;
  const ButtonIcon = feature.buttonIcon;

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        {feature.step && (
          <Typography
            variant="overline"
            sx={{ color: accent, fontWeight: 600, letterSpacing: "0.1em" }}
          >
            {feature.step}
          </Typography>
        )}
        <Typography variant="h4" component="h3">
          {feature.title}
        </Typography>
        <Typography color="text.secondary">{feature.description}</Typography>
      </Stack>
      <Box>
        <Button
          variant="contained"
          size="large"
          endIcon={<ButtonIcon />}
          onClick={onClick}
        >
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

// One feature presented as a framed image card beside a text column. The image
// alternates left/right per `feature.imageSide`; on mobile it stacks above the
// text.
const FeatureRow = ({ feature }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const textWidth = `${100 - parseInt(feature.imageWidth, 10)}%`;

  return (
    <Section id={feature.id} sx={{ pt: { xs: 4, md: 10 }, pb: feature.pb }}>
      <Stack
        direction={{
          xs: "column",
          md: feature.imageSide === "left" ? "row" : "row-reverse",
        }}
        spacing={{ xs: 4, md: 6 }}
        useFlexGap
        alignItems="center"
      >
        <Box sx={{ width: { xs: "100%", md: feature.imageWidth } }}>
          <ZoomableImageCard
            image={feature.image}
            alt={feature.imageAlt}
            dialogLabel={feature.dialogLabel}
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              boxShadow: theme.custom.shadows.md,
              transition: `box-shadow ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}, transform ${theme.custom.motion.duration.hover}ms ${theme.custom.motion.easing.standard}`,
              "&:hover": {
                boxShadow: theme.custom.shadows.cardHover,
                transform: "translateY(-2px)",
              },
            }}
          />
        </Box>
        <Box sx={{ width: { xs: "100%", md: textWidth }, display: "flex" }}>
          <FeatureText feature={feature} onClick={() => navigate(feature.to)} />
        </Box>
      </Stack>
    </Section>
  );
};

FeatureRow.propTypes = {
  feature: featureShape.isRequired,
};

export default FeatureRow;
