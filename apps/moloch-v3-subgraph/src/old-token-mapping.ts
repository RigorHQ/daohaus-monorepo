import { log } from '@graphprotocol/graph-ts';

import { Dao, Member, OldToken, OldTokenBalance } from '../generated/schema';
import { Transfer } from '../generated/templates/OldTokenTemplate/Erc20';
import { constants } from './util/constants';
import { BigInt, Address, Bytes } from '@graphprotocol/graph-ts';

// Transfer (index_topic_1 address from, index_topic_2 address to, uint256 value)
export function handleTokenTransfer(event: Transfer): void {
  const oldToken = OldToken.load(event.address.toHexString());
  if (oldToken == null) {
    log.info('handleTransfer token, no oldToken', []);
    return;
  }

  const fromHolderId = oldToken.id
    .concat('-holder-')
    .concat(event.params.from.toHexString());

  const toHolderId = oldToken.id
    .concat('-holder-')
    .concat(event.params.to.toHexString());

  let fromHolder = OldTokenBalance.load(fromHolderId);
  if (fromHolder == null) {
    fromHolder = new OldTokenBalance(fromHolderId);
    fromHolder.holder = event.params.from;
    fromHolder.balance = constants.BIGINT_ZERO;
  }

  let toHolder = OldTokenBalance.load(toHolderId);
  if (toHolder == null) {
    toHolder = new OldTokenBalance(toHolderId);
    toHolder.holder = event.params.to;
    toHolder.balance = constants.BIGINT_ZERO;
  }

  fromHolder.balance = fromHolder.balance.minus(event.params.value);

  toHolder.balance = toHolder.balance.plus(event.params.value);

  if (event.params.from.toHexString() != constants.ADDRESS_ZERO) {
    fromHolder.save();
  }
  if (event.params.to.toHexString() != constants.ADDRESS_ZERO) {
    toHolder.save();
  }

  let holders = oldToken.holders;

  if (
    !holders.includes(event.params.from.toHexString()) &&
    event.params.from.toHexString() != constants.ADDRESS_ZERO
  ) {
    holders.push(event.params.from.toHexString());
  }

  if (
    !holders.includes(event.params.to.toHexString()) &&
    event.params.to.toHexString() != constants.ADDRESS_ZERO
  ) {
    holders.push(event.params.to.toHexString());
  }

  oldToken.holders = holders;

  let balances = oldToken.balances;

  if (
    !balances.includes(fromHolderId) &&
    event.params.from.toHexString() != constants.ADDRESS_ZERO
  ) {
    balances.push(fromHolderId);
  }

  if (
    !balances.includes(toHolderId) &&
    event.params.to.toHexString() != constants.ADDRESS_ZERO
  ) {
    balances.push(toHolderId);
  }

  oldToken.balances = balances;

  oldToken.save();
}


export function mintShares(
  dao: Dao,
  memberId: string,
  balance: BigInt,
  timestamp: BigInt,
  memberAddress: Address
): void {
  if (balance == constants.BIGINT_ZERO) {
    return;
  }
  let member = Member.load(memberId);

  if (member === null) {
    member = new Member(memberId);
    member.createdAt = timestamp;
    member.txHash = Bytes.fromHexString(constants.BYTES32_ZERO) as Bytes;
    member.dao = dao.id;
    member.memberAddress = memberAddress;
    member.delegatingTo = memberAddress;
    member.shares = constants.BIGINT_ZERO;
    member.loot = constants.BIGINT_ZERO;
    member.sharesLootDelegateShares = constants.BIGINT_ZERO;
    member.delegateOfCount = constants.BIGINT_ZERO;
    member.delegateShares = constants.BIGINT_ZERO;

    const daoMembers = dao.members;
    daoMembers.push(memberId);
    dao.members = daoMembers;
  }
  const memberInitialSharesAndLoot = member.shares.plus(member.loot);

  member.shares = member.shares.plus(balance);
  member.sharesLootDelegateShares =
    member.sharesLootDelegateShares.plus(balance);
  dao.totalShares = dao.totalShares.plus(balance);

  if (memberInitialSharesAndLoot == constants.BIGINT_ZERO) {
    dao.activeMemberCount = dao.activeMemberCount.plus(constants.BIGINT_ONE);
  }

  member.save();
  dao.save();
}

export function mintLoot(
  dao: Dao,
  memberId: string,
  balance: BigInt,
  timestamp: BigInt,
  memberAddress: Address
): void {
  if (balance == constants.BIGINT_ZERO) {
    return;
  }

  let member = Member.load(memberId);

  if (member === null) {
    member = new Member(memberId);
    member.createdAt = timestamp;
    member.txHash = Bytes.fromHexString(constants.BYTES32_ZERO) as Bytes;
    member.dao = dao.id;
    member.memberAddress = memberAddress;
    member.delegatingTo = memberAddress;
    member.shares = constants.BIGINT_ZERO;
    member.loot = constants.BIGINT_ZERO;
    member.sharesLootDelegateShares = constants.BIGINT_ZERO;
    member.delegateOfCount = constants.BIGINT_ZERO;
    member.delegateShares = constants.BIGINT_ZERO;

    const daoMembers = dao.members;
    daoMembers.push(memberId);
    dao.members = daoMembers;
  }
  const memberInitialSharesAndLoot = member.shares.plus(member.loot);

  member.loot = member.loot.plus(balance);
  member.sharesLootDelegateShares =
    member.sharesLootDelegateShares.plus(balance);
  dao.totalLoot = dao.totalLoot.plus(balance);

  if (memberInitialSharesAndLoot == constants.BIGINT_ZERO) {
    dao.activeMemberCount = dao.activeMemberCount.plus(constants.BIGINT_ONE);
  }

  member.save();
  dao.save();
}
