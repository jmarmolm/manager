import { signAgreement } from '@linode/api-v4/lib/account';
import { convertYupToLinodeErrors } from '@linode/api-v4/lib/request';
import { vpcsValidateIP } from '@linode/validation';
import { CreateLinodeSchema } from '@linode/validation/lib/linodes.schema';
import Grid from '@mui/material/Unstable_Grid2';
import { enqueueSnackbar } from 'notistack';
import * as React from 'react';
import { connect } from 'react-redux';

import { DocumentTitleSegment } from 'src/components/DocumentTitle';
import { LandingHeader } from 'src/components/LandingHeader';
import { ProductInformationBanner } from 'src/components/ProductInformationBanner/ProductInformationBanner';
import { withAccount } from 'src/containers/account.container';
import { withAccountSettings } from 'src/containers/accountSettings.container';
import { withEventsPollingActions } from 'src/containers/events.container';
import { withFeatureFlags } from 'src/containers/flags.container';
import { withImages } from 'src/containers/images.container';
import { withProfile } from 'src/containers/profile.container';
import { withRegions } from 'src/containers/regions.container';
import { withTypes } from 'src/containers/types.container';
import { withLinodes } from 'src/containers/withLinodes.container';
import { withMarketplaceApps } from 'src/containers/withMarketplaceApps';
import { withQueryClient } from 'src/containers/withQueryClient.container';
import { withSecureVMNoticesEnabled } from 'src/containers/withSecureVMNoticesEnabled.container';
import withAgreements from 'src/features/Account/Agreements/withAgreements';
import { hasPlacementGroupReachedCapacity } from 'src/features/PlacementGroups/utils';
import { reportAgreementSigningError } from 'src/queries/account/agreements';
import { accountQueries } from 'src/queries/account/queries';
import {
  sendCreateLinodeEvent,
  sendLinodeCreateFlowDocsClickEvent,
} from 'src/utilities/analytics/customEventAnalytics';
import {
  sendLinodeCreateFormInputEvent,
  sendLinodeCreateFormSubmitEvent,
} from 'src/utilities/analytics/formEventAnalytics';
import { capitalize } from 'src/utilities/capitalize';
import { getAPIErrorOrDefault } from 'src/utilities/errorUtils';
import { extendType } from 'src/utilities/extendType';
import { isEURegion } from 'src/utilities/formatRegion';
import {
  getGDPRDetails,
  getSelectedRegionGroup,
} from 'src/utilities/formatRegion';
import { isNotNullOrUndefined } from 'src/utilities/nullOrUndefined';
import { UNKNOWN_PRICE } from 'src/utilities/pricing/constants';
import { getLinodeRegionPrice } from 'src/utilities/pricing/linodes';
import { getQueryParamsFromQueryString } from 'src/utilities/queryParams';
import { validatePassword } from 'src/utilities/validatePassword';

import { deriveDefaultLabel } from './deriveDefaultLabel';
import LinodeCreate from './LinodeCreate';

import type {
  HandleSubmit,
  Info,
  LinodeCreateType,
  LinodeCreateValidation,
  TypeInfo,
} from './types';
import type { PlacementGroup } from '@linode/api-v4';
import type { Agreements } from '@linode/api-v4/lib/account';
import type { Image } from '@linode/api-v4/lib/images';
import type {
  CreateLinodeRequest,
  Interface,
  Linode,
  LinodeTypeClass,
  PriceObject,
} from '@linode/api-v4/lib/linodes';
import type { Region } from '@linode/api-v4/lib/regions';
import type { UserDefinedField } from '@linode/api-v4/lib/stackscripts';
import type { APIError } from '@linode/api-v4/lib/types';
import type { RouteComponentProps } from 'react-router-dom';
import type { Tag } from 'src/components/TagsInput/TagsInput';
import type { WithAccountProps } from 'src/containers/account.container';
import type { WithAccountSettingsProps } from 'src/containers/accountSettings.container';
import type { WithEventsPollingActionProps } from 'src/containers/events.container';
import type { WithFeatureFlagProps } from 'src/containers/flags.container';
import type { WithImagesProps } from 'src/containers/images.container';
import type { WithProfileProps } from 'src/containers/profile.container';
import type { RegionsProps } from 'src/containers/regions.container';
import type { WithTypesProps } from 'src/containers/types.container';
import type { WithLinodesProps } from 'src/containers/withLinodes.container';
import type { WithMarketplaceAppsProps } from 'src/containers/withMarketplaceApps';
import type { WithQueryClientProps } from 'src/containers/withQueryClient.container';
import type { WithSecureVMNoticesEnabledProps } from 'src/containers/withSecureVMNoticesEnabled.container';
import type { AgreementsProps } from 'src/features/Account/Agreements/withAgreements';
import type { CreateTypes } from 'src/store/linodeCreate/linodeCreate.actions';
import type { MapState } from 'src/store/types';
import type { ExtendedType } from 'src/utilities/extendType';
import type { ExtendedIP } from 'src/utilities/ipUtils';

