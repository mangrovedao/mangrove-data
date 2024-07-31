import { createPublicClient, http } from "viem";
import { blast } from "viem/chains";
import { getLines } from "./getLines";
import {
  blastBLASTUSDB,
  blastBLASTWETH,
  blastmwstETHWPUNKS20WETH,
  blastmwstETHWPUNKS40WETH,
  blastUSDeUSDB,
  blastWETHUSDB,
} from "@mangrovedao/mgv/addresses";
import { getMarket } from "./getMarket";

const client = createPublicClient({
  transport: http(process.env.RPC_URL),
  chain: blast,
});

const startBlock = 5145493n;
const endBlock = 6700692n;

await getMarket(client, blastWETHUSDB, startBlock, endBlock);
