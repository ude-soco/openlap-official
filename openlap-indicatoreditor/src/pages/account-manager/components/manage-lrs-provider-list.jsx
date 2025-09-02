import { useContext } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { requestDeleteLRSProvider } from "../utils/account-manager-api.js";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import DeleteDialog from "../../../common/components/delete-dialog/delete-dialog";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ContentCopy, Edit } from "@mui/icons-material";
import { useSnackbar } from "notistack";

const ManageLrsProviderList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const handleToggleDelete = (lrsId = "") => {
    setState((p) => ({
      ...p,
      deleteLrsProviderDialog: {
        ...p.deleteLrsProviderDialog,
        open: !p.deleteLrsProviderDialog.open,
        lrsProviderId: lrsId,
      },
    }));
  };

  const handleDeleteLrs = async () => {
    try {
      await requestDeleteLRSProvider(
        api,
        state.deleteLrsProviderDialog.lrsProviderId
      );
      setState((p) => ({
        ...p,
        addLRSProviderDialog: {
          ...p.addLRSProviderDialog,
          lrsProviderUpdated: true,
        },
      }));
    } catch (error) {
      console.log(error);
    }
  };

  const handleCopyBasicAuth = (basicAuth) => {
    navigator.clipboard
      .writeText(basicAuth)
      .then(() => setCopiedCode(!copiedCode));
    enqueueSnackbar("Basic auth copied", { variant: "success" });
  };

  return (
    <>
      <Stack spacing={2}>
        {state.user.lrsProviderList?.map((lrs, index) => {
          return (
            <Stack direction="row" spacing={2} key={lrs.lrsId}>
              <Typography sx={{ pt: 1.5 }}>#{index + 1}</Typography>
              <Box sx={{ width: "100%" }}>
                <Accordion variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{lrs.lrsTitle}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container direction="column" spacing={2}>
                      <Grid container spacing={1} alignItems="center">
                        <Typography>LRS name:</Typography>
                        <Chip label={lrs.lrsTitle} />
                        <IconButton size="small" disabled color="primary">
                          <Edit />
                        </IconButton>
                      </Grid>
                      <Grid container spacing={1} alignItems="center">
                        <Typography>#Statements:</Typography>
                        <Chip label={lrs.statementCount} />
                      </Grid>
                      <Grid container spacing={1} alignItems="center">
                        <Typography>Created at:</Typography>
                        <Chip label={lrs.createdAt} />
                      </Grid>
                      <Grid container spacing={1}>
                        <Typography>Basic Auth: </Typography>
                        <Grid size="grow">
                          <Typography sx={{ wordBreak: "break-all" }}>
                            {lrs.basicAuth}
                          </Typography>
                        </Grid>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleCopyBasicAuth(lrs.basicAuth)}
                        >
                          <ContentCopy />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                  <AccordionActions>
                    <Button
                      color="error"
                      onClick={() => handleToggleDelete(lrs.lrsId)}
                    >
                      Delete
                    </Button>
                    <DeleteDialog
                      open={
                        state.deleteLrsProviderDialog.open &&
                        state.deleteLrsProviderDialog.lrsProviderId ===
                          lrs.lrsId
                      }
                      toggleOpen={handleToggleDelete}
                      message={
                        <>
                          <Typography>
                            {`This will delete the LRS permanently. ${
                              lrs.statementCount > 0
                                ? `There are ${lrs.statementCount} statements.`
                                : ""
                            } You cannot undo this action.`}
                          </Typography>
                        </>
                      }
                      handleDelete={handleDeleteLrs}
                    />
                  </AccordionActions>
                </Accordion>
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </>
  );
};
export default ManageLrsProviderList;
