import { SuiGrpcClient } from '@mysten/sui/grpc';
import { env } from './env';

export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet';

const FULLNODE_URLS: Record<SuiNetwork, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
};

export const DEFAULT_SUI_NETWORK: SuiNetwork = env.NEXT_PUBLIC_SUI_NETWORK;
const rawPackageId =
  env.NEXT_PUBLIC_SUI_PACKAGE_ID ?? '0x0000000000000000000000000000000000000000000000000000000000000000';

export const DEPLOYED_PACKAGE_ID = rawPackageId.trim().replace(/^['"]|['"]$/g, '');

export function createSuiClient(network: SuiNetwork = DEFAULT_SUI_NETWORK) {
  return new SuiGrpcClient({
    network,
    baseUrl: FULLNODE_URLS[network],
  });
}

export async function fetchAttestationObject(objectId: string, network: SuiNetwork) {
  const client = createSuiClient(network);
  const { object } = await client.getObject({
    objectId,
    include: {
      json: true,
      content: true,
      previousTransaction: true,
    },
  });

  return object;
}
