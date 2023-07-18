import { ethers } from 'ethers';
import { PublicClient } from 'wagmi';
import { goerli } from 'wagmi/chains';
import { createWalletClient, custom } from 'viem';

import { ABI, ArbitraryState, ReactSetter, TXLego } from '@daohaus/utils';
import { Keychain, PinataApiKeys, ValidNetwork } from '@daohaus/keychain-utils';

import { pollLastTX, standardGraphPoll, testLastTX } from './polling';
import { processArgs } from './args';
import { processContractLego } from './contractHelpers';
import { ArgCallback, TXLifeCycleFns } from '../TXBuilder';
import { processOverrides } from './overrides';

export type TxRecord = Record<string, TXLego>;
export type MassState = {
  tx: TXLego;
  chainId: ValidNetwork;
  safeId?: string;
  daoid?: string;
  localABIs: Record<string, ABI>;
  appState: ArbitraryState;
};

// The console logs below are to help devs monitor and debug their txs.

export const executeTx = async (args: {
  tx: TXLego;
  ethersTx: {
    hash: string;
    wait: () => Promise<ethers.providers.TransactionReceipt>;
  };
  setTransactions: ReactSetter<TxRecord>;
  chainId: ValidNetwork;
  lifeCycleFns?: TXLifeCycleFns;
  graphApiKeys: Keychain;
  appState: ArbitraryState;
}) => {
  const {
    tx,
    ethersTx,
    setTransactions,
    chainId,
    lifeCycleFns,
    graphApiKeys,
    appState,
  } = args;
  console.log('**Transaction Initatiated**');
  const txHash = ethersTx.hash;
  console.log('txHash', txHash);
  try {
    lifeCycleFns?.onTxHash?.(ethersTx.hash);
    setTransactions((prevState) => ({
      ...prevState,
      [txHash]: { ...tx, status: 'idle' },
    }));
    console.log('**Transaction Pending**');
    const receipt = await ethersTx.wait();
    console.log('**Transaction Mined**');
    console.log('**Transaction Receipt**', receipt);

    if (receipt.status === 0) {
      throw new Error('CALL_EXCEPTION: txReceipt status 0');
    }

    setTransactions((prevState) => ({
      ...prevState,
      [txHash]: { ...tx, status: 'polling' },
    }));
    console.log('**Transaction Successful**');
    lifeCycleFns?.onTxSuccess?.(receipt, txHash, appState);

    if (!tx.disablePoll) {
      standardGraphPoll({
        poll: tx?.customPoll?.fetch || pollLastTX,
        test: tx?.customPoll?.test || testLastTX,
        variables: {
          chainId,
          txHash,
          graphApiKeys,
        },
        onPollStart() {
          lifeCycleFns?.onPollStart?.();
          console.log('**Polling**');
        },
        onPollSuccess(result) {
          lifeCycleFns?.onPollSuccess?.(result, receipt, appState);
          console.log('**Poll Successful**');
          setTransactions((prevState) => ({
            ...prevState,
            [txHash]: { ...tx, status: 'success' },
          }));
        },
        onPollError(error) {
          lifeCycleFns?.onPollError?.(error);
          console.log('**Poll Error**');
          setTransactions((prevState) => ({
            ...prevState,
            [txHash]: { ...tx, status: 'pollFailed' },
          }));
        },
      });
    }
    return {
      receipt,
      txHash,
    };
  } catch (error) {
    console.log('**TX Error**');
    console.error(error);
    lifeCycleFns?.onTxError?.(error);
    setTransactions((prevState) => ({
      ...prevState,
      [txHash]: { ...tx, status: 'failed' },
    }));
    return;
  }
};

export async function prepareTX(args: {
  tx: TXLego;
  chainId: ValidNetwork;
  safeId?: string;
  // provider: providers.Web3Provider;
  setTransactions: ReactSetter<TxRecord>;
  appState: ArbitraryState;
  lifeCycleFns: TXLifeCycleFns;
  localABIs: Record<string, ABI>;
  argCallbackRecord: Record<string, ArgCallback>;
  rpcs: Keychain;
  graphApiKeys: Keychain;
  pinataApiKeys: PinataApiKeys;
  explorerKeys: Keychain;
  publicClient?: PublicClient;
}) {
  const {
    argCallbackRecord,
    tx,
    chainId,
    safeId,
    // provider,
    localABIs,
    lifeCycleFns,
    appState,
    rpcs,
    explorerKeys,
    pinataApiKeys,
    graphApiKeys,
    publicClient,
  } = args;
  console.log('**APPLICATION STATE**', appState);
  try {
    const processedContract = await processContractLego({
      localABIs,
      contract: tx.contract,
      chainId,
      appState,
      rpcs,
      explorerKeys,
    });
    console.log('**PROCESSED CONTRACT**', processedContract);

    const { abi, address } = processedContract;
    const { method } = tx;

    const processedArgs = await processArgs({
      tx: { ...tx, contract: processedContract },
      localABIs,
      chainId,
      safeId,
      appState,
      argCallbackRecord,
      rpcs,
      pinataApiKeys,
      explorerKeys,
    });

    console.log('**PROCESSED ARGS**', processedArgs);

    const overrides = await processOverrides({
      tx,
      localABIs,
      chainId,
      safeId,
      appState,
      rpcs,
      pinataApiKeys,
      explorerKeys,
    });

    console.log('**PROCESSED overrides**', overrides);

    // const contract = new ethers.Contract(
    //   address,
    //   abi,
    //   provider.getSigner().connectUnchecked()
    // );

    // lifeCycleFns?.onRequestSign?.();

    // const ethersTx = await contract.functions[method](
    //   ...processedArgs,
    //   overrides
    // );

    // executeTx({ ...args, ethersTx, graphApiKeys });

    if (!publicClient) {
      return;
    }

    // @ts-expect-error because
    const [account] = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    console.log('account', account);
    console.log('publicClient', publicClient);

    const walletClient = createWalletClient({
      chain: goerli,
      account,

      // not sure if we can use window.ethereum on all wallets
      // @ts-expect-error because
      transport: custom(window.ethereum),
    });

    // @ts-expect-error because
    console.log('window.ethereum', window.ethereum);
    console.log('walletClient', walletClient);

    console.info({
      account,
      address: address as `0x${string}`,
      abi,
      functionName: method,
    });

    const { request } = await publicClient.simulateContract({
      account,
      address: address as `0x${string}`,
      abi,
      args: processedArgs,
      functionName: method,
    });

    console.log('request', request);

    const res = await walletClient.writeContract(request);

    console.log('res', res);
  } catch (error) {
    console.log('**TX Error**');
    console.error(error);
    lifeCycleFns?.onTxError?.(error);
  }
}
