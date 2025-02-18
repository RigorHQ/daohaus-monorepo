import { useMemo } from 'react';
import { RiMore2Fill } from 'react-icons/ri/index.js';
import {
  DropdownMenu,
  DropdownItem,
  DropdownTrigger,
  DropdownContent,
} from '@daohaus/ui';
import { getNetwork, Keychain } from '@daohaus/keychain-utils';
import { SafeActionMenuLink, SafeActionMenuTrigger } from './SafeCard.styles';
import { useDaoMember } from '@daohaus/moloch-v3-hooks';
import { useDHConnect } from '@daohaus/connect';

type SafeActionMenuProps = {
  ragequittable: boolean;
  safeAddress: string;
  daoChain: string;
  daoId: string;
};

export const SafeActionMenu = ({
  ragequittable,
  safeAddress,
  daoChain,
  daoId,
}: SafeActionMenuProps) => {
  const { address } = useDHConnect();
  const { member } = useDaoMember({
    daoId,
    daoChain: daoChain as keyof Keychain,
    memberAddress: address,
  });

  const enableActions = useMemo(() => {
    return member && Number(member.shares) > 0;
  }, [member]);

  const networkData = useMemo(() => {
    if (!daoChain) return null;
    return getNetwork(daoChain);
  }, [daoChain]);

  if (!enableActions) return null;

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <SafeActionMenuTrigger
          IconRight={RiMore2Fill}
          size="sm"
          variant="ghost"
        />
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem key="erc20" asChild>
          <SafeActionMenuLink
            to={`/molochv3/${daoChain}/${daoId}/new-proposal?formLego=${
              ragequittable
                ? 'TRANSFER_ERC20'
                : `TRANSFER_ERC20_SIDECAR&defaultValues={"safeAddress":"${safeAddress}"}`
            }`}
          >
            Transfer ERC-20
          </SafeActionMenuLink>
        </DropdownItem>
        <DropdownItem key="eth" asChild>
          <SafeActionMenuLink
            to={`/molochv3/${daoChain}/${daoId}/new-proposal?formLego=${
              ragequittable
                ? 'TRANSFER_NETWORK_TOKEN'
                : `TRANSFER_NETWORK_TOKEN_SIDECAR&defaultValues={"safeAddress":"${safeAddress}"}`
            }`}
          >
            Transfer {networkData?.symbol}
          </SafeActionMenuLink>
        </DropdownItem>
        <DropdownItem key="txbuilder" asChild>
          <SafeActionMenuLink
            to={`/molochv3/${daoChain}/${daoId}/new-proposal?formLego=${
              ragequittable
                ? 'MULTICALL'
                : `MULTICALL_SIDECAR&defaultValues={"safeAddress":"${safeAddress}"}`
            }`}
          >
            Tx Builder
          </SafeActionMenuLink>
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
};