const DEFAULT_IMAGE = 'linode/debian11';

interface State {
  additionalIPv4RangesForVPC: ExtendedIP[];
  assignPublicIPv4Address: boolean;
  attachedVLANLabel: null | string;
  authorized_users: string[];
  autoassignIPv4WithinVPCEnabled: boolean;
  availableStackScriptImages?: Image[];
  availableUserDefinedFields?: UserDefinedField[];
  backupsEnabled: boolean;
  checkedFirewallAuthorization: boolean;
  customLabel?: string;
  disabledClasses?: LinodeTypeClass[];
  diskEncryptionEnabled?: boolean;
  errors?: APIError[];
  formIsSubmitting: boolean;
  password: string;
  placementGroupSelection?: PlacementGroup;
  privateIPEnabled: boolean;
  selectedBackupID?: number;
  selectedDiskSize?: number;
  selectedImageID?: string;
  selectedLinodeID?: number;
  selectedRegionID?: string;
  selectedStackScriptID?: number;
  selectedStackScriptLabel?: string;
  selectedStackScriptUsername?: string;
  selectedSubnetId?: number;
  selectedTypeID?: string;
  selectedVPCId?: number;
  selectedfirewallId?: number;
  showApiAwarenessModal: boolean;
  showFirewallAuthorization: boolean;
  showGDPRCheckbox: boolean;
  signedAgreement: boolean;
  tags?: Tag[];
  udfs?: any;
  userData: string | undefined;
  vlanIPAMAddress: null | string;
  vpcIPv4AddressOfLinode?: string;
}

type CombinedProps = CreateType &
  WithAccountProps &
  WithImagesProps &
  WithTypesProps &
  WithLinodesProps &
  RegionsProps &
  WithFeatureFlagProps &
  RouteComponentProps<{}, any, any> &
  WithProfileProps &
  AgreementsProps &
  WithQueryClientProps &
  WithMarketplaceAppsProps &
  WithAccountSettingsProps &
  WithEventsPollingActionProps &
  WithSecureVMNoticesEnabledProps;

const defaultState: State = {
  additionalIPv4RangesForVPC: [],
  assignPublicIPv4Address: false,
  attachedVLANLabel: '',
  authorized_users: [],
  autoassignIPv4WithinVPCEnabled: true,
  backupsEnabled: false,
  checkedFirewallAuthorization: false,
  customLabel: undefined,
  disabledClasses: [],
  diskEncryptionEnabled: true,
  errors: undefined,
  formIsSubmitting: false,
  password: '',
  placementGroupSelection: undefined,
  privateIPEnabled: false,
  selectedBackupID: undefined,
  selectedDiskSize: undefined,
  selectedImageID: undefined,
  selectedLinodeID: undefined,
  selectedRegionID: '',
  selectedStackScriptID: undefined,
  selectedStackScriptLabel: '',
  selectedStackScriptUsername: '',
  selectedSubnetId: undefined,
  selectedTypeID: undefined,
  selectedVPCId: undefined,
  selectedfirewallId: undefined,
  showApiAwarenessModal: false,
  showFirewallAuthorization: false,
  showGDPRCheckbox: false,
  signedAgreement: false,
  tags: [],
  udfs: undefined,
  userData: undefined,
  vlanIPAMAddress: null,
  vpcIPv4AddressOfLinode: '',
};

