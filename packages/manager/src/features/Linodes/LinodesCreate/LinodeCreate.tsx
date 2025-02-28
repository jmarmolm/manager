import { restoreBackup } from '@linode/api-v4/lib/linodes';
import { CreateLinodeSchema } from '@linode/validation/lib/linodes.schema';
import Grid from '@mui/material/Unstable_Grid2';
import cloneDeep from 'lodash.clonedeep';
import * as React from 'react';
import { connect } from 'react-redux';
import { v4 } from 'uuid';

import { AccessPanel } from 'src/components/AccessPanel/AccessPanel';
import { AkamaiBanner } from 'src/components/AkamaiBanner/AkamaiBanner';
import { Box } from 'src/components/Box';
import { Checkbox } from 'src/components/Checkbox';
import { CheckoutSummary } from 'src/components/CheckoutSummary/CheckoutSummary';
import { CircleProgress } from 'src/components/CircleProgress';
import { DetailsPanel } from 'src/components/DetailsPanel/DetailsPanel';
import { DocsLink } from 'src/components/DocsLink/DocsLink';
import { ErrorMessage } from 'src/components/ErrorMessage';
import { ErrorState } from 'src/components/ErrorState/ErrorState';
import { FormControlLabel } from 'src/components/FormControlLabel';
import { Link } from 'src/components/Link';
import { Notice } from 'src/components/Notice/Notice';
import { getIsDistributedRegion } from 'src/components/RegionSelect/RegionSelect.utils';
import { SelectRegionPanel } from 'src/components/SelectRegionPanel/SelectRegionPanel';
import { Stack } from 'src/components/Stack';
import { SafeTabPanel } from 'src/components/Tabs/SafeTabPanel';
import { TabLinkList } from 'src/components/Tabs/TabLinkList';
import { TabPanels } from 'src/components/Tabs/TabPanels';
import { Tabs } from 'src/components/Tabs/Tabs';
import { Typography } from 'src/components/Typography';
import { FIREWALL_GET_STARTED_LINK } from 'src/constants';
import { EUAgreementCheckbox } from 'src/features/Account/Agreements/EUAgreementCheckbox';
import { PlansPanel } from 'src/features/components/PlansPanel/PlansPanel';
import {
  getMonthlyAndHourlyNodePricing,
  utoa,
} from 'src/features/Linodes/LinodesCreate/utilities';
import { regionSupportsMetadata } from 'src/features/Linodes/LinodesCreate/utilities';
import { SMTPRestrictionText } from 'src/features/Linodes/SMTPRestrictionText';
import {
  getCommunityStackscripts,
  getMineAndAccountStackScripts,
} from 'src/features/StackScripts/stackScriptUtils';
import { handleChangeCreateType } from 'src/store/linodeCreate/linodeCreate.actions';
import { getInitialType } from 'src/store/linodeCreate/linodeCreate.reducer';
import {
  sendApiAwarenessClickEvent,
  sendLinodeCreateFlowDocsClickEvent,
} from 'src/utilities/analytics/customEventAnalytics';
import {
  sendLinodeCreateFormErrorEvent,
  sendLinodeCreateFormInputEvent,
} from 'src/utilities/analytics/formEventAnalytics';
import { doesRegionSupportFeature } from 'src/utilities/doesRegionSupportFeature';
import { getErrorMap } from 'src/utilities/errorUtils';
import { extendType } from 'src/utilities/extendType';
import { filterCurrentTypes } from 'src/utilities/filterCurrentLinodeTypes';
import { getMonthlyBackupsPrice } from 'src/utilities/pricing/backups';
import { UNKNOWN_PRICE } from 'src/utilities/pricing/constants';
import { renderMonthlyPriceToCorrectDecimalPlace } from 'src/utilities/pricing/dynamicPricing';
import { getQueryParamsFromQueryString } from 'src/utilities/queryParams';
import { scrollErrorIntoViewV2 } from 'src/utilities/scrollErrorIntoViewV2';

import { SelectFirewallPanel } from '../../../components/SelectFirewallPanel/SelectFirewallPanel';
import { AddonsPanel } from './AddonsPanel';
import { ApiAwarenessModal } from './ApiAwarenessModal/ApiAwarenessModal';
import {
  StyledButtonGroupBox,
  StyledCreateButton,
  StyledForm,
  StyledMessageDiv,
  StyledPaper,
  StyledTabPanel,
} from './LinodeCreate.styles';
import { FromAppsContent } from './TabbedContent/FromAppsContent';
import { FromBackupsContent } from './TabbedContent/FromBackupsContent';
import { FromImageContent } from './TabbedContent/FromImageContent';
import { FromLinodeContent } from './TabbedContent/FromLinodeContent';
import { FromStackScriptContent } from './TabbedContent/FromStackScriptContent';
import { renderBackupsDisplaySection } from './TabbedContent/utils';
import { VPCPanel } from './VPCPanel';

