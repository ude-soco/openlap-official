import { useContext } from "react";
import PropTypes from "prop-types";
import { IconButton, Stack, Tooltip } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorageIcon from "@mui/icons-material/Storage";
import DeleteDialog from "../../../common/components/delete-dialog/delete-dialog.jsx";
import ResourceCard from "../../../common/components/resource-card/resource-card.jsx";
import MetadataChip from "../../../common/components/metadata-chip/metadata-chip.jsx";
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
          <ResourceCard
            key={lrs.id}
            index={index + 1}
            title={lrs.lrsTitle}
            icon={StorageIcon}
            actions={
              <Tooltip title="Delete LRS" arrow>
                <IconButton
                  color="error"
                  aria-label={`Delete LRS ${lrs.lrsTitle}`}
                  onClick={() => handleToggleDelete(lrs.id)}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            }
          >
            <MetadataChip
              label="Unique identifier"
              value={lrs.uniqueIdentifier}
            />
          </ResourceCard>
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

ManageLrsConsumerList.propTypes = {
  state: PropTypes.object.isRequired,
  setState: PropTypes.func.isRequired,
};

export default ManageLrsConsumerList;