const getDisabledClasses = (regionID: string, regions: Region[] = []) => {
  const selectedRegion = regions.find(
    (thisRegion) => thisRegion.id === regionID
  );

  const disabledClasses: LinodeTypeClass[] = [];

  if (!selectedRegion?.capabilities.includes('GPU Linodes')) {
    disabledClasses.push('gpu');
  }

  if (!selectedRegion?.capabilities.includes('Bare Metal')) {
    disabledClasses.push('metal');
  }

  return disabledClasses;
};

const nonImageCreateTypes = ['fromStackScript', 'fromBackup', 'fromLinode'];

const isNonDefaultImageType = (prevType: string, type: string) => {
  return nonImageCreateTypes.some(
    (thisEntry) => prevType !== thisEntry && type === thisEntry
  );
};

class LinodeCreateContainer extends React.PureComponent<CombinedProps, State> {
  checkValidation: LinodeCreateValidation = (payload) => {
    try {
      CreateLinodeSchema.validateSync(payload, { abortEarly: false });
      // reset errors to default state
      this.setState({ errors: undefined, showApiAwarenessModal: true });
    } catch (error) {
      const processedErrors = convertYupToLinodeErrors(error);
      this.setState(() => ({
        errors: getAPIErrorOrDefault(processedErrors),
        formIsSubmitting: false,
      }));
    }
  };

  clearCreationState = () => {
    this.setState(defaultState);
  };

  generateLabel = () => {
    const { createType, imagesData, regionsData } = this.props;
    const {
      customLabel,
      selectedImageID,
      selectedLinodeID,
      selectedRegionID,
      selectedStackScriptLabel,
    } = this.state;

    if (customLabel !== undefined) {
      return customLabel;
    }

    /* tslint:disable-next-line  */
    let arg1,
      arg2,
      arg3 = '';

    /**
     * lean in favor of using stackscript label
     * then next priority is image label
     */
    if (selectedStackScriptLabel) {
      arg1 = selectedStackScriptLabel;
    } else if (selectedImageID) {
      /**
       * safe to ignore possibility of "undefined"
       * null checking happens in CALinodeCreate
       */
      const selectedImage = imagesData![selectedImageID];
      /**
       * Use 'vendor' if it's a public image, otherwise use label (because 'vendor' will be null)
       *
       * If we have no selectedImage, just use an empty string
       */
      arg1 = selectedImage
        ? selectedImage.is_public
          ? selectedImage.vendor
          : selectedImage.label
        : '';

      if (createType === 'fromApp') {
        // All 1-clicks are Debian so this isn't useful information.
        arg1 = '';
      }
    }

    if (selectedRegionID) {
      /**
       * safe to ignore possibility of "undefined"
       * null checking happens in CALinodeCreate
       */
      const selectedRegion = regionsData!.find(
        (region) => region.id === selectedRegionID
      );

      arg2 = selectedRegion ? selectedRegion.id : '';
    }

    if (createType === 'fromLinode') {
      // @todo handle any other custom label cases we'd like to have here
      arg1 =
        this.props.linodesData?.find(
          (thisLinode) => thisLinode.id === selectedLinodeID
        )?.label ?? arg1; // Use the label of whatever we're cloning
      arg2 = 'clone';
      arg3 = '';
    }

    if (createType === 'fromBackup') {
      arg3 = 'backup';
    }

    return deriveDefaultLabel(
      [arg1, arg2, arg3],
      this.props.linodesData?.map((linode) => linode.label) ?? []
    );
  };

  getImageInfo = (): Info | undefined => {
    const { selectedImageID } = this.state;

    if (!selectedImageID) {
      return undefined;
    }

    const selectedImage = this.props.imagesData[selectedImageID];

    if (!selectedImage) {
      return undefined;
    }

    const { label, vendor } = selectedImage;

    return { title: `${label ? label : vendor ? vendor : ''}` };
  };

  getRegionInfo = (): Info | undefined => {
    const { selectedRegionID } = this.state;

    if (!selectedRegionID) {
      return;
    }

    const selectedRegion = this.props.regionsData.find(
      (region) => region.id === selectedRegionID
    );
    return (
      selectedRegion && {
        title: selectedRegion.label,
      }
    );
  };

  getTypeInfo = (): TypeInfo => {
    const { selectedTypeID } = this.state;
    const selectedType = this.props.typesData?.find(
      (type) => type.id === selectedTypeID
    );
    return this.reshapeTypeInfo(
      selectedType ? extendType(selectedType) : undefined
    );
  };

