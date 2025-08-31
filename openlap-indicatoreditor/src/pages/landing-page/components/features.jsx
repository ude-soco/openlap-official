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
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { featureItems } from "../utils/features-data";
import { navigationIds } from "../utils/navigation-data";
import {
  CardActionArea,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";

export default function Features() {
  const [selectedItem, setSelectedItem] = useState(featureItems.at(0));
  const [open, setOpen] = useState(false);

  const handleToggleOpen = () => {
    setOpen((p) => !p);
  };

  const handleItemClick = (index) => {
    setSelectedItem(index);
  };

  const handleMaximizeImage = () => {
    third;
  };

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
              Discover the powerful features behind Open Learning Analytics
              Platform
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
                color={selectedItem.id === item.id ? "primary" : undefined}
              />
            ))}
          </Grid>
          <Card
            sx={{ mt: 4, display: { xs: "auto", sm: "none" } }}
            variant="outlined"
          >
            <CardMedia sx={{ height: 190 }} image={selectedItem.image} />
            <CardContent>
              <Typography
                color="text.primary"
                variant="body2"
                fontWeight="bold"
              >
                {selectedItem.title}
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ my: 0.5 }}
              >
                {selectedItem.description}
              </Typography>
              <Link
                color="primary"
                variant="body2"
                fontWeight="bold"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  "& > svg": { transition: "0.2s" },
                  "&:hover > svg": { transform: "translateX(4px)" },
                }}
              >
                <span>Learn more</span>
                <ChevronRightRoundedIcon
                  fontSize="small"
                  sx={{ mt: "1px", ml: "2px" }}
                />
              </Link>
            </CardContent>
          </Card>

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
                    selectedItem.id === item.id ? "action.selected" : undefined,
                  borderColor: (theme) => {
                    if (theme.palette.mode === "light") {
                      return selectedItem.id === item.id
                        ? "primary.light"
                        : "grey.200";
                    }
                    return selectedItem.id === item.id
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
                          return selectedItem.id === item.id
                            ? "primary.main"
                            : "grey.300";
                        }
                        return selectedItem.id === item.id
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
              height: { xs: "none", sm: 350, md: "100%" },
              width: "100%",
              display: { xs: "none", sm: "flex" },
              position: "relative",
              overflow: "hidden",
            }}
          >
            <CardActionArea onClick={handleToggleOpen}>
              <CardMedia
                sx={{
                  m: "auto",
                  width: "100%",
                  height: "100%",
                  backgroundSize: "contain",
                }}
                image={selectedItem.image}
              />

              <IconButton
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  opacity: 0,
                  transition: "opacity 0.3s",
                  ".MuiCard-root:hover &": { opacity: 1 },
                }}
              >
                <SearchIcon />
              </IconButton>
            </CardActionArea>
          </Card>
          <Dialog
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleToggleOpen}
          >
            <DialogTitle>
              <Grid container justifyContent="flex-end">
                <IconButton onClick={handleToggleOpen}>
                  <CloseIcon />
                </IconButton>
              </Grid>
            </DialogTitle>
            <DialogContent>
              <Box
                component="img"
                src={selectedItem.image}
                alt="Preview"
                sx={{ width: "100%", height: "auto" }}
              />
            </DialogContent>
          </Dialog>
        </Grid>
      </Grid>
    </Container>
  );
}
