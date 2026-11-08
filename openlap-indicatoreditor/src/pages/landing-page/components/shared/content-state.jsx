import PropTypes from "prop-types";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";

export default function ContentState({ status, kind, onRetry, dark = false }) {
  if (status === "loading")
    return (
      <Stack
        gap={2}
        sx={{ width: "100%" }}
        role="status"
        aria-label={`Loading ${kind}`}
      >
        <Skeleton
          variant="rounded"
          height={160}
          sx={dark ? { bgcolor: "grey.800" } : undefined}
        />
        <Skeleton width="60%" sx={dark ? { bgcolor: "grey.800" } : undefined} />
      </Stack>
    );
  return (
    <Box role="status" sx={{ textAlign: "center", width: "100%", py: 4 }}>
      <Typography color={dark ? "grey.300" : "text.secondary"}>
        {status === "error"
          ? `We couldn’t load ${kind}. Please try again.`
          : `No ${kind} have been published yet.`}
      </Typography>
      {status === "error" && (
        <Button
          onClick={onRetry}
          variant="outlined"
          sx={{
            mt: 2,
            ...(dark && { color: "grey.100", borderColor: "grey.600" }),
          }}
        >
          Retry
        </Button>
      )}
    </Box>
  );
}

ContentState.propTypes = {
  status: PropTypes.string.isRequired,
  kind: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
  dark: PropTypes.bool,
};