  handleAgreementChange = () => {
    this.setState((prevState) => ({
      signedAgreement: !prevState.signedAgreement,
    }));
  };

  handleFirewallAuthorizationChange = () => {
    this.setState((prevState) => ({
      checkedFirewallAuthorization: !prevState.checkedFirewallAuthorization,
    }));
  };

  handleFirewallChange = (firewallId: number | undefined) => {
    this.setState({ selectedfirewallId: firewallId });
  };

  handleShowApiAwarenessModal = () => {
    this.setState((prevState) => ({
      showApiAwarenessModal: !prevState.showApiAwarenessModal,
    }));
  };

  handleSubnetChange = (subnetID: number | undefined) => {
    this.setState((prevState) => ({
      errors: prevState.errors?.filter(
        (error) => error.field !== 'interfaces[0].subnet_id'
      ),
      selectedSubnetId: subnetID,
    }));
  };

  handleVLANChange = (updatedInterface: Interface) => {
    this.setState({
      attachedVLANLabel: updatedInterface.label,
      vlanIPAMAddress: updatedInterface.ipam_address,
    });
  };

  handleVPCChange = (vpcId: number) => {
    // Only clear VPC related fields if VPC selection changes
    if (vpcId !== this.state.selectedVPCId) {
      this.setState({
        selectedSubnetId: undefined, // Ensure the selected subnet is cleared
        selectedVPCId: vpcId,
        vpcIPv4AddressOfLinode: '', // Ensure the VPC IPv4 address is cleared
      });
    }
  };

  handleVPCIPv4Change = (IPv4: string) => {
    this.setState({ vpcIPv4AddressOfLinode: IPv4 });
  };

  handleVPCIPv4RangesChange = (ranges: ExtendedIP[]) => {
    this.setState({ additionalIPv4RangesForVPC: ranges });
  };

  params = getQueryParamsFromQueryString(this.props.location.search) as Record<
    string,
    string
  >;

  reshapeTypeInfo = (type?: ExtendedType): TypeInfo | undefined => {
    const { selectedRegionID } = this.state;

    const linodePrice: PriceObject | undefined = getLinodeRegionPrice(
      type,
      selectedRegionID
    );

    return (
      type && {
        details: `$${linodePrice ? linodePrice : UNKNOWN_PRICE}/month`,
        hourly: linodePrice?.hourly,
        monthly: linodePrice?.monthly,
        title: type.formattedLabel,
      }
    );
  };

  setAuthorizedUsers = (usernames: string[]) =>
    this.setState({ authorized_users: usernames });

  setBackupID = (id: number) => {
    this.setState({ selectedBackupID: id });
  };

  setDiskSize = (size: number) => this.setState({ selectedDiskSize: size });

  setImageID = (id: string | undefined) => {
    if (typeof id === 'undefined') {
      /** In this case we also clear any VLAN input, since VLANs are incompatible with empty Linodes */
      return this.setState({
        attachedVLANLabel: '',
        selectedImageID: undefined,
        vlanIPAMAddress: '',
      });
    }

    return this.setState({ selectedImageID: id });
  };

  setLinodeID = (id: number, diskSize?: number) => {
    if (id !== this.state.selectedLinodeID) {
      /**
       * reset selected plan and set the selectedDiskSize
       * for the purpose of disabling plans that are smaller
       * than the clone source.
       *
       * Also, when creating from backup, we set the region
       * to the same region as the Linode that owns the backup,
       * since the API does not infer this automatically.
       */

      this.setState({
        selectedBackupID: undefined,
        selectedDiskSize: diskSize,
        selectedLinodeID: id,
        selectedRegionID: this.props.linodesData?.find(
          (linode) => linode.id == id
        )?.region,
        selectedTypeID: undefined,
      });
    }
  };

  setPassword = (password: string) => this.setState({ password });

  setPlacementGroupSelection = (placementGroupSelection: PlacementGroup) => {
    this.setState({ placementGroupSelection });
  };

