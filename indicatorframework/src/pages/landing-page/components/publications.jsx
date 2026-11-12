import { Box, Button, Container, Grid } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { navigationIds } from "../data/navigation-data";
import usePublicContent from "../utils/use-public-content.js";
import SectionHeading from "./shared/section-heading";
import Reveal from "./shared/reveal";
import { PublicationCard } from "./shared/content-cards.jsx";
import ContentState from "./shared/content-state.jsx";

export default function Publications() {
  const { status, items, retry } = usePublicContent("publications", 0, 6);
  return (
    <Box
      id={navigationIds.PUBLICATION}
      sx={{
        py: { xs: 6, sm: 8, md: 11 },
        color: "common.white",
        bgcolor: "#06090a",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "grey.800",
      }}
    >
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 4, sm: 6 },
        }}
      >
        <Reveal>
          <SectionHeading
            title="Publications"
            subtitle="Discover our research on the Open Learning Analytics Platform"
            subtitleColor="grey.400"
            sx={{ width: { sm: "100%", md: "70%" }, mx: "auto" }}
          />
        </Reveal>
        {status !== "ready" || !items.length ? (
          <ContentState
            status={status}
            kind="publications"
            onRetry={retry}
            dark
          />
        ) : (
          <Reveal sx={{ width: "100%" }}>
            <Grid container spacing={3}>
              {items.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                  <PublicationCard item={item} />
                </Grid>
              ))}
            </Grid>
          </Reveal>
        )}
        <Button
          component={RouterLink}
          to="/publications"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ color: "grey.100" }}
        >
          View all publications
        </Button>
      </Container>
    </Box>
  );
}
