import { useContext } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteDialog from "../../../common/components/delete-dialog/delete-dialog.jsx";
import { requestDeleteLrsConsumer } from "../utils/account-manager-api.js";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const ManageLrsConsumerList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const handleToggleDelete = (lrsConsumerId = "") => {
    setState((p) => ({
      ...p,
      deleteLrsConsumerDialog: {
        ...p.deleteLrsConsumerDialog,
        open: !p.deleteLrsConsumerDialog.open,
        lrsConsumerId: lrsConsumerId,
      },
    }));
  };

  const handleDeleteLrs = async () => {
    try {
      await requestDeleteLrsConsumer(
        api,
        state.deleteLrsConsumerDialog.lrsConsumerId
      );
      setState((p) => ({
        ...p,
        addLRSConsumerDialog: {
          ...p.addLRSConsumerDialog,
          lrsConsumerUpdated: true,
        },
      }));
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <Stack spacing={2}>
        {state.user.lrsConsumerList?.map((lrs, index) => (
          <Stack direction="row" key={lrs.id} spacing={2}>
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
                    </Grid>
                    <Grid container spacing={1} alignItems="center">
                      <Typography>Unique Identifier:</Typography>
                      <Chip label={lrs.uniqueIdentifier} />
                    </Grid>
                  </Grid>
                </AccordionDetails>
                <AccordionActions>
                  <Button
                    color="error"
                    onClick={() => handleToggleDelete(lrs.id)}
                  >
                    Delete
                  </Button>
                </AccordionActions>
              </Accordion>
            </Box>
          </Stack>
        ))}
      </Stack>
      <DeleteDialog
        open={state.deleteLrsConsumerDialog.open}
        toggleOpen={handleToggleDelete}
        message="This will delete the LRS permanently. You cannot undo this action."
        handleDelete={handleDeleteLrs}
      />
    </>
  );
};

export default ManageLrsConsumerList;
