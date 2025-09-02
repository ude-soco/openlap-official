import React, { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
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

  const handleSelect = (item) => {
    handleToggleOpen();
    setSelectedItem(item);
  };

  return (
    <Container
      id={navigationIds.FEATURE}
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8 },
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 3, sm: 6 },
      }}
    >
      <Box
        sx={{
          width: { sm: "100%", md: "60%" },
          textAlign: { sm: "left", md: "center" },
        }}
      >
        <Typography component="h2" variant="h4" color="text.primary">
          OpenLAP Features
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The Indicator Specification Card (ISC) Creator and the Indicator
          Editor
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {featureItems.map((item) => (
          <Card variant="outlined" key={item.id} sx={{ width: "100%" }}>
            <CardActionArea
              onClick={() => handleSelect(item)}
              sx={{
                width: "100%",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <CardMedia sx={{ height: 300 }} image={item.image} />
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
            <CardContent>
              <Stack direction="row" spacing={2}>
                <Box>
                  {React.createElement(item.icon, {
                    sx: { color: "primary.main", mt: 0.5 },
                  })}
                </Box>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    sx={{ my: 0.5 }}
                  >
                    {item.description}
                  </Typography>
                  <Link
                    component="button"
                    color="primary"
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
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Dialog fullWidth fullScreen open={open} onClose={handleToggleOpen}>
        <DialogTitle>
          <Grid container justifyContent="flex-end">
            <IconButton color="primary" onClick={handleToggleOpen}>
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <Box
            component="img"
            src={selectedItem?.image}
            alt="Preview"
            sx={{ width: "100%", height: "auto" }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
}
