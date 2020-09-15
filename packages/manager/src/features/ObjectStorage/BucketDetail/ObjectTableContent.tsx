import { APIError } from '@linode/api-v4/lib/types';
import * as React from 'react';
import TableRowEmptyState from 'src/components/TableRowEmptyState';
import TableRowEmptyState_CMR from 'src/components/TableRowEmptyState/TableRowEmptyState_CMR';
import TableRowError from 'src/components/TableRowError';
import TableRowError_CMR from 'src/components/TableRowError/TableRowError_CMR';
import TableRowLoading from 'src/components/TableRowLoading';
import TableRowLoading_CMR from 'src/components/TableRowLoading/TableRowLoading_CMR';
import { useWindowDimensions } from 'src/hooks/useWindowDimensions';
import { truncateEnd, truncateMiddle } from 'src/utilities/truncate';
import { ExtendedObject } from '../utilities';
import FolderTableRow from './FolderTableRow';
import ObjectTableRow from './ObjectTableRow';
import ObjectTableRow_CMR from './ObjectTableRow_CMR';
import { useFlags } from 'src/hooks/useFlags';

interface Props {
  data: ExtendedObject[];
  loading: boolean;
  error?: APIError[];
  prefix: string;
  handleClickDownload: (objectName: string, newTab: boolean) => void;
  handleClickDelete: (objectName: string) => void;
}

const ObjectTableContent: React.FC<Props> = props => {
  const {
    data,
    loading,
    error,
    prefix,
    handleClickDownload,
    handleClickDelete
  } = props;

  const flags = useFlags();

  const { width } = useWindowDimensions();

  if (loading && data.length === 0) {
    return flags.cmr ? (
      <TableRowLoading_CMR colSpan={4} firstColWidth={20} />
    ) : (
      <TableRowLoading colSpan={4} firstColWidth={20} />
    );
  }

  if (error) {
    return flags.cmr ? (
      <TableRowError_CMR
        colSpan={6}
        message="We were unable to load your Objects."
      />
    ) : (
      <TableRowError
        colSpan={6}
        message="We were unable to load your Objects."
      />
    );
  }

  // If there is no prefix, this is NOT a folder, so display the empty bucket message.
  if (data.length === 0 && !prefix) {
    return flags.cmr ? (
      <TableRowEmptyState_CMR colSpan={6} message="This bucket is empty." />
    ) : (
      <TableRowEmptyState
        colSpan={6}
        message="This bucket is empty."
        // @todo: When we have the ability to add objects, use this message:
        // message="This bucket is empty. Click here to add Objects."
      />
    );
  }

  // A folder is considered "empty" if `_shouldDisplayObject` is `false` for
  // every object in the folder.
  const isFolderEmpty = data.every(object => !object._shouldDisplayObject);

  if (isFolderEmpty) {
    return flags.cmr ? (
      <TableRowEmptyState_CMR colSpan={6} message="This folder is empty." />
    ) : (
      <TableRowEmptyState colSpan={6} message="This folder is empty." />
      // @todo: When we have the ability to add objects, use this message:
      // <TableRowEmptyState colSpan={6} message="This folder is empty. Click here to add Objects." />
    );
  }

  // Be more strict with truncation lengths on smaller viewports.
  const maxNameWidth = width < 600 ? 20 : 40;

  return (
    <>
      {data.map(object => {
        if (!object._shouldDisplayObject) {
          return null;
        }

        if (object._isFolder) {
          return (
            <FolderTableRow
              key={object.name}
              folderName={object.name}
              displayName={truncateEnd(object._displayName, maxNameWidth)}
              manuallyCreated={object._manuallyCreated}
            />
          );
        }

        return flags.cmr ? (
          <ObjectTableRow_CMR
            key={object.name}
            displayName={truncateMiddle(object._displayName, maxNameWidth)}
            fullName={object.name}
            /**
             * In reality, if there's no `size` or `last_modified`, we're
             * probably dealing with a folder and will have already returned
             * `null`. The OR fallbacks are to make TSC happy, and to safeguard
             * in the event of the data being something we don't expect.
             */
            objectSize={object.size || 0}
            objectLastModified={object.last_modified || ''}
            manuallyCreated={object._manuallyCreated}
            handleClickDownload={handleClickDownload}
            handleClickDelete={handleClickDelete}
          />
        ) : (
          <ObjectTableRow
            key={object.name}
            displayName={truncateMiddle(object._displayName, maxNameWidth)}
            fullName={object.name}
            /**
             * In reality, if there's no `size` or `last_modified`, we're
             * probably dealing with a folder and will have already returned
             * `null`. The OR fallbacks are to make TSC happy, and to safeguard
             * in the event of the data being something we don't expect.
             */
            objectSize={object.size || 0}
            objectLastModified={object.last_modified || ''}
            manuallyCreated={object._manuallyCreated}
            handleClickDownload={handleClickDownload}
            handleClickDelete={handleClickDelete}
          />
        );
      })}
      {loading &&
        (flags.cmr ? (
          <TableRowLoading_CMR colSpan={12} transparent />
        ) : (
          <TableRowLoading colSpan={12} transparent />
        ))}
    </>
  );
};

export default React.memo(ObjectTableContent);
