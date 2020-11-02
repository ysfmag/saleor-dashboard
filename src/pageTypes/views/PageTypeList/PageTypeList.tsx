import DialogContentText from "@material-ui/core/DialogContentText";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import ActionDialog from "@saleor/components/ActionDialog";
import DeleteFilterTabDialog from "@saleor/components/DeleteFilterTabDialog";
import SaveFilterTabDialog, {
  SaveFilterTabDialogFormData
} from "@saleor/components/SaveFilterTabDialog";
import useBulkActions from "@saleor/hooks/useBulkActions";
import useListSettings from "@saleor/hooks/useListSettings";
import useNavigator from "@saleor/hooks/useNavigator";
import useNotifier from "@saleor/hooks/useNotifier";
import usePaginator, {
  createPaginationState
} from "@saleor/hooks/usePaginator";
import { commonMessages } from "@saleor/intl";
import { getStringOrPlaceholder } from "@saleor/misc";
import { usePageTypeBulkDeleteMutation } from "@saleor/pageTypes/mutations";
import { ListViews } from "@saleor/types";
import createDialogActionHandlers from "@saleor/utils/handlers/dialogActionHandlers";
import createSortHandler from "@saleor/utils/handlers/sortHandler";
import { getSortParams } from "@saleor/utils/sort";
import React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { configurationMenuUrl } from "../../../configuration";
import PageTypeListPage from "../../components/PageTypeListPage";
import { usePageTypeListQuery } from "../../queries";
import {
  pageTypeAddUrl,
  pageTypeListUrl,
  PageTypeListUrlDialog,
  PageTypeListUrlFilters,
  PageTypeListUrlQueryParams,
  pageTypeUrl
} from "../../urls";
import {
  areFiltersApplied,
  deleteFilterTab,
  getActiveFilters,
  getFilterTabs,
  getFilterVariables,
  saveFilterTab
} from "./filters";
import { getSortQueryVariables } from "./sort";

interface PageTypeListProps {
  params: PageTypeListUrlQueryParams;
}

export const PageTypeList: React.FC<PageTypeListProps> = ({ params }) => {
  const navigate = useNavigator();
  const paginate = usePaginator();
  const notify = useNotifier();
  const { isSelected, listElements, reset, toggle, toggleAll } = useBulkActions(
    params.ids
  );
  const intl = useIntl();
  const { settings } = useListSettings(ListViews.PAGES_LIST);

  const paginationState = createPaginationState(settings.rowNumber, params);
  const queryVariables = React.useMemo(
    () => ({
      ...paginationState,
      filter: getFilterVariables(params),
      sort: getSortQueryVariables(params)
    }),
    [params]
  );
  const { data, loading, refetch } = usePageTypeListQuery({
    displayLoader: true,
    variables: queryVariables
  });

  const tabs = getFilterTabs();

  const currentTab =
    params.activeTab === undefined
      ? areFiltersApplied(params)
        ? tabs.length + 1
        : 0
      : parseInt(params.activeTab, 0);

  const changeFilterField = (filter: PageTypeListUrlFilters) => {
    reset();
    navigate(
      pageTypeListUrl({
        ...getActiveFilters(params),
        ...filter,
        activeTab: undefined
      })
    );
  };

  const [openModal, closeModal] = createDialogActionHandlers<
    PageTypeListUrlDialog,
    PageTypeListUrlQueryParams
  >(navigate, pageTypeListUrl, params);

  const handleTabChange = (tab: number) => {
    reset();
    navigate(
      pageTypeListUrl({
        activeTab: tab.toString(),
        ...getFilterTabs()[tab - 1].data
      })
    );
  };

  const handleTabDelete = () => {
    deleteFilterTab(currentTab);
    reset();
    navigate(pageTypeListUrl());
  };

  const handleTabSave = (data: SaveFilterTabDialogFormData) => {
    saveFilterTab(data.name, getActiveFilters(params));
    handleTabChange(tabs.length + 1);
  };

  const { loadNextPage, loadPreviousPage, pageInfo } = paginate(
    data?.pageTypes?.pageInfo,
    paginationState,
    params
  );

  const handleSort = createSortHandler(navigate, pageTypeListUrl, params);

  const [
    pageTypeBulkDelete,
    pageTypeBulkDeleteOpts
  ] = usePageTypeBulkDeleteMutation({
    onCompleted: data => {
      if (data.pageTypeBulkDelete.errors.length === 0) {
        notify({
          status: "success",
          text: intl.formatMessage(commonMessages.savedChanges)
        });
        reset();
        refetch();
        navigate(
          pageTypeListUrl({
            ...params,
            action: undefined,
            ids: undefined
          })
        );
      }
    }
  });

  const hanldePageTypeBulkDelete = () =>
    pageTypeBulkDelete({
      variables: {
        ids: params.ids
      }
    });

  return (
    <>
      <PageTypeListPage
        currentTab={currentTab}
        initialSearch={params.query || ""}
        onSearchChange={query => changeFilterField({ query })}
        onAll={() => navigate(pageTypeListUrl())}
        onTabChange={handleTabChange}
        onTabDelete={() => openModal("delete-search")}
        onTabSave={() => openModal("save-search")}
        tabs={tabs.map(tab => tab.name)}
        disabled={loading}
        pageTypes={data?.pageTypes?.edges?.map(edge => edge.node)}
        pageInfo={pageInfo}
        onAdd={() => navigate(pageTypeAddUrl)}
        onBack={() => navigate(configurationMenuUrl)}
        onNextPage={loadNextPage}
        onPreviousPage={loadPreviousPage}
        onRowClick={id => () => navigate(pageTypeUrl(id))}
        onSort={handleSort}
        isChecked={isSelected}
        selected={listElements.length}
        sort={getSortParams(params)}
        toggle={toggle}
        toggleAll={toggleAll}
        toolbar={
          <IconButton
            color="primary"
            onClick={() =>
              openModal("remove", {
                ids: listElements
              })
            }
          >
            <DeleteIcon />
          </IconButton>
        }
      />
      <ActionDialog
        confirmButtonState={pageTypeBulkDeleteOpts.status}
        onClose={closeModal}
        onConfirm={hanldePageTypeBulkDelete}
        open={params.action === "remove"}
        title={intl.formatMessage({
          defaultMessage: "Delete Page Types",
          description: "dialog header"
        })}
        variant="delete"
      >
        <DialogContentText>
          <FormattedMessage
            defaultMessage="{counter,plural,one{Are you sure you want to delete this page type? Deleting it will also delete any associated pages.} other{Are you sure you want to delete {displayQuantity} page types? Deleting them will also delete any associated pages.}}"
            description="dialog content"
            values={{
              counter: params.ids?.length,
              displayQuantity: <strong>{params.ids?.length}</strong>
            }}
          />
        </DialogContentText>
      </ActionDialog>
      <SaveFilterTabDialog
        open={params.action === "save-search"}
        confirmButtonState="default"
        onClose={closeModal}
        onSubmit={handleTabSave}
      />
      <DeleteFilterTabDialog
        open={params.action === "delete-search"}
        confirmButtonState="default"
        onClose={closeModal}
        onSubmit={handleTabDelete}
        tabName={getStringOrPlaceholder(tabs[currentTab - 1]?.name)}
      />
    </>
  );
};
PageTypeList.displayName = "PageTypeList";
export default PageTypeList;
