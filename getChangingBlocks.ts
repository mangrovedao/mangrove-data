import type { MarketParams } from "@mangrovedao/mgv";
import {
  blastBLASTWETH,
  blastMangrove,
  blastUSDeUSDB,
  blastWETHUSDB,
} from "@mangrovedao/mgv/addresses";
import {
  createPublicClient,
  encodeEventTopics,
  http,
  numberToHex,
  type AbiEvent,
  type EncodeEventTopicsParameters,
  type LogTopic,
  type PublicClient,
} from "viem";
import { getSemibooksOLKeys, hash } from "@mangrovedao/mgv/lib";
import { blast } from "viem/chains";

const changingEventsABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "olKeyHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "maker",
        type: "address",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "tick",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "gives",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "gasprice",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "gasreq",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "OfferWrite",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "olKeyHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "maker",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "deprovision",
        type: "bool",
      },
    ],
    name: "OfferRetract",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "olKeyHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "taker",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerWants",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerGives",
        type: "uint256",
      },
    ],
    name: "OfferSuccess",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "olKeyHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "taker",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerWants",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerGives",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "posthookData",
        type: "bytes32",
      },
    ],
    name: "OfferSuccessWithPosthookData",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "olKeyHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "taker",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerWants",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerGives",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "penalty",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "mgvData",
        type: "bytes32",
      },
    ],
    name: "OfferFail",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "olKeyHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "taker",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerWants",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "takerGives",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "penalty",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "mgvData",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "posthookData",
        type: "bytes32",
      },
    ],
    name: "OfferFailWithPosthookData",
    type: "event",
  },
] as const;

export async function getChangingBlocks(
  client: PublicClient,
  market: MarketParams,
  startBlock: bigint,
  endBlock: bigint
) {
  const { asksMarket, bidsMarket } = getSemibooksOLKeys(market);
  const asksOlKeyHash = hash(asksMarket).toLowerCase();
  const bidsOlKeyHash = hash(bidsMarket).toLowerCase();
  const events = await client.getLogs({
    address: blastMangrove.mgv,
    fromBlock: startBlock,
    toBlock: endBlock,
    events: changingEventsABI,
  });

  const blocks = new Set<bigint>();
  blocks.add(startBlock);
  for (const log of events) {
    const olKey = log.args.olKeyHash?.toLowerCase();
    if (olKey === asksOlKeyHash || olKey === bidsOlKeyHash) {
      blocks.add(log.blockNumber);
    }
  }
  return Array.from(blocks).sort((a, b) => Number(a - b));
}

// const client = createPublicClient({
//   chain: blast,
//   transport: http(),
// });

// const test = await getChangingBlocks(client, blastUSDeUSDB, 5144593n, 5154593n);
// console.log(test);
