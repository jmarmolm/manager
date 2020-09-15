import * as React from 'react';
import Box from 'src/components/core/Box';
import { makeStyles, Theme } from 'src/components/core/styles';
import Typography from 'src/components/core/Typography';
import DateTimeDisplay from 'src/components/DateTimeDisplay';
import EntityIcon from 'src/components/EntityIcon';
import Grid from 'src/components/Grid';
import TableCell from 'src/components/TableCell/TableCell_CMR';
import TableRow from 'src/components/TableRow/TableRow_CMR';
import { readableBytes } from 'src/utilities/unitConversions';
import ObjectActionMenu from './ObjectActionMenu_CMR';
import Hidden from 'src/components/core/Hidden';

const useStyles = makeStyles((theme: Theme) => ({
  manuallyCreated: {
    '&:before': {
      backgroundColor: theme.bg.lightBlue
    }
  },
  folderNameWrapper: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center'
  },
  iconWrapper: {
    margin: '2px 0'
  },
  manuallyCreatedIcon: {
    '& g': {
      fill: theme.bg.lightBlue
    }
  },
  actionCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 0
  }
}));

interface Props {
  displayName: string;
  fullName: string;
  objectSize: number;
  objectLastModified: string;
  handleClickDownload: (objectName: string, newTab: boolean) => void;
  handleClickDelete: (objectName: string) => void;
  manuallyCreated: boolean;
}

const ObjectTableRow: React.FC<Props> = props => {
  const {
    displayName,
    fullName,
    objectSize,
    objectLastModified,
    handleClickDownload,
    handleClickDelete,
    manuallyCreated
  } = props;

  const classes = useStyles();

  return (
    <TableRow
      ariaLabel={displayName}
      className={manuallyCreated ? classes.manuallyCreated : ''}
    >
      <TableCell>
        <Grid container wrap="nowrap" alignItems="center">
          <Grid item className="py0">
            <EntityIcon
              variant="object"
              size={20}
              className={manuallyCreated ? classes.manuallyCreatedIcon : ''}
            />
          </Grid>
          <Grid item>
            <Box display="flex" alignItems="center">
              <Typography>
                <strong>{displayName}</strong>
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </TableCell>
      <TableCell noWrap>{readableBytes(objectSize).formatted}</TableCell>
      <Hidden smDown>
        <TableCell noWrap>
          <DateTimeDisplay value={objectLastModified} humanizeCutoff="never" />
        </TableCell>
      </Hidden>
      <TableCell className={classes.actionCell}>
        <ObjectActionMenu
          handleClickDownload={handleClickDownload}
          handleClickDelete={handleClickDelete}
          objectName={fullName}
        />
      </TableCell>
    </TableRow>
  );
};

export default React.memo(ObjectTableRow);
