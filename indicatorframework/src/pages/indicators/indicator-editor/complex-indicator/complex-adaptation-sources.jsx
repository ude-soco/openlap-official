import PropTypes from "prop-types";
import { Alert, Button, Chip, Divider, Grid, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useMediaQuery } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SectionCard from "../../../../common/components/section-card/section-card";
import { adaptationSourceReady } from "./complex-model.js";

export default function ComplexAdaptationSources({ configuration, onEdit, onAdd, onRemove, removedSource, onUndo, onContinue }) {
  const { sources, sourceDrafts } = configuration;
  const compact = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const method = sources[0]?.analyticsMethod?.id;
  const sameMethod = configuration.type !== "COMPOSITE" || sources.every((source) => source.analyticsMethod?.id === method);
  const ready = sources.length >= 2 && sameMethod && sources.every((source) => adaptationSourceReady(sourceDrafts[source.id]) && source.outputs.length);
  return <>
    <SectionCard title="Adapt your source indicators" helper="Configure each source with your own data. These sources stay in this private draft until the whole indicator is saved."
      action={<Button variant="contained" startIcon={<AddIcon />} disabled={sources.length >= 10} onClick={onAdd}>Add source</Button>}>
      {!sameMethod && <Alert severity="warning">Composite sources must use the same analytics method. Open a source to change its method.</Alert>}
      {compact ? <Stack component="ul" aria-label="Source indicators to adapt" sx={{ listStyle: "none", p: 0, m: 0, gap: 2 }}>
        {sources.map((source, index) => {
          const ready = adaptationSourceReady(sourceDrafts[source.id]);
          const titleId = `adaptation-source-${source.id}`;
          return <Stack component="li" key={source.id} sx={{ gap: 1.5, minWidth: 0, pb: 2,
            borderBottom: 1, borderColor: "divider", "&:last-child": { pb: 0, borderBottom: 0 } }}>
            <Stack sx={{ gap: 1, alignItems: "flex-start", minWidth: 0 }}>
              <Typography component="h3" id={titleId} variant="subtitle2" sx={{ overflowWrap: "anywhere" }}>{source.name || `Source ${index + 1}`}</Typography>
              <Chip size="small" variant="outlined" color={ready ? "success" : "warning"} label={ready ? "Configured" : "Needs your selections"} />
            </Stack>
            <Stack sx={{ gap: 0.5, minWidth: 0 }}><Typography variant="caption" color="text.secondary">Analytics method</Typography>
              <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{source.analyticsMethod?.name || "Choose a method"}</Typography></Stack>
            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
              <Button variant="outlined" aria-describedby={titleId} onClick={() => onEdit(source.id)}>Edit source</Button>
              <Button color="error" aria-describedby={titleId} onClick={() => onRemove(source)}>Remove</Button>
            </Stack>
          </Stack>;
        })}
      </Stack> : <TableContainer sx={{ width: "100%", minWidth: 0 }}>
        <Table aria-label="Source indicators to adapt" sx={{ tableLayout: "fixed", "& th, & td": { overflowWrap: "anywhere" } }}>
          <TableHead><TableRow><TableCell>Source</TableCell><TableCell>Analytics method</TableCell><TableCell sx={{ width: "24%" }} align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{sources.map((source, index) => <TableRow key={source.id} hover>
            <TableCell><Stack sx={{ gap: 1, alignItems: "flex-start" }}><Typography variant="subtitle2">{source.name || `Source ${index + 1}`}</Typography>
              <Chip size="small" variant="outlined" color={adaptationSourceReady(sourceDrafts[source.id]) ? "success" : "warning"}
                label={adaptationSourceReady(sourceDrafts[source.id]) ? "Configured" : "Needs your selections"} /></Stack></TableCell>
            <TableCell>{source.analyticsMethod?.name || "Choose a method"}</TableCell>
            <TableCell align="right"><Stack sx={{ alignItems: "flex-end", gap: 0.5 }}><Button onClick={() => onEdit(source.id)}>Edit source</Button>
              <Button color="error" size="small" onClick={() => onRemove(source)}>Remove</Button></Stack></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TableContainer>}
      {!sources.length && <Typography color="text.secondary">Add at least two sources to combine.</Typography>}
      {removedSource && <Alert severity="info" action={<Button color="inherit" onClick={onUndo}>Undo</Button>}>Source removed from this draft.</Alert>}
    </SectionCard>
    <Divider />
    <Grid container sx={{ justifyContent: "center" }}><Grid size={{ xs: 12, sm: 6 }}><Button fullWidth variant="contained" disabled={!ready} onClick={onContinue}>Next</Button></Grid></Grid>
  </>;
}
ComplexAdaptationSources.propTypes = { configuration: PropTypes.object.isRequired, onEdit: PropTypes.func.isRequired, onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired, removedSource: PropTypes.object, onUndo: PropTypes.func.isRequired, onContinue: PropTypes.func.isRequired };