import type {
  AllFormStateAndHandlers,
  AppsData,
  HandleSubmit,
  Info,
  LinodeCreateValidation,
  ReduxStateProps,
  StackScriptFormStateHandlers,
  TypeInfo,
  WithDisplayData,
  WithTypesRegionsAndImages,
} from './types';
import type { PlacementGroup } from '@linode/api-v4';
import type {
  CreateLinodePlacementGroupPayload,
  CreateLinodeRequest,
  EncryptionStatus,
  InterfacePayload,
  PriceObject,
} from '@linode/api-v4';
import type { Tag } from '@linode/api-v4/lib/tags/types';
import type { MapDispatchToProps } from 'react-redux';
import type { RouteComponentProps } from 'react-router-dom';
import type { Tab } from 'src/components/Tabs/TabLinkList';
import type { WithAccountProps } from 'src/containers/account.container';
import type { WithFeatureFlagProps } from 'src/containers/flags.container';
import type { WithImagesProps as ImagesProps } from 'src/containers/images.container';
import type { RegionsProps } from 'src/containers/regions.container';
import type { WithTypesProps } from 'src/containers/types.container';
import type { WithLinodesProps } from 'src/containers/withLinodes.container';
import type { LinodeCreateType } from 'src/features/Linodes/LinodesCreate/types';
import type { LinodeCreateQueryParams } from 'src/features/Linodes/types';
import type { CreateTypes } from 'src/store/linodeCreate/linodeCreate.actions';
import type { ExtendedIP } from 'src/utilities/ipUtils';

export interface LinodeCreateProps {
  additionalIPv4RangesForVPC: ExtendedIP[];
  assignPublicIPv4Address: boolean;
  autoassignIPv4WithinVPC: boolean;
  checkValidation: LinodeCreateValidation;
  checkedFirewallAuthorization: boolean;
  createType: CreateTypes;
  diskEncryptionEnabled: boolean;
  firewallId: number | undefined;
  handleAgreementChange: () => void;
  handleFirewallAuthorizationChange: () => void;
  handleFirewallChange: (firewallId: number) => void;
  handleIPv4RangesForVPC: (ranges: ExtendedIP[]) => void;
  handlePlacementGroupChange: (placementGroup: PlacementGroup | null) => void;
  handleShowApiAwarenessModal: () => void;
  handleSubmitForm: HandleSubmit;
  handleSubnetChange: (subnetId: number | undefined) => void;
  handleVLANChange: (updatedInterface: InterfacePayload) => void;
  handleVPCIPv4Change: (IPv4: string) => void;
  history: any;
  imageDisplayInfo: Info;
  ipamAddress: null | string;
  label: string;
  placementGroupSelection?: PlacementGroup;
  regionDisplayInfo: Info;
  resetCreationState: () => void;
  selectedSubnetId?: number;
  selectedVPCId?: number;
  setAuthorizedUsers: (usernames: string[]) => void;
  setBackupID: (id: number) => void;
  setSelectedVPC: (vpcID: number) => void;
  showApiAwarenessModal: boolean;
  showFirewallAuthorization: boolean;
  showGDPRCheckbox: boolean;
  showGeneralError?: boolean;
  signedAgreement: boolean;
  toggleAssignPublicIPv4Address: () => void;
  toggleAutoassignIPv4WithinVPCEnabled: () => void;
  toggleBackupsEnabled: () => void;
  toggleDiskEncryptionEnabled: () => void;
  togglePrivateIPEnabled: () => void;
  typeDisplayInfo: TypeInfo;
  updateDiskSize: (size: number) => void;
  updateLabel: (label: string) => void;
  updateLinodeID: (id: number, diskSize?: number | undefined) => void;
  updatePassword: (password: string) => void;
  updateTags: (tags: Tag[]) => void;
  updateUserData: (userData: string) => void;
  userData: string | undefined;
  vlanLabel: null | string;
  vpcIPv4AddressOfLinode: string | undefined;
}

const errorMap = [
  'backup_id',
  'image',
  'label',
  'linode_id',
  'region',
  'root_pass',
  'stackscript_id',
  'type',
  'interfaces[1].label',
  'interfaces[1].ipam_address',
  'interfaces[0].subnet_id',
  'ipv4.vpc',
  'placement_group',
];

type InnerProps = WithTypesRegionsAndImages &
  ReduxStateProps &
  StackScriptFormStateHandlers &
  LinodeCreateProps;

type CombinedProps = AllFormStateAndHandlers &
  AppsData &
  WithFeatureFlagProps &
  ImagesProps &
  InnerProps &
  ReduxStateProps &
  RegionsProps &
  RouteComponentProps<{}> &
  WithAccountProps &
  WithDisplayData &
  WithLinodesProps &
  WithTypesProps;

interface State {
  hasError: boolean;
  numberOfNodes: number;
  planKey: string;
  selectedTab: number;
  stackScriptSelectedTab: number;
}

interface CreateTab extends Tab {
  type: CreateTypes;
}

interface LinodeCreateComponentProps extends CombinedProps, DispatchProps {}

export class LinodeCreate extends React.PureComponent<
  LinodeCreateComponentProps,
  State