  setRegionID = (selectedRegionId: string) => {
    const { showGDPRCheckbox } = getGDPRDetails({
      agreements: this.props.agreements?.data,
      profile: this.props.profile.data,
      regions: this.props.regionsData,
      selectedRegionId,
    });

    const disabledClasses = getDisabledClasses(
      selectedRegionId,
      this.props.regionsData
    );
    this.setState({
      disabledClasses,
      placementGroupSelection: undefined,
      selectedRegionID: selectedRegionId,
      // When the region gets changed, ensure the VPC-related selections are cleared
      selectedSubnetId: undefined,
      selectedVPCId: -1,
      showGDPRCheckbox,
      vpcIPv4AddressOfLinode: '',
    });
  };

  setStackScript = (
    id: number,
    label: string,
    username: string,
    userDefinedFields: UserDefinedField[],
    images: Image[],
    defaultData?: any
  ) => {
    /**
     * If we're switching from one Marketplace app to another,
     * usually the only compatible image will be Debian 9. If this
     * is the case, preselect that value.
     */
    const defaultImage = images.length === 1 ? images[0].id : undefined;

    const stackScriptLabel = defaultData?.cluster_size
      ? `${label} Cluster`
      : label;

    this.setState({
      availableStackScriptImages: images,
      availableUserDefinedFields: userDefinedFields,
      errors: undefined,
      /** reset image because stackscript might not be compatible with selected one */
      selectedImageID: defaultImage,
      selectedStackScriptID: id,
      selectedStackScriptLabel: stackScriptLabel,
      selectedStackScriptUsername: username,
      udfs: defaultData,
    });
  };

  setTags = (tags: Tag[]) => this.setState({ tags });

  setTypeID = (id: string) => {
    if (/metal/.test(id)) {
      // VLANs and backups don't work with bare metal;
      // reset those values.
      this.setState({
        attachedVLANLabel: '',
        backupsEnabled: false,
        selectedTypeID: id,
        vlanIPAMAddress: '',
      });
    } else {
      this.setState({
        selectedTypeID: id,
      });
    }
  };

  setUDFs = (udfs: any) => this.setState({ udfs });

  setUserData = (userData: string) => this.setState({ userData });

  state: State = {
    ...defaultState,
    disabledClasses: [],
    selectedBackupID: isNaN(+this.params.backupID)
      ? undefined
      : +this.params.backupID,
    selectedImageID:
      this.params.imageID ?? this.params.type !== 'Images'
        ? DEFAULT_IMAGE
        : undefined,
    // @todo: Abstract and test. UPDATE 5/21/20: lol what does this mean. UPDATE 3/16/23 lol what
    selectedLinodeID: isNaN(+this.params.linodeID)
      ? undefined
      : +this.params.linodeID,
    selectedRegionID: this.params.regionID,
    // These can be passed in as query params
    selectedTypeID: this.params.typeID,
    showGDPRCheckbox: Boolean(
      !this.props.profile.data?.restricted &&
        isEURegion(
          getSelectedRegionGroup(this.props.regionsData, this.params.regionID)
        ) &&
        this.props.agreements?.data?.eu_model
    ),
    signedAgreement: false,
  };

