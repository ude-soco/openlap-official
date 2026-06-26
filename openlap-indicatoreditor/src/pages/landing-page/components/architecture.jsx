import { alpha, Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import InsightsIcon from "@mui/icons-material/Insights";
import StorageIcon from "@mui/icons-material/Storage";
import OpenLAPArchitecture from "../../../assets/home/abstract-architecture.png";
import { navigationIds } from "../utils/navigation-data";
import Section from "./shared/section";
import SectionHeading from "./shared/section-heading";
import ZoomableImageCard from "./shared/zoomable-image-card";
import Reveal from "./shared/reveal";

// Existing architecture content, presented as icon feature points.
const components = [
  {
    icon: DesignServicesIcon,
    title: "Indicator Engine",
    description:
      "Responsible for providing an intuitive and interactive User Interface (UI) to help users develop their indicators.",
  },
  {
    icon: InsightsIcon,
    title: "Analytics Framework",
    description:
      "Contains various core modules that allow the generation, execution, and management of indicators.",
  },
  {
    icon: StorageIcon,
    title: "Data Collection and Management",
    description:
      "Responsible for xAPI-based data collection from various learning sources as well as maintaining data privacy policies.",
  },
];

const Architecture = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "primary.light" : "primary.main";

  return (
    <Section id={navigationIds.ARCHITECTURE}>
      <Reveal>
        <SectionHeading
          title="OpenLAP Architecture"
          subtitle="Three core components work together to turn raw learning activity data into meaningful, actionable indicators."
          sx={{ width: { sm: "100%", md: "70%" }, mx: "auto" }}
        />
      </Reveal>

      <Reveal delay={80} sx={{ mt: { xs: 5, md: 8 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 4, md: 6 }}
          useFlexGap
          alignItems="center"
        >
          <Box sx={{ width: { xs: "100%", md: "56%" } }}>
            <ZoomableImageCard
              image={OpenLAPArchitecture}
              alt="Diagram of the OpenLAP architecture showing the Indicator Engine, Analytics Framework, and Data Collection and Management components"
              dialogLabel="OpenLAP Architecture diagram"
              sx={{
                border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                boxShadow: theme.custom.shadows.lg,
              }}
            />
          </Box>

          <Stack spacing={3} sx={{ width: { xs: "100%", md: "44%" } }}>
            {components.map((item) => {
              const Icon = item.icon;
              return (
                <Stack
                  key={item.title}
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                >
                  <Box
                    aria-hidden
                    sx={{
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accent,
                      bgcolor: alpha(
                        theme.palette.primary.main,
                        isDark ? 0.18 : 0.1
                      ),
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600 }}
                      gutterBottom
                    >
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </Reveal>
    </Section>
  );
};

export default Architecture;