> {
  createLinode = () => {
    const payload = this.getPayload();

    try {
      CreateLinodeSchema.validateSync(payload, {
        abortEarly: true,
      });
      this.setState({ hasError: false });
    } catch (e) {
      this.setState({ hasError: true }, () => {
        scrollErrorIntoViewV2(this.createLinodeFormRef);
      });
    }
    this.props.handleSubmitForm(payload, this.props.selectedLinodeID);
  };

  createLinodeFormRef = React.createRef<HTMLFormElement>();

  filterTypes = () => {
    const { createType, typesData } = this.props;
    const { selectedTab } = this.state;
    const currentTypes = filterCurrentTypes(typesData?.map(extendType));

    return ['fromBackup', 'fromImage'].includes(createType) && selectedTab !== 0
      ? currentTypes.filter((t) => t.class !== 'metal')
      : currentTypes;
  };

  getPayload = () => {
    const selectedRegion = this.props.selectedRegionID || '';

    const regionSupportsVLANs = doesRegionSupportFeature(
      selectedRegion,
      this.props.regionsData,
      'Vlans'
    );

    const regionSupportsVPCs = doesRegionSupportFeature(
      this.props.selectedRegionID ?? '',
      this.props.regionsData,
      'VPCs'
    );

    const regionSupportsDiskEncryption = doesRegionSupportFeature(
      this.props.selectedRegionID ?? '',
      this.props.regionsData,
      'Disk Encryption'
    );

    const hasDiskEncryptionAccountCapability = this.props.account.data?.capabilities?.includes(
      'Disk Encryption'
    );

    const isDiskEncryptionFeatureEnabled =
      this.props.flags.linodeDiskEncryption &&
      hasDiskEncryptionAccountCapability;

    const diskEncryptionPayload: EncryptionStatus = this.props
      .diskEncryptionEnabled
      ? 'enabled'
      : 'disabled';

    const placement_group_payload: CreateLinodePlacementGroupPayload = {
      id: this.props.placementGroupSelection?.id ?? -1,
    };

    // eslint-disable-next-line sonarjs/no-unused-collection
    const interfaces: InterfacePayload[] = [];

    const payload: CreateLinodeRequest = {
      authorized_users: this.props.authorized_users,
      backup_id: this.props.selectedBackupID,
      backups_enabled: this.props.backupsEnabled,
      booted: true,
      disk_encryption:
        isDiskEncryptionFeatureEnabled && regionSupportsDiskEncryption
          ? diskEncryptionPayload
          : undefined,
      firewall_id: this.props.firewallId,
      image: this.props.selectedImageID,
      label: this.props.label,
      placement_group:
        placement_group_payload.id !== -1 ? placement_group_payload : undefined,
      private_ip: this.props.privateIPEnabled,
      region: this.props.selectedRegionID ?? '',
      root_pass: this.props.password,
      stackscript_data: this.props.selectedUDFs,

      // StackScripts
      stackscript_id: this.props.selectedStackScriptID,
      tags: this.props.tags
        ? this.props.tags.map((eachTag) => eachTag.label)
        : [],
      type: this.props.selectedTypeID ?? '',
    };

    if (
      regionSupportsVPCs &&
      this.props.selectedVPCId !== undefined &&
      this.props.selectedVPCId !== -1
    ) {
      const vpcInterfaceData: InterfacePayload = {
        ip_ranges: this.props.additionalIPv4RangesForVPC
          .map((ipRange) => ipRange.address)
          .filter((ipRange) => ipRange !== ''),
        ipam_address: null,
        ipv4: {
          nat_1_1: this.props.assignPublicIPv4Address ? 'any' : undefined,
          vpc: this.props.autoassignIPv4WithinVPC
            ? undefined
            : this.props.vpcIPv4AddressOfLinode,
        },
        label: null,
        primary: true,
        purpose: 'vpc',
        subnet_id: this.props.selectedSubnetId,
        vpc_id: this.props.selectedVPCId,
      };

      interfaces.unshift(vpcInterfaceData);
    }

    if (
      regionSupportsVLANs &&
      this.props.selectedImageID &&
      Boolean(this.props.vlanLabel)
    ) {
      // The region must support VLANs and an image and VLAN
      // must be selected
      interfaces.push({
        ipam_address: this.props.ipamAddress,
        label: this.props.vlanLabel,
        purpose: 'vlan',
      });
    }

    if (this.props.userData) {
      payload['metadata'] = {
        user_data: utoa(this.props.userData),
      };
    }

    const vpcAssigned = interfaces.some(
      (_interface) => _interface.purpose === 'vpc'
    );
    const vlanAssigned = interfaces.some(
      (_interface) => _interface.purpose === 'vlan'
    );

    // Only submit 'interfaces' in the payload if there are VPCs
    // or VLANs
    if (interfaces.length > 0) {
      // Determine position of the default public interface

      // Case 1: VLAN assigned, no VPC assigned
      if (!vpcAssigned) {
        interfaces.unshift(defaultPublicInterface);
      }

      // Case 2: VPC assigned, no VLAN assigned, Private IP enabled
      if (!vlanAssigned && this.props.privateIPEnabled) {
        interfaces.push(defaultPublicInterface);
      }

      // Case 3: VPC and VLAN assigned + Private IP enabled
      if (vpcAssigned && vlanAssigned && this.props.privateIPEnabled) {
        interfaces.push(defaultPublicInterface);
      }

      payload['interfaces'] = interfaces;
    }

    return payload;
  };

  handleAnalyticsFormError = (
    errorMap: Partial<Record<string, string | undefined>>
  ) => {
    const { selectedTab } = this.state;
    const selectedTabName = this.tabs[selectedTab].title as LinodeCreateType;
    let errorString = '';

    if (!errorMap) {
      return;
    }
    if (errorMap.region) {
      errorString += errorMap.region;
    }
    if (errorMap.type) {
      errorString += `${errorString.length > 0 ? `|` : ''}${errorMap.type}`;
    }
    if (errorMap.root_pass) {
      errorString += `${errorString.length > 0 ? `|` : ''}${
        errorMap.root_pass
      }`;
    }

    sendLinodeCreateFormErrorEvent(errorString, selectedTabName ?? 'OS');
  };

  handleClickCreateUsingCommandLine = (
    isDxToolsAdditionsEnabled: boolean | undefined
  ) => {
    const payload = {
      authorized_users: this.props.authorized_users,
      backup_id: this.props.selectedBackupID,
      backups_enabled: this.props.backupsEnabled,
      booted: true,
      image: this.props.selectedImageID,
      label: this.props.label,
      private_ip: this.props.privateIPEnabled,
      region: this.props.selectedRegionID ?? '',
      root_pass: this.props.password,
      stackscript_data: this.props.selectedUDFs,
      // StackScripts
      stackscript_id: this.props.selectedStackScriptID,

      tags: this.props.tags
        ? this.props.tags.map((eachTag) => eachTag.label)
        : [],
      type: this.props.selectedTypeID ?? '',
    };
    sendLinodeCreateFormInputEvent({
      createType: 'OS',
      interaction: 'click',
      label: isDxToolsAdditionsEnabled
        ? 'View Code Snippets'
        : 'Create Using Command Line',
    });
    sendApiAwarenessClickEvent(
      'Button',
      isDxToolsAdditionsEnabled
        ? 'View Code Snippets'
        : 'Create Using Command Line'
    );
    this.props.checkValidation(payload);
  };

  handleTabChange = (index: number) => {
    this.props.resetCreationState();

    /** set the tab in redux state */
    this.props.setTab(this.tabs[index].type);

    /** Reset the plan panel since types may have shifted */

    this.setState({
      planKey: v4(),
      selectedTab: index,
    });
  };

  mounted: boolean = false;

  setNumberOfNodesForAppCluster = (num: number) => {
    this.setState({
      numberOfNodes: num,
    });
  };

  stackScriptTabs: CreateTab[] = [
    {
      routeName: `${this.props.match.url}?type=StackScripts&subtype=Account`,
      title: 'Account StackScripts',
      type: 'fromStackScript',
    },
    {
      routeName: `${this.props.match.url}?type=StackScripts&subtype=Community`,
      title: 'Community StackScripts',
      type: 'fromStackScript',
    },
  ];

  tabs: CreateTab[] = [
    {
      routeName: `${this.props.match.url}?type=OS`,
      title: 'OS',
      type: 'fromImage',
    },
    {
      routeName: `${this.props.match.url}?type=One-Click`,
      title: 'Marketplace',
      type: 'fromApp',
    },
    {
      routeName: `${this.props.match.url}?type=StackScripts`,
      title: 'StackScripts',
      type: 'fromStackScript',
    },
    {
      routeName: `${this.props.match.url}?type=Images`,
      title: 'Images',
      type: 'fromImage',
    },
    {
      routeName: `${this.props.match.url}?type=Backups`,
      title: 'Backups',
      type: 'fromBackup',
    },
    {
      routeName: `${this.props.match.url}?type=Clone%20Linode`,
      title: 'Clone Linode',
      type: 'fromLinode',
    },
  ];

  constructor(props: LinodeCreateComponentProps) {
    super(props);

    /** Get the query params as an object, excluding the "?" */
    const queryParams = getQueryParamsFromQueryString<LinodeCreateQueryParams>(
      location.search
    );

    const _tabs: LinodeCreateType[] = [
      'OS',
      'One-Click',
      'StackScripts',
      'Images',
      'Backups',
      'Clone Linode',
    ];

    /** Will be -1 if the query param is not found */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const preSelectedTab = _tabs.findIndex((eachTab, index) => {
      return eachTab === queryParams.type;
    });

    // If there is no specified "type" in the query params, update the Redux state
    // so that the correct request is made when the form is submitted.
    if (!queryParams.type) {
      this.props.setTab(this.tabs[0].type);
    }

    this.state = {
      hasError: false,
      numberOfNodes: 0,
      planKey: v4(),
      selectedTab: preSelectedTab !== -1 ? preSelectedTab : 0,
      stackScriptSelectedTab:
        preSelectedTab === 2 && location.search.search('Community') > -1
          ? 1
          : 0,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.props.setTab(getInitialType());
  }

  componentDidUpdate(prevProps: any) {
    if (this.props.errors !== prevProps.errors) {
      this.handleAnalyticsFormError(getErrorMap(errorMap, this.props.errors));
    }

    if (this.props.location.search === prevProps.location.search) {
      return;
    }
    // This is for the case where a user is already on the create flow and click the "Marketplace" link in the PrimaryNav.
    // Because it is the same route, the component will not unmount and remount, so we need to manually update the tab state.
    // This fix provides an isolated solution for this specific case.
    // Hard to make this dynamic without a larger refactor because the relationship between the tabs and the query params is not straightforward at all.
    // ex: "One-Click" is `fromApp` creationType, and `fromImage` applies to both "OS" and "Images" creation flows so getting the index of the tab
    // based on the query param is not reliable.
    // It would be wise to consider rethinking this logic when we refactor the Linode Create flow. (M3-7572)
    if (getInitialType() === 'fromApp') {
      this.handleTabChange(1);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    const { selectedTab, stackScriptSelectedTab } = this.state;

    const {
      account,
      accountBackupsEnabled,
      checkedFirewallAuthorization,
      errors,
      flags,
      formIsSubmitting,
      handleAgreementChange,
      handleFirewallAuthorizationChange,
      handlePlacementGroupChange,
      handleShowApiAwarenessModal,
      imageDisplayInfo,
      imagesData,
      imagesError,
      imagesLoading,
      label,
      linodesData,
      linodesError,
      linodesLoading,
      regionDisplayInfo,
      regionsData,
      regionsError,
      regionsLoading,
      selectedRegionID,
      showApiAwarenessModal,
      showFirewallAuthorization,
      showGDPRCheckbox,
      showGeneralError,
      signedAgreement,
      tags,
      typeDisplayInfo,
      typesData,
      typesError,
      typesLoading,
      updateLabel,
      updateTags,
      updateUserData,
      userCannotCreateLinode,
      ...rest
    } = this.props;

    const hasErrorFor = getErrorMap(errorMap, errors);
    const generalError = getErrorMap(errorMap, errors).none;
    const isDxToolsAdditionsEnabled = this.props.flags?.apicliDxToolsAdditions;

    if (regionsLoading || imagesLoading || linodesLoading || typesLoading) {
      return <CircleProgress />;
    }

    if (regionsError || imagesError || linodesError || typesError) {
      return (
        <ErrorState errorText="There was an issue loading Linode creation options." />
      );
    }

    if (!linodesData || !imagesData || !regionsData || !typesData) {
      return null;
    }

    const tagsInputProps = {
      disabled: userCannotCreateLinode,
      onChange: updateTags,
      tagError: hasErrorFor.tags,
      value: tags || [],
    };

    const hasBackups = Boolean(
      this.props.backupsEnabled || accountBackupsEnabled
    );

    const hasDiskEncryptionAccountCapability = account.data?.capabilities?.includes(
      'Disk Encryption'
    );

    const isDiskEncryptionFeatureEnabled =
      flags.linodeDiskEncryption && hasDiskEncryptionAccountCapability;

    const displaySections = [];
    if (imageDisplayInfo) {
      displaySections.push(imageDisplayInfo);
    }

    if (regionDisplayInfo) {
      displaySections.push({
        details: regionDisplayInfo.details,
        title: regionDisplayInfo.title,
      });
    }

    const linodeIsInDistributedRegion = getIsDistributedRegion(
      regionsData,
      selectedRegionID ?? ''
    );

    const regionSupportsDiskEncryption = doesRegionSupportFeature(
      this.props.selectedRegionID ?? '',
      this.props.regionsData,
      'Disk Encryption'
    );

    if (typeDisplayInfo) {
      const typeDisplayInfoCopy = cloneDeep(typeDisplayInfo);

      // Always display monthly cost to two decimals
      typeDisplayInfoCopy.details = `$${renderMonthlyPriceToCorrectDecimalPlace(
        typeDisplayInfo.monthly
      )}/month`;

      if (this.props.createType === 'fromApp' && this.state.numberOfNodes > 0) {
        const { hourlyPrice, monthlyPrice } = getMonthlyAndHourlyNodePricing(
          typeDisplayInfoCopy?.monthly,
          typeDisplayInfoCopy?.hourly,
          this.state.numberOfNodes
        );

        typeDisplayInfoCopy.details = `${
          this.state.numberOfNodes
        } Nodes - $${renderMonthlyPriceToCorrectDecimalPlace(
          monthlyPrice
        )}/month $${hourlyPrice ?? UNKNOWN_PRICE}/hr`;
      }

      // @TODO Gecko: Remove $0 hardcoding once Gecko is in GA
      if (linodeIsInDistributedRegion) {
        displaySections.push({
          ...typeDisplayInfoCopy,
          details: '$0/month',
          hourly: 0,
          monthly: 0,
        });
      } else {
        displaySections.push(typeDisplayInfoCopy);
      }
    }

    const type = typesData.find(
      (type) => type.id === this.props.selectedTypeID
    );

    const backupsMonthlyPrice:
      | PriceObject['monthly']
      | undefined = getMonthlyBackupsPrice({
      region: selectedRegionID,
      type,
    });

    if (
      hasBackups &&
      typeDisplayInfo &&
      backupsMonthlyPrice &&
      !linodeIsInDistributedRegion
    ) {
      displaySections.push(
        renderBackupsDisplaySection(accountBackupsEnabled, backupsMonthlyPrice)
      );
    }

    if (
      isDiskEncryptionFeatureEnabled &&
      regionSupportsDiskEncryption &&
      this.props.diskEncryptionEnabled
    ) {
      displaySections.push({
        title: 'Encrypted',
      });
    }

    if (this.props.vlanLabel) {
      displaySections.push({
        title: 'VLAN Attached',
      });
    }

    if (this.props.privateIPEnabled) {
      displaySections.push({
        title: 'Private IP',
      });
    }

    if (this.props.placementGroupSelection) {
      displaySections.push({
        title: 'Assigned to Placement Group',
      });
    }

    if (
      this.props.selectedVPCId !== undefined &&
      this.props.selectedVPCId !== -1
    ) {
      displaySections.push({
        title: 'VPC Assigned',
      });
    }

    if (this.props.firewallId !== undefined) {
      displaySections.push({
        title: 'Firewall Assigned',
      });
    }

    const selectedLinode = this.props.linodesData?.find(
      (image) => image.id === this.props.selectedLinodeID
    );

    const imageIsCloudInitCompatible =
      this.props.selectedImageID &&
      this.props.imagesData[this.props.selectedImageID]?.capabilities?.includes(
        'cloud-init'
      );

    const linodeIsCloudInitCompatible =
      this.props.selectedLinodeID &&
      selectedLinode?.image &&
      this.props.imagesData[selectedLinode?.image]?.capabilities?.includes(
        'cloud-init'
      );

    const showUserData =
      this.props.flags.metadata &&
      regionSupportsMetadata(
        this.props.regionsData,
        this.props.selectedRegionID ?? ''
      ) &&
      (imageIsCloudInitCompatible || linodeIsCloudInitCompatible);

    const isDistributedRegionSelected = Boolean(
      flags.gecko2?.enabled &&
        getIsDistributedRegion(regionsData, this.props.selectedRegionID ?? '')
    );

    const secureVMViolation =
      showFirewallAuthorization &&
      this.props.firewallId === undefined &&
      !checkedFirewallAuthorization;

    return (
      <StyledForm ref={this.createLinodeFormRef}>
        <Grid className="py0">
          {hasErrorFor.none && !!showGeneralError && (
            <Notice spacingTop={8} text={hasErrorFor.none} variant="error" />
          )}
          {generalError && (
            <Notice spacingTop={8} variant="error">
              <ErrorMessage
                entityType="linode_id"
                formPayloadValues={{ type: this.props.selectedTypeID }}
                message={generalError}
              />
            </Notice>
          )}
          {userCannotCreateLinode && (
            <Notice
              text={
                "You don't have permissions to create a new Linode. Please contact an account administrator for details."
              }
              important
              variant="error"
            />
          )}
          <Stack gap={3}>
            <Tabs
              defaultIndex={selectedTab}
              index={selectedTab}
              onChange={this.handleTabChange}
            >
              <TabLinkList tabs={this.tabs} />
              <TabPanels>
                <SafeTabPanel index={0}>
                  <FromImageContent
                    accountBackupsEnabled={accountBackupsEnabled}
                    error={hasErrorFor.image}
                    imageLabel="Linux Distribution"
                    imagePanelTitle="Choose an OS"
                    imagesData={imagesData!}
                    placeholder="Choose a Linux distribution"
                    regionsData={regionsData!}
                    typesData={typesData!}
                    userCannotCreateLinode={userCannotCreateLinode}
                    variant="public"
                    {...rest}
                  />
                </SafeTabPanel>
                <SafeTabPanel index={1}>
                  <FromAppsContent
                    setNumberOfNodesForAppCluster={
                      this.setNumberOfNodesForAppCluster
                    }
                    // error={hasErrorFor.image}
                    accountBackupsEnabled={accountBackupsEnabled}
                    errors={errors}
                    flags={flags}
                    imagesData={imagesData!}
                    regionsData={regionsData!}
                    typesData={typesData!}
                    userCannotCreateLinode={userCannotCreateLinode}
                    {...rest}
                  />
                </SafeTabPanel>
                <SafeTabPanel index={2}>
                  <Tabs defaultIndex={stackScriptSelectedTab}>
                    <StyledPaper>
                      <Typography variant="h2">Create From:</Typography>
                      <TabLinkList tabs={this.stackScriptTabs} />
                      <StyledTabPanel>
                        <SafeTabPanel index={0}>
                          <FromStackScriptContent
                            accountBackupsEnabled={accountBackupsEnabled}
                            category="account"
                            errors={errors}
                            header={'Select a StackScript'}
                            imagesData={imagesData!}
                            regionsData={regionsData!}
                            request={getMineAndAccountStackScripts}
                            typesData={typesData!}
                            userCannotCreateLinode={userCannotCreateLinode}
                            {...rest}
                          />
                        </SafeTabPanel>
                        <SafeTabPanel index={1}>
                          <FromStackScriptContent
                            accountBackupsEnabled={accountBackupsEnabled}
                            category="community"
                            errors={errors}
                            header={'Select a StackScript'}
                            imagesData={imagesData!}
                            regionsData={regionsData!}
                            request={getCommunityStackscripts}
                            typesData={typesData!}
                            userCannotCreateLinode={userCannotCreateLinode}
                            {...rest}
                          />
                        </SafeTabPanel>
                      </StyledTabPanel>
                    </StyledPaper>
                  </Tabs>
                </SafeTabPanel>
                <SafeTabPanel index={3}>
                  <FromImageContent
                    accountBackupsEnabled={accountBackupsEnabled}
                    imagePanelTitle="Choose an Image"
                    imagesData={imagesData}
                    regionsData={regionsData!}
                    selectedRegionID={selectedRegionID}
                    typesData={typesData!}
                    userCannotCreateLinode={userCannotCreateLinode}
                    variant={'private'}
                    {...rest}
                  />
                </SafeTabPanel>
                <SafeTabPanel index={4}>
                  <FromBackupsContent
                    accountBackupsEnabled={accountBackupsEnabled}
                    errors={errors}
                    imagesData={imagesData!}
                    linodesData={linodesData!}
                    regionsData={regionsData!}
                    typesData={typesData!}
                    userCannotCreateLinode={userCannotCreateLinode}
                    {...restoreBackup}
                    {...rest}
                  />
                </SafeTabPanel>
                <SafeTabPanel index={5}>
                  <FromLinodeContent
                    accountBackupsEnabled={accountBackupsEnabled}
                    errors={errors}
                    imagesData={imagesData!}
                    linodesData={linodesData!}
                    regionsData={regionsData!}
                    typesData={typesData!}
                    userCannotCreateLinode={userCannotCreateLinode}
                    {...rest}
                  />
                </SafeTabPanel>
              </TabPanels>
            </Tabs>

            {this.props.createType !== 'fromBackup' && (
              <SelectRegionPanel
                currentCapability="Linodes"
                data-qa-select-region-panel
                disabled={userCannotCreateLinode}
                error={hasErrorFor.region}
                handleSelection={this.props.updateRegionID}
                helperText={this.props.regionHelperText}
                selectedId={this.props.selectedRegionID}
                selectedImageId={this.props.selectedImageID}
                selectedLinodeTypeId={this.props.selectedTypeID}
                updateTypeID={this.props.updateTypeID}
              />
            )}
            <PlansPanel
              docsLink={
                <DocsLink
                  onClick={() => {
                    sendLinodeCreateFlowDocsClickEvent('Choosing a Plan');
                    sendLinodeCreateFormInputEvent({
                      createType:
                        (this.tabs[selectedTab].title as LinodeCreateType) ??
                        'OS',
                      headerName: 'Linode Plan',
                      interaction: 'click',
                      label: 'Choosing a Plan',
                    });
                  }}
                  href="https://www.linode.com/docs/guides/choosing-a-compute-instance-plan/"
                  label="Choosing a Plan"
                />
              }
              data-qa-select-plan
              disabled={userCannotCreateLinode}
              disabledClasses={this.props.disabledClasses}
              error={hasErrorFor.type}
              isCreate
              key={this.state.planKey}
              linodeID={this.props.selectedLinodeID}
              onSelect={this.props.updateTypeID}
              regionsData={regionsData!}
              selectedId={this.props.selectedTypeID}
              selectedRegionID={selectedRegionID}
              showLimits
              types={this.filterTypes()}
            />
          </Stack>
          <DetailsPanel
            labelFieldProps={{
              disabled: userCannotCreateLinode,
              errorText: hasErrorFor.label,
              label: 'Linode Label',
              onChange: (e) => updateLabel(e.target.value),
              value: label || '',
            }}
            selectedPlacementGroupId={
              this.props.placementGroupSelection?.id ?? null
            }
            tagsInputProps={
              this.props.createType !== 'fromLinode'
                ? tagsInputProps
                : undefined
            }
            data-qa-details-panel
            error={hasErrorFor.placement_group}
            handlePlacementGroupChange={handlePlacementGroupChange}
            selectedRegionId={selectedRegionID}
          />
          {/* Hide for backups and clone */}
          {!['fromBackup', 'fromLinode'].includes(this.props.createType) && (
            <AccessPanel
              disabledReason={
                !this.props.selectedImageID
                  ? 'You must select an image to set a root password'
                  : ''
              }
              toggleDiskEncryptionEnabled={
                this.props.toggleDiskEncryptionEnabled
              }
              authorizedUsers={this.props.authorized_users}
              data-qa-access-panel
              disabled={!this.props.selectedImageID || userCannotCreateLinode}
              diskEncryptionEnabled={this.props.diskEncryptionEnabled}
              displayDiskEncryption
              error={hasErrorFor.root_pass}
              handleChange={this.props.updatePassword}
              password={this.props.password}
              selectedRegion={this.props.selectedRegionID}
              setAuthorizedUsers={this.props.setAuthorizedUsers}
            />
          )}
          <VPCPanel
            toggleAssignPublicIPv4Address={
              this.props.toggleAssignPublicIPv4Address
            }
            toggleAutoassignIPv4WithinVPCEnabled={
              this.props.toggleAutoassignIPv4WithinVPCEnabled
            }
            additionalIPv4RangesForVPC={this.props.additionalIPv4RangesForVPC}
            assignPublicIPv4Address={this.props.assignPublicIPv4Address}
            autoassignIPv4WithinVPC={this.props.autoassignIPv4WithinVPC}
            from="linodeCreate"
            handleIPv4RangeChange={this.props.handleIPv4RangesForVPC}
            handleSelectVPC={this.props.setSelectedVPC}
            handleSubnetChange={this.props.handleSubnetChange}
            handleVPCIPv4Change={this.props.handleVPCIPv4Change}
            region={this.props.selectedRegionID}
            selectedSubnetId={this.props.selectedSubnetId}
            selectedVPCId={this.props.selectedVPCId}
            subnetError={hasErrorFor['interfaces[0].subnet_id']}
            vpcIPv4AddressOfLinode={this.props.vpcIPv4AddressOfLinode}
            vpcIPv4Error={hasErrorFor['ipv4.vpc']}
          />
          {this.props.flags.linodeCreateWithFirewall && (
            <SelectFirewallPanel
              helperText={
                <Typography>
                  Assign an existing Firewall to this Linode to control inbound
                  and outbound network traffic.{' '}
                  <Link
                    onClick={() =>
                      sendLinodeCreateFormInputEvent({
                        createType:
                          (this.tabs[selectedTab].title as LinodeCreateType) ??
                          'OS',
                        headerName: 'Firewall',
                        interaction: 'click',
                        label: 'Learn more',
                      })
                    }
                    to={FIREWALL_GET_STARTED_LINK}
                  >
                    Learn more
                  </Link>
                  .
                </Typography>
              }
              disabled={userCannotCreateLinode}
              entityType="linode"
              handleFirewallChange={this.props.handleFirewallChange}
              selectedFirewallId={this.props.firewallId}
            />
          )}
          <AddonsPanel
            diskEncryptionEnabled={
              regionSupportsDiskEncryption && this.props.diskEncryptionEnabled
            }
            userData={{
              createType: this.props.createType,
              onChange: updateUserData,
              showUserData: Boolean(showUserData),
              userData: this.props.userData,
            }}
            accountBackups={accountBackupsEnabled}
            backups={this.props.backupsEnabled}
            backupsMonthlyPrice={backupsMonthlyPrice}
            changeBackups={this.props.toggleBackupsEnabled}
            createType={this.props.createType}
            data-qa-addons-panel
            disabled={userCannotCreateLinode}
            handleVLANChange={this.props.handleVLANChange}
            ipamAddress={this.props.ipamAddress || ''}
            ipamError={hasErrorFor['interfaces[1].ipam_address']}
            isDistributedRegionSelected={isDistributedRegionSelected}
            isPrivateIPChecked={this.props.privateIPEnabled}
            labelError={hasErrorFor['interfaces[1].label']}
            linodesData={this.props.linodesData}
            selectedImageID={this.props.selectedImageID}
            selectedLinodeID={this.props.selectedLinodeID}
            selectedRegionID={this.props.selectedRegionID}
            selectedTypeID={this.props.selectedTypeID}
            togglePrivateIP={this.props.togglePrivateIPEnabled}
            vlanLabel={this.props.vlanLabel || ''}
          />
          <CheckoutSummary
            data-qa-checkout-bar
            displaySections={displaySections}
            heading={`Summary ${this.props.label}`}
          />
          <Box
            alignItems="center"
            display="flex"
            flexWrap="wrap"
            justifyContent={showGDPRCheckbox ? 'space-between' : 'flex-end'}
          >
            <StyledMessageDiv showGDPRCheckbox={!!showGDPRCheckbox}>
              <SMTPRestrictionText>
                {({ text }) => <Grid xs={12}>{text}</Grid>}
              </SMTPRestrictionText>
              {showGDPRCheckbox ? (
                <EUAgreementCheckbox
                  centerCheckbox
                  checked={signedAgreement}
                  onChange={handleAgreementChange}
                />
              ) : null}
              {showFirewallAuthorization &&
              this.props.firewallId === undefined &&
              flags.secureVmCopy?.firewallAuthorizationWarning ? (
                <AkamaiBanner
                  action={
                    <FormControlLabel
                      checked={checkedFirewallAuthorization}
                      className="error-for-scroll"
                      control={<Checkbox />}
                      disableTypography
                      label={flags.secureVmCopy.firewallAuthorizationLabel}
                      onChange={handleFirewallAuthorizationChange}
                      sx={{ fontSize: 14 }}
                    />
                  }
                  text={flags.secureVmCopy.firewallAuthorizationWarning}
                  warning
                />
              ) : null}
            </StyledMessageDiv>
          </Box>
          <StyledButtonGroupBox
            alignItems="center"
            display="flex"
            justifyContent="flex-end"
          >
            <StyledCreateButton
              disabled={
                formIsSubmitting ||
                userCannotCreateLinode ||
                (showGDPRCheckbox && !signedAgreement) ||
                secureVMViolation
              }
              onClick={() =>
                this.handleClickCreateUsingCommandLine(
                  isDxToolsAdditionsEnabled
                )
              }
              buttonType="outlined"
              data-qa-api-cli-linode
            >
              {isDxToolsAdditionsEnabled
                ? 'View Code Snippets'
                : 'Create using command line'}
            </StyledCreateButton>
            <StyledCreateButton
              disabled={
                formIsSubmitting ||
                userCannotCreateLinode ||
                (showGDPRCheckbox && !signedAgreement) ||
                secureVMViolation
              }
              buttonType="primary"
              data-qa-deploy-linode
              loading={formIsSubmitting}
              onClick={this.createLinode}
            >
              Create Linode
            </StyledCreateButton>
            <ApiAwarenessModal
              isOpen={showApiAwarenessModal}
              onClose={handleShowApiAwarenessModal}
              payLoad={this.getPayload()}
            />
          </StyledButtonGroupBox>
        </Grid>
      </StyledForm>
    );
  }
}

export const defaultPublicInterface: InterfacePayload = {
  ipam_address: '',
  label: '',
  purpose: 'public',
};

interface DispatchProps {
  setTab: (value: CreateTypes) => void;
}

const mapDispatchToProps: MapDispatchToProps<DispatchProps, CombinedProps> = (
  dispatch
) => ({
  setTab: (value) => dispatch(handleChangeCreateType(value)),
});

const connected = connect(undefined, mapDispatchToProps);

export default connected(LinodeCreate);
