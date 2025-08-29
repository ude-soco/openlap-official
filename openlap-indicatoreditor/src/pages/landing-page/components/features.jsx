import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { featureItems } from "../utils/features-data";
import { navigationIds } from "../utils/navigation-data";

export default function Features() {
  const [selectedItemIndex, setSelectedItemIndex] = useState(
    featureItems.at(0)
  );

  const handleItemClick = (index) => {
    setSelectedItemIndex(index);
  };

  const selectedFeature = selectedItemIndex;

  return (
    <Container id={navigationIds.FEATURE} sx={{ py: { xs: 8, sm: 16 } }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 6 }}>
          <div>
            <Typography component="h2" variant="h4" color="text.primary">
              Product features
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: { xs: 2, sm: 4 } }}
            >
              Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
              nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam
              erat, sed diam voluptua.
            </Typography>
          </div>
          <Grid
            container
            item
            gap={1}
            sx={{ display: { xs: "auto", sm: "none" } }}
          >
            {featureItems.map((item) => (
              <Chip
                key={item.id}
                label={item.title}
                onClick={() => handleItemClick(item)}
                sx={{
                  borderColor: (theme) => {
                    if (theme.palette.mode === "light") {
                      return selectedItemIndex.id === item.id
                        ? "primary.light"
                        : "";
                    }
                    return selectedItemIndex.id === item.id
                      ? "primary.light"
                      : "";
                  },
                  background: (theme) => {
                    if (theme.palette.mode === "light") {
                      return selectedItemIndex.id === item.id ? "none" : "";
                    }
                    return selectedItemIndex.id === item.id ? "none" : "";
                  },
                  backgroundColor:
                    selectedItemIndex.id === item.id ? "primary.main" : "",
                  "& .MuiChip-label": {
                    color: selectedItemIndex.id === item.id ? "#fff" : "",
                  },
                }}
              />
            ))}
          </Grid>
          <Box
            component={Card}
            variant="outlined"
            sx={{
              display: { xs: "auto", sm: "none" },
              mt: 4,
            }}
          >
            <Box
              sx={{
                backgroundImage: (theme) =>
                  theme.palette.mode === "light"
                    ? selectedItemIndex.imageLight
                    : selectedItemIndex.imageDark,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                minHeight: 280,
              }}
            />
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography
                color="text.primary"
                variant="body2"
                fontWeight="bold"
              >
                {selectedFeature.title}
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ my: 0.5 }}
              >
                {selectedFeature.description}
              </Typography>
              <Link
                color="primary"
                variant="body2"
                fontWeight="bold"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  "& > svg": { transition: "0.2s" },
                  "&:hover > svg": { transform: "translateX(2px)" },
                }}
              >
                <span>Learn more</span>
                <ChevronRightRoundedIcon
                  fontSize="small"
                  sx={{ mt: "1px", ml: "2px" }}
                />
              </Link>
            </Box>
          </Box>
          <Stack
            direction="column"
            justifyContent="center"
            alignItems="flex-start"
            spacing={2}
            useFlexGap
            sx={{ width: "100%", display: { xs: "none", sm: "flex" } }}
          >
            {featureItems.map((item) => (
              <Card
                key={item.id}
                variant="outlined"
                component={Button}
                onClick={() => handleItemClick(item)}
                sx={{
                  p: 3,
                  height: "fit-content",
                  width: "100%",
                  background: "none",
                  backgroundColor:
                    selectedItemIndex.id === item.id
                      ? "action.selected"
                      : undefined,
                  borderColor: (theme) => {
                    if (theme.palette.mode === "light") {
                      return selectedItemIndex.id === item.id
                        ? "primary.light"
                        : "grey.200";
                    }
                    return selectedItemIndex.id === item.id
                      ? "primary.dark"
                      : "grey.800";
                  },
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    textAlign: "left",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { md: "center" },
                    gap: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      color: (theme) => {
                        if (theme.palette.mode === "light") {
                          return selectedItemIndex.id === item.id
                            ? "primary.main"
                            : "grey.300";
                        }
                        return selectedItemIndex.id === item.id
                          ? "primary.main"
                          : "grey.700";
                      },
                    }}
                  >
                    {React.createElement(item.icon)}
                  </Box>
                  <Box sx={{ textTransform: "none" }}>
                    <Typography
                      color="text.primary"
                      variant="body2"
                      fontWeight="bold"
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      variant="body2"
                      sx={{ my: 0.5 }}
                    >
                      {item.description}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            ))}
          </Stack>
        </Grid>
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{ display: { xs: "none", sm: "flex" }, width: "100%" }}
        >
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              width: "100%",
              display: { xs: "none", sm: "flex" },
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{
                m: "auto",
                width: 420,
                height: 300,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundImage: (theme) =>
                  theme.palette.mode === "light"
                    ? selectedItemIndex.imageLight
                    : selectedItemIndex.imageDark,
              }}
            />
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
