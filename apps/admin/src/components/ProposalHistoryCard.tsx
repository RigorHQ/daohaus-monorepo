import { MouseEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri/index.js';
import styled from 'styled-components';

import { ExplorerLink } from '@daohaus/connect';
import { Keychain, ValidNetwork } from '@daohaus/keychain-utils';
import { MolochV3Proposal } from '@daohaus/moloch-v3-data';
import {
  Bold,
  Button,
  DataIndicator,
  Dialog,
  DialogTrigger,
  DialogContent,
  ParLg,
  ParMd,
  widthQuery,
  useBreakpoint,
} from '@daohaus/ui';
import { formatValueTo, fromWei } from '@daohaus/utils';

import {
  ProposalHistoryElement,
  ProposalHistoryElementData,
} from '../utils/historyHelpers';
import { MemberProfileAvatar } from './MemberProfileAvatar';
import { VoteList } from './VoteList';

const ElementContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 2rem 0;
  border-bottom: 1px solid #ffffff16;
`;

const VisibleContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
`;

const StyledTitle = styled(Bold)<{ active: boolean }>`
  color: ${({ theme, active }) => active && theme.primary.step10};
`;

const StyledUpArrow = styled(RiArrowUpSLine)`
  font-size: 4.8rem;
  font-weight: 900;
  color: ${({ theme }) => theme.primary.step10};
`;

const StyledDownArrow = styled(RiArrowDownSLine)`
  font-size: 4.8rem;
  font-weight: 900;
  color: ${({ theme }) => theme.primary.step10};
`;

const DataGrid = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 2.4rem;
`;

const LinkContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-top: 2.5rem;
`;

const VotesButton = styled(Button)`
  min-width: 10.6rem;
`;

const DataPoint = ({
  data,
  daochain,
  daoid,
}: {
  data: ProposalHistoryElementData;
  daochain?: string;
  daoid?: string;
}) => {
  if (data.dataType === 'member') {
    return (
      <div>
        <ParMd>{data.label}</ParMd>
        <MemberProfileAvatar
          daoid={daoid}
          daochain={daochain as keyof Keychain}
          memberAddress={data.data}
        />
      </div>
    );
  }

  if (data.dataType === 'dataIndicator') {
    return <DataIndicator label={data.label} data={data.data} />;
  }

  return null;
};

type ProposalHistoryCardProps = {
  element: ProposalHistoryElement;
  proposal?: MolochV3Proposal;
};

export const ProposalHistoryCard = ({
  element,
  proposal,
}: ProposalHistoryCardProps) => {
  const isMobile = useBreakpoint(widthQuery.sm);
  const { daochain, daoid } = useParams();
  const [open, setOpen] = useState<boolean>(false);

  const handleToggle = (event: MouseEvent<HTMLDivElement>) => {
    setOpen((prevState) => !prevState);
  };

  const hasProposalVotes =
    proposal && proposal.votes && proposal.votes.length > 0;

  const totalVotes = hasProposalVotes
    ? formatValueTo({
        value:
          Number(fromWei(proposal.yesBalance)) +
          Number(fromWei(proposal.noBalance)),
        decimals: 0,
        format: 'numberShort',
        separator: '',
      })
    : '0';

  return (
    <ElementContainer>
      <VisibleContainer>
        <ContentContainer>
          <ParLg>
            <StyledTitle active={element.active}>{element.title}</StyledTitle>
          </ParLg>
          {element.text && <ParMd>{element.text}</ParMd>}
        </ContentContainer>
        {element.canExpand && open && (
          <div onClick={handleToggle}>
            <StyledUpArrow />
          </div>
        )}
        {element.canExpand && !open && (
          <div onClick={handleToggle}>
            <StyledDownArrow />
          </div>
        )}
        {element.showVotesButton && hasProposalVotes && (
          <Dialog>
            <DialogTrigger asChild>
              <VotesButton color="secondary" size="sm">
                Show Votes
              </VotesButton>
            </DialogTrigger>
            <DialogContent
              alignButtons="end"
              rightButton={{
                closeDialog: true,
                fullWidth: isMobile,
              }}
              title={`Proposal Votes (${totalVotes})`}
            >
              <VoteList votes={proposal.votes} proposal={proposal} />
            </DialogContent>
          </Dialog>
        )}
      </VisibleContainer>
      {element.canExpand && open && (
        <>
          <DataGrid>
            {element.dataElements &&
              element.dataElements.map((data) => (
                <DataPoint
                  data={data}
                  daochain={daochain}
                  daoid={daoid}
                  key={data.label}
                />
              ))}
          </DataGrid>

          {element.txHash && (
            <LinkContainer>
              <ExplorerLink
                address={element.txHash}
                chainId={daochain as ValidNetwork}
                type="tx"
              >
                View Transaction
              </ExplorerLink>
            </LinkContainer>
          )}
        </>
      )}
    </ElementContainer>
  );
};
