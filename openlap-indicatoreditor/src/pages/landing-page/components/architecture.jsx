import { Box, Stack, Typography } from "@mui/material";
import OpenLAPArchitecture from "../../../assets/home/abstract-architecture.png";
import { navigationIds } from "../utils/navigation-data";
import Section from "./shared/section";
import ZoomableImageCard from "./shared/zoomable-image-card";

const Architecture = () => {
  // Defined once and placed in both the mobile (above the image) and desktop
  // (inside the text column) slots, so the heading markup is not duplicated.
  const heading = (
    <Typography variant="h4" component="h2" gutterBottom>
      OpenLAP Architecture
    </Typography>
  );

  return (
    <Section id={navigationIds.ARCHITECTURE} sx={{ pb: { xs: 8 } }}>
      <Box sx={{ display: { xs: "block", md: "none" } }}>{heading}</Box>
      <Stack
        direction={{ xs: "column-reverse", md: "row" }}
        gap={4}
        alignItems="center"
      >
        <Box sx={{ width: { xs: "100%", md: "40%" } }}>
          <Box sx={{ display: { xs: "none", md: "block" } }}>{heading}</Box>
          <Typography>
            The three main components of OpenLAP
            <ul>
              <li>
                <b>Indicator Engine</b>: Responsible for providing an intuitive
                and interactive User Interface (UI) to help users develop their
                indicators.
              </li>
              <li>
                <b>Analytics Framework</b>: Contains various core modules that
                allow the generation, execution, and management of indicators.
              </li>
              <li>
                <b>Data Collection and Management</b>: Responsible for
                xAPI-based data collection from various learning sources as well
                as maintaining data privacy policies.
              </li>
            </ul>
          </Typography>
        </Box>
        <Box sx={{ width: { xs: "100%", md: "60%" } }}>
          <ZoomableImageCard
            image={OpenLAPArchitecture}
            alt="Diagram of the OpenLAP architecture showing the Indicator Engine, Analytics Framework, and Data Collection and Management components"
            dialogLabel="OpenLAP Architecture diagram"
          />
        </Box>
      </Stack>
    </Section>
  );
};

export default Architecture;
