import { createPublicClient, http } from "viem";
import { blast } from "viem/chains";

const client = createPublicClient({
  transport: http(process.env.RPC_URL),
  chain: blast,
});

const startBlock = 5145493n;
const endBlock = 6700692n;

await getMarket(client, blastWETHUSDB, startBlock, endBlock);
