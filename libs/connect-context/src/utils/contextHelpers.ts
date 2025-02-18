import { Dispatch, SetStateAction } from 'react';
import { NetworkConfigs, ValidNetwork } from '@daohaus/keychain-utils';
import { getProfileForAddress } from '@daohaus/profile-data';

import { UserProfile, ConnectLifecycleFns } from './types';

export const numberToHex = (number: number) => {
  return `0x${number.toString(16)}`;
};

export const truncateAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const loadProfile = async ({
  address,
  chainId,
  setProfile,
  setProfileLoading,
  shouldUpdate,
  lifeCycleFns,
  networks,
}: {
  address: string;
  chainId: ValidNetwork;
  setProfile: Dispatch<SetStateAction<UserProfile>>;
  setProfileLoading: Dispatch<SetStateAction<boolean>>;
  shouldUpdate: boolean;
  lifeCycleFns?: ConnectLifecycleFns;
  networks: NetworkConfigs;
}) => {
  try {
    setProfileLoading(true);
    const daochain = !['0x1', '0x5'].includes(chainId) ? '0x1' : chainId;
    const profile = await getProfileForAddress(
      address,
      networks[daochain]?.rpc
    );

    if (profile && shouldUpdate) {
      const displayName =
        profile.name || profile.ens || truncateAddress(address);
      setProfile({ ...profile, displayName });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (web3Error: any) {
    const errMsg =
      typeof web3Error === 'string'
        ? web3Error
        : web3Error?.message || 'Unknown Error';
    lifeCycleFns?.onConnectError?.({
      name: 'Connection Error',
      message: errMsg,
    });
    console.error(web3Error);
    setProfile({ displayName: '', address: '', ens: '' });
    lifeCycleFns?.onProfileError?.(web3Error);
  } finally {
    if (shouldUpdate) {
      setProfileLoading(false);
    }
  }
};