  submitForm: HandleSubmit = (_payload, linodeID?: number) => {
    const { createType } = this.props;
    const { signedAgreement } = this.state;
    const payload = { ..._payload };

    /**
     * Do manual password validation (someday we'll use Formik and
     * not need this). Only run this check if a password is present
     * on the payload --
     * Yup schema in the JS client will determine if a password
     * is required.
     *
     * The downside of this approach is that only the password error
     * will be displayed, even if other required fields are missing.
     */

    if (payload.root_pass) {
      const passwordError = validatePassword(payload.root_pass);
      if (passwordError) {
        this.setState({
          errors: [
            {
              field: 'root_pass',
              reason: passwordError,
            },
          ],
        });
        return;
      }
    }

    if (payload.placement_group) {
      const error = hasPlacementGroupReachedCapacity({
        placementGroup: this.state.placementGroupSelection!,
        region: this.props.regionsData.find(
          (r) => r.id === this.state.selectedRegionID
        )!,
      });
      if (error) {
        this.setState({
          errors: [
            {
              field: 'placement_group',
              reason: `${this.state.placementGroupSelection?.label} (${
                this.state.placementGroupSelection?.placement_group_type ===
                'affinity:local'
                  ? 'Affinity'
                  : 'Anti-affinity'
              }) doesn't have any capacity for this Linode.`,
            },
          ],
        });
        return;
      }
    }

    // Validation for VPC fields
    if (
      this.state.selectedVPCId !== undefined &&
      this.state.selectedVPCId !== -1
    ) {
      const validVPCIPv4 = vpcsValidateIP({
        mustBeIPMask: false,
        shouldHaveIPMask: false,
        value: this.state.vpcIPv4AddressOfLinode,
      });

      // Situation: 'Auto-assign a VPC IPv4 address for this Linode in the VPC' checkbox
      // unchecked but a valid VPC IPv4 not provided
      if (!this.state.autoassignIPv4WithinVPCEnabled && !validVPCIPv4) {
        return this.setState(() => ({
          errors: [
            {
              field: 'ipv4.vpc',
              reason: 'Must be a valid IPv4 address, e.g. 192.168.2.0',
            },
          ],
        }));
      }
    }

    /**
     * run a certain linode action based on the type
     * if clone, run clone service request and upsert linode
     * if create, run create action
     */
    if (createType === 'fromLinode' && !linodeID) {
      return this.setState(() => ({
        errors: [
          {
            field: 'linode_id',
            reason: 'You must select a Linode to clone from',
          },
        ],
      }));
    }

    if (createType === 'fromBackup' && !this.state.selectedBackupID) {
      /* a backup selection is also required */
      this.setState({
        errors: [{ field: 'backup_id', reason: 'You must select a Backup.' }],
      });
      return;
    }

    if (createType === 'fromStackScript' && !this.state.selectedStackScriptID) {
      return this.setState(() => ({
        errors: [
          {
            field: 'stackscript_id',
            reason: 'You must select a StackScript.',
          },
        ],
      }));
    }

    if (createType === 'fromApp' && !this.state.selectedStackScriptID) {
      return this.setState(() => ({
        errors: [
          {
            field: 'stackscript_id',
            reason: 'You must select a Marketplace App.',
          },
        ],
      }));
    }

    if (
      this.props.secureVMNoticesEnabled &&
      this.state.selectedfirewallId === undefined &&
      !this.state.checkedFirewallAuthorization
    ) {
      return this.setState(() => ({
        showFirewallAuthorization: true,
      }));
    }

    const request =
      createType === 'fromLinode'
        ? () =>
            this.props.linodeActions.cloneLinode({
              sourceLinodeId: linodeID!,
              ...payload,
            })
        : () => this.props.linodeActions.createLinode(payload);

    this.setState({ formIsSubmitting: true });

    return request()
      .then((response: Linode) => {
        this.setState({ formIsSubmitting: false });

        if (signedAgreement) {
          const agreeData = { eu_model: true, privacy_policy: true };
          signAgreement(agreeData)
            .then(() => {
              this.props.queryClient.setQueryData<Agreements>(
                accountQueries.agreements.queryKey,
                (prev) => ({
                  ...(prev ?? {}),
                  ...agreeData,
                })
              );
            })
            .catch(reportAgreementSigningError);
        }

        /** Analytics creation event */
        handleAnalytics({
          label: this.state.selectedStackScriptLabel,
          linode: linodeID
            ? this.props.linodesData?.find((linode) => linode.id == linodeID)
            : undefined,
          payload,
          secureVMNoticesEnabled: this.props.secureVMNoticesEnabled,
          type: createType,
        });

        /** show toast */
        enqueueSnackbar(`Your Linode ${response.label} is being created.`, {
          variant: 'success',
        });

        /** reset the Events polling */
        this.props.checkForNewEvents();

        /** send the user to the Linode detail page */
        this.props.history.push(`/linodes/${response.id}`);
      })
      .catch((error) => {
        this.setState(() => ({
          errors: getAPIErrorOrDefault(error),
          formIsSubmitting: false,
        }));
      });
  };

  toggleAssignPublicIPv4Address = () => {
    this.setState({
      assignPublicIPv4Address: !this.state.assignPublicIPv4Address,
    });
  };

