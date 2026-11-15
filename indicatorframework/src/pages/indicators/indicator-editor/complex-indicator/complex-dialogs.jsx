import PropTypes from "prop-types";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Failure, ResultTable } from "./complex-controls";

export default function ComplexDialogs({
  resetOpen,
  setResetOpen,
  resetCurrent,
  sourcePreview,
  setSourcePreview,
  removeSource,
  setRemoveSource,
  confirmRemove,
  saveOpen,
  busy,
  setSaveOpen,
  id,
  title,
  configuration,
  setConfiguration,
  isMulti,
  methods,
  methodId,
  libraries,
  libraryId,
  selectedType,
  operationError,
  previewCurrent,
  save,
  leaveTarget,
  setLeaveTarget,
  keepAndLeave,
}) {
  return (
    <>
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        aria-labelledby="complex-reset-title"
      >
        <DialogTitle id="complex-reset-title">
          Start a new indicator?
        </DialogTitle>
        <DialogContent>
          This clears the source selections, mappings and previews in this tab.
          Previously saved indicators are retained.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Keep working</Button>
          <Button color="error" onClick={resetCurrent}>
            Start over
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(sourcePreview)}
        onClose={() => setSourcePreview(null)}
        fullWidth
        maxWidth="lg"
        aria-labelledby="complex-source-preview-title"
      >
        <DialogTitle id="complex-source-preview-title">
          {sourcePreview?.name}
        </DialogTitle>
        <DialogContent>
          <ResultTable
            dataset={sourcePreview?.dataset}
            title="Source analysis output"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSourcePreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(removeSource)}
        onClose={() => setRemoveSource(null)}
        aria-labelledby="complex-remove-title"
      >
        <DialogTitle id="complex-remove-title">Remove this source?</DialogTitle>
        <DialogContent>
          Removing {removeSource?.name} keeps the other selections, but combined
          data, analysis and chart previews will need to be generated again.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveSource(null)}>Keep source</Button>
          <Button color="error" onClick={confirmRemove}>
            Remove source
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={saveOpen}
        onClose={busy === "save" ? undefined : () => setSaveOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="complex-save-title"
      >
        <DialogTitle id="complex-save-title">
          {id ? "Update" : "Save"} {title.toLowerCase()}
        </DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <TextField
              autoFocus
              required
              fullWidth
              label="Indicator name"
              value={configuration.name}
              onChange={(event) =>
                setConfiguration((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { maxLength: 300 } }}
              helperText="Choose a name that explains what this indicator shows."
            />
            <Divider />
            <Typography variant="subtitle2">Sources</Typography>
            {configuration.sources.map((source) => (
              <Typography variant="body2" key={source.id}>
                {source.label || source.name} · {source.analyticsMethod?.name}
              </Typography>
            ))}
            <Typography variant="body2">
              Combination:{" "}
              {isMulti
                ? "shared matching values only (intersection)"
                : "all matching values (union), absent measures filled with zero"}
            </Typography>
            {isMulti && (
              <Typography variant="body2">
                Additional analysis:{" "}
                {methods.find((method) => method.id === methodId)?.name}
              </Typography>
            )}
            <Typography variant="body2">
              Visualization:{" "}
              {libraries.find((library) => library.id === libraryId)?.name} ·{" "}
              {selectedType?.name}
            </Typography>
            <Alert severity="info">
              Saved indicators use live source references. Future source changes
              can change these results.
            </Alert>
            <Failure
              message={
                operationError.step === "save" ? operationError.message : ""
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy === "save"} onClick={() => setSaveOpen(false)}>
            Keep editing
          </Button>
          <Button
            variant="contained"
            disabled={
              !configuration.name.trim() || busy === "save" || !previewCurrent
            }
            onClick={save}
          >
            {busy === "save"
              ? "Saving…"
              : id
                ? "Update indicator"
                : "Save indicator"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(leaveTarget)}
        onClose={() => setLeaveTarget(null)}
        aria-labelledby="complex-leave-title"
      >
        <DialogTitle id="complex-leave-title">Leave this editor?</DialogTitle>
        <DialogContent>
          Your configuration can be kept in this tab. Computed previews will be
          refreshed when you return.{" "}
          {busy &&
            "A request is still running; leaving will discard its response."}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveTarget(null)}>Stay here</Button>
          <Button onClick={keepAndLeave}>Keep in this tab and leave</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
ComplexDialogs.propTypes = {
  resetOpen: PropTypes.bool,
  setResetOpen: PropTypes.func,
  resetCurrent: PropTypes.func,
  sourcePreview: PropTypes.object,
  setSourcePreview: PropTypes.func,
  removeSource: PropTypes.object,
  setRemoveSource: PropTypes.func,
  confirmRemove: PropTypes.func,
  saveOpen: PropTypes.bool,
  busy: PropTypes.string,
  setSaveOpen: PropTypes.func,
  id: PropTypes.string,
  title: PropTypes.string,
  configuration: PropTypes.object,
  setConfiguration: PropTypes.func,
  isMulti: PropTypes.bool,
  methods: PropTypes.array,
  methodId: PropTypes.string,
  libraries: PropTypes.array,
  libraryId: PropTypes.string,
  selectedType: PropTypes.object,
  operationError: PropTypes.object,
  previewCurrent: PropTypes.bool,
  save: PropTypes.func,
  leaveTarget: PropTypes.string,
  setLeaveTarget: PropTypes.func,
  keepAndLeave: PropTypes.func,
};
