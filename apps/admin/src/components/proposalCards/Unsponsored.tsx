import {
  fromWei,
  handleErrorMessage,
  isNumberish,
  TXLego,
} from '@daohaus/utils';
import { MolochV3Proposal } from '@daohaus/moloch-v3-data';
import { useDHConnect } from '@daohaus/connect';
import { useTxBuilder } from '@daohaus/tx-builder';
import {
  Italic,
  ParSm,
  Loading,
  useBreakpoint,
  useToast,
  widthQuery,
} from '@daohaus/ui';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from 'styled-components';
import { useConnectedMember, useDao } from '@daohaus/moloch-v3-context';
import { PROP_CARD_HELP } from '../../data/copy';
import { ACTION_TX } from '../../legos/tx';
import { VotingBar } from '../VotingBar';
import { ActionTemplate } from './ActionPrimitives';
import { GatedButton } from './GatedButton';
import { ActionLifeCycleFns } from '../../utils/general';

export const Unsponsored = ({
  lifeCycleFnsOverride,
  proposal,
}: {
  lifeCycleFnsOverride?: ActionLifeCycleFns;
  proposal: MolochV3Proposal;
}) => {
  const { daochain } = useParams();
  const { fireTransaction } = useTxBuilder();
  const { connectedMember } = useConnectedMember();
  const { chainId } = useDHConnect();
  const { errorToast, defaultToast, successToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const { dao, refreshAll } = useDao();
  const isMobile = useBreakpoint(widthQuery.sm);

  const theme = useTheme();

  const handleSponsor = () => {
    const { proposalId } = proposal;

    if (!proposalId) return;
    setIsLoading(true);
    lifeCycleFnsOverride?.onActionTriggered?.();
    fireTransaction({
      tx: { ...ACTION_TX.SPONSOR, staticArgs: [proposalId] } as TXLego,
      lifeCycleFns: {
        onTxError: (error) => {
          const errMsg = handleErrorMessage({
            error,
          });
          errorToast({ title: 'Sponsor Failed', description: errMsg });
          lifeCycleFnsOverride?.onTxError?.(error);
          setIsLoading(false);
        },
        onTxSuccess: (...args) => {
          defaultToast({
            title: 'Sponsor Success',
            description: 'Please wait for subgraph to sync',
          });
          lifeCycleFnsOverride?.onTxSuccess?.(...args);
        },
        onPollError: (error) => {
          const errMsg = handleErrorMessage({
            error,
          });
          errorToast({ title: 'Poll Error', description: errMsg });
          lifeCycleFnsOverride?.onPollError?.(error);
          setIsLoading(false);
        },
        onPollSuccess: (...args) => {
          successToast({
            title: 'Sponsor Success',
            description: 'Proposal sponsored',
          });
          refreshAll();
          lifeCycleFnsOverride?.onPollSuccess?.(...args);
          setIsLoading(false);
        },
      },
    });
  };

  const hasShares = useMemo(() => {
    if (
      dao &&
      isNumberish(connectedMember?.shares) &&
      isNumberish(dao.sponsorThreshold)
    ) {
      return Number(connectedMember?.shares) >= Number(dao?.sponsorThreshold)
        ? true
        : `${fromWei(
            dao.sponsorThreshold
          )} voting stake tokens are required to sponsor this proposal.`;
    }
    return 'Subgraph data not loading or is not in sync';
  }, [dao, connectedMember]);

  const isConnectedToDao =
    chainId === daochain
      ? true
      : 'You are not connected to the same network as the DAO';

  const notDelegating = useMemo(() => {
    if (
      connectedMember?.delegatingTo &&
      isNumberish(connectedMember?.delegateShares)
    ) {
      return Number(connectedMember.delegateShares) > 0
        ? true
        : 'You cannot sponsor a proposal as you have delegated your voting power';
    }
    return 'Connect your wallet';
  }, [connectedMember]);

  return (
    <ActionTemplate
      statusDisplay="Needs a Sponsor"
      proposal={proposal}
      main={
        <>
          <VotingBar proposal={proposal} />
          <GatedButton
            size="sm"
            rules={[hasShares, isConnectedToDao, notDelegating]}
            onClick={handleSponsor}
            fullWidth={isMobile}
          >
            {isLoading ? <Loading size={20} /> : 'Sponsor Proposal'}
          </GatedButton>
        </>
      }
      helperDisplay={
        <ParSm color={theme.secondary.step11}>
          <Italic>{PROP_CARD_HELP.UNSPONSORED}</Italic>
          {typeof notDelegating === 'string' && (
            <Italic> {notDelegating}</Italic>
          )}
        </ParSm>
      }
    />
  );
};
