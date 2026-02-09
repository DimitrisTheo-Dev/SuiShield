import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { env } from './env';

export const DEFAULT_SUI_NETWORK = env.NEXT_PUBLIC_SUI_NETWORK;
export const DEPLOYED_PACKAGE_ID =
  env.NEXT_PUBLIC_SUI_PACKAGE_ID ?? '0x0000000000000000000000000000000000000000000000000000000000000000';

export function createSuiClient(network: 'mainnet' | 'testnet' | 'devnet' = DEFAULT_SUI_NETWORK) {
  return new SuiClient({ url: getFullnodeUrl(network) });
}

export async function fetchAttestationObject(objectId: string, network: 'mainnet' | 'testnet' | 'devnet') {
  const client = createSuiClient(network);
  const object = await client.getObject({
    id: objectId,
    options: {
      showContent: true,
      showOwner: true,
      showType: true,
    },
  });

  return object;
}