  toggleAutoassignIPv4WithinVPCEnabled = () => {
    this.setState({
      autoassignIPv4WithinVPCEnabled: !this.state
        .autoassignIPv4WithinVPCEnabled,
    });

    /*
      If the "Auto-assign a private IPv4 address ..." checkbox is unchecked,
      ensure the VPC IPv4 box is clear
    */
    if (this.state.autoassignIPv4WithinVPCEnabled) {
      this.setState({ vpcIPv4AddressOfLinode: '' });
    }
  };

  toggleBackupsEnabled = () =>
    this.setState({ backupsEnabled: !this.state.backupsEnabled });

  toggleDiskEncryptionEnabled = () => {
    this.setState({ diskEncryptionEnabled: !this.state.diskEncryptionEnabled });
  };

  togglePrivateIPEnabled = () =>
    this.setState({ privateIPEnabled: !this.state.privateIPEnabled });

  updateCustomLabel = (customLabel: string) => {
    this.setState({ customLabel });
  };

  componentDidMount() {
    // Allowed apps include the base set of original apps + anything LD tells us to show
    if (nonImageCreateTypes.includes(this.props.createType)) {
      // If we're navigating directly to e.g. the clone page, don't select an image by default
      this.setState({ selectedImageID: undefined });
    }
  }

  componentDidUpdate(prevProps: CombinedProps) {
    /**
     * When switching to a creation flow where
     * having a pre-selected image is problematic,
     * deselect it.
     */
    if (isNonDefaultImageType(prevProps.createType, this.props.createType)) {
      this.setState({ selectedImageID: undefined });
    }

    // Update search params for Linode Clone
    if (prevProps.location.search !== this.props.history.location.search) {
      const { showGDPRCheckbox } = getGDPRDetails({
        agreements: this.props.agreements?.data,
        profile: this.props.profile.data,
        regions: this.props.regionsData,
        selectedRegionId: this.params.regionID,
      });

      this.params = getQueryParamsFromQueryString(
        this.props.location.search
      ) as Record<string, string>;

      this.setState({
        showGDPRCheckbox,
      });
    }
  }

  render() {
    const {
      grants,
      profile,
      regionsData,
      typesData,
      ...restOfProps
    } = this.props;
    const { udfs: selectedUDFs, ...restOfState } = this.state;

    const extendedTypeData = typesData?.map(extendType);

    const userCannotCreateLinode =
      Boolean(profile.data?.restricted) && !grants.data?.global.add_linodes;

    return (
      <React.Fragment>
        <DocumentTitleSegment segment="Create a Linode" />
        <ProductInformationBanner bannerLocation="LinodeCreate" />
        <Grid className="m0" container spacing={0}>
          <LandingHeader
            onDocsClick={() => {
              sendLinodeCreateFlowDocsClickEvent('Getting Started');
              sendLinodeCreateFormInputEvent({
                createType: (this.params.type as LinodeCreateType) ?? 'OS',
                interaction: 'click',
                label: 'Getting Started',
              });
            }}
            docsLabel="Getting Started"
            docsLink="https://www.linode.com/docs/guides/platform/get-started/"
            title="Create"
          />
          <LinodeCreate
            accountBackupsEnabled={
              this.props.accountSettings.data?.backups_enabled ?? false
            }
            handleFirewallAuthorizationChange={
              this.handleFirewallAuthorizationChange
            }
            toggleAutoassignIPv4WithinVPCEnabled={
              this.toggleAutoassignIPv4WithinVPCEnabled
            }
            autoassignIPv4WithinVPC={this.state.autoassignIPv4WithinVPCEnabled}
            checkValidation={this.checkValidation}
            diskEncryptionEnabled={this.state.diskEncryptionEnabled ?? false}
            firewallId={this.state.selectedfirewallId}
            handleAgreementChange={this.handleAgreementChange}
            handleFirewallChange={this.handleFirewallChange}
            handleIPv4RangesForVPC={this.handleVPCIPv4RangesChange}
            handlePlacementGroupChange={this.setPlacementGroupSelection}
            handleSelectUDFs={this.setUDFs}
            handleShowApiAwarenessModal={this.handleShowApiAwarenessModal}
            handleSubmitForm={this.submitForm}
            handleSubnetChange={this.handleSubnetChange}
            handleVLANChange={this.handleVLANChange}
            handleVPCIPv4Change={this.handleVPCIPv4Change}
            imageDisplayInfo={this.getImageInfo()}
            ipamAddress={this.state.vlanIPAMAddress}
            label={this.generateLabel()}
            placementGroupSelection={this.state.placementGroupSelection}
            regionDisplayInfo={this.getRegionInfo()}
            regionsData={regionsData}
            resetCreationState={this.clearCreationState}
            selectedRegionID={this.state.selectedRegionID}
            selectedUDFs={selectedUDFs}
            selectedVPCId={this.state.selectedVPCId}
            setAuthorizedUsers={this.setAuthorizedUsers}
            setBackupID={this.setBackupID}
            setSelectedVPC={this.handleVPCChange}
            toggleAssignPublicIPv4Address={this.toggleAssignPublicIPv4Address}
            toggleBackupsEnabled={this.toggleBackupsEnabled}
            toggleDiskEncryptionEnabled={this.toggleDiskEncryptionEnabled}
            togglePrivateIPEnabled={this.togglePrivateIPEnabled}
            typeDisplayInfo={this.getTypeInfo()}
            typesData={extendedTypeData}
            updateDiskSize={this.setDiskSize}
            updateImageID={this.setImageID}
            updateLabel={this.updateCustomLabel}
            updateLinodeID={this.setLinodeID}
            updatePassword={this.setPassword}
            updateRegionID={this.setRegionID}
            updateStackScript={this.setStackScript}
            updateTags={this.setTags}
            updateTypeID={this.setTypeID}
            updateUserData={this.setUserData}
            userCannotCreateLinode={userCannotCreateLinode}
            vlanLabel={this.state.attachedVLANLabel}
            vpcIPv4AddressOfLinode={this.state.vpcIPv4AddressOfLinode}
            {...restOfProps}
            {...restOfState}
          />
        </Grid>
      </React.Fragment>
    );
  }
}

interface CreateType {
  createType: CreateTypes;
}

const mapStateToProps: MapState<CreateType, CombinedProps> = (state) => ({
  createType: state.createLinode.type,
});

const connected = connect(mapStateToProps);

export default withImages(
  withAccount(
    withLinodes(
      withRegions(
        withTypes(
          connected(
            withFeatureFlags(
              withSecureVMNoticesEnabled(
                withProfile(
                  withAgreements(
                    withQueryClient(
                      withAccountSettings(
                        withMarketplaceApps(
                          withEventsPollingActions(LinodeCreateContainer)
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
);

const actionsAndLabels = {
  fromApp: { action: 'one-click', labelPayloadKey: 'stackscript_id' },
  fromBackup: { action: 'backup', labelPayloadKey: 'backup_id' },
  fromImage: { action: 'image', labelPayloadKey: 'image' },
  fromLinode: { action: 'clone', labelPayloadKey: 'type' },
  fromStackScript: { action: 'stackscript', labelPayloadKey: 'stackscript_id' },
} as const;

const handleAnalytics = (details: {
  label?: string;
  linode?: Linode;
  payload: CreateLinodeRequest;
  secureVMNoticesEnabled: boolean;
  type: CreateTypes;
}) => {
  const {
    label,
    linode: linode,
    payload,
    secureVMNoticesEnabled,
    type,
  } = details;
  const eventInfo = actionsAndLabels[type];
  // Distinguish the form event create type by tab, which separates 'OS' from 'Image'.
  const eventCreateType =
    eventInfo?.action && payload?.image?.includes('linode/')
      ? 'OS'
      : capitalize(eventInfo?.action);
  let eventAction = 'unknown';
  let eventLabel = '';

  const secureVMCompliant = secureVMNoticesEnabled
    ? isNotNullOrUndefined(payload.firewall_id)
    : undefined;

  const isLinodePoweredOff =
    linode && eventAction == 'clone' ? linode.status === 'offline' : undefined;

  if (eventInfo) {
    eventAction = eventInfo.action;
    const payloadLabel = payload[eventInfo.labelPayloadKey];
    eventLabel = String(payloadLabel);
  }
  if (label) {
    eventLabel = label;
  }

  // Send custom event.
  sendCreateLinodeEvent(eventAction, eventLabel, {
    isLinodePoweredOff,
    secureVMCompliant,
  });
  // Send form event.
  sendLinodeCreateFormSubmitEvent({
    createType: eventCreateType as LinodeCreateType,
  });
};
