'use client';

import { useEffect, useState } from 'react';
import {
  ConnectButton,
  createDAppKit,
  DAppKitProvider,
  useCurrentAccount,
  useCurrentClient,
  useCurrentNetwork,
  useDAppKit,
  useWalletConnection,
} from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { DEPLOYED_PACKAGE_ID } from '@/lib/sui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PublishAttestationProps = {
  receiptId: string;
  receiptHash: string;
  rulesetHash: string;
};

type Network = 'testnet' | 'devnet' | 'mainnet';

const NETWORKS: Network[] = ['testnet', 'devnet', 'mainnet'];

const FULLNODE_URLS: Record<Network, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
};

const IS_CONFIGURED_PACKAGE_ID = !/^0x0+$/.test(DEPLOYED_PACKAGE_ID);

async function getSpendableGasMist(client: { core: { listCoins: (options: {
  owner: string;
  coinType?: string;
  cursor?: string | null;
  limit?: number;
}) => Promise<{ objects: Array<{ balance: string }>; hasNextPage: boolean; cursor: string | null }> } }, owner: string): Promise<bigint> {
  let total = 0n;
  let cursor: string | null = null;
  let pages = 0;

  while (pages < 5) {
    const page = await client.core.listCoins({
      owner,
      coinType: '0x2::sui::SUI',
      cursor,
      limit: 100,
    });

    for (const coin of page.objects) {
      total += BigInt(coin.balance || '0');
    }

    if (!page.hasNextPage || !page.cursor) {
      break;
    }

    cursor = page.cursor;
    pages += 1;
  }

  return total;
}

function hexToBytes(hex: string): number[] {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[a-f0-9]+$/i.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const output: number[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    output.push(Number.parseInt(normalized.slice(index, index + 2), 16));
  }

  return output;
}

function extractDigest(result: unknown): string {
  const payload = result as {
    $kind?: 'Transaction' | 'FailedTransaction';
    Transaction?: { digest?: string };
    FailedTransaction?: { digest?: string };
  };

  return payload.$kind === 'FailedTransaction'
    ? payload.FailedTransaction?.digest ?? ''
    : payload.Transaction?.digest ?? '';
}

function isMissingStatusError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('missing status') || message.includes('status');
}

function decodeBase64(value: string): Uint8Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

function extractCreatedObjectId(transactionResult: unknown): string | null {
  const payload = transactionResult as {
    $kind?: 'Transaction' | 'FailedTransaction';
    Transaction?: {
      effects?: {
        changedObjects?: Array<{ objectId?: string; idOperation?: string; outputState?: string }>;
      };
    };
    FailedTransaction?: {
      effects?: {
        changedObjects?: Array<{ objectId?: string; idOperation?: string; outputState?: string }>;
      };
    };
  };

  const tx = payload.$kind === 'FailedTransaction' ? payload.FailedTransaction : payload.Transaction;
  const created = tx?.effects?.changedObjects?.find(
    (obj) => obj.idOperation === 'Created' && obj.outputState === 'ObjectWrite',
  );

  return created?.objectId ?? null;
}

function resolveDefaultNetwork(): Network {
  const envNetwork = process.env.NEXT_PUBLIC_SUI_NETWORK;
  if (envNetwork === 'testnet' || envNetwork === 'devnet' || envNetwork === 'mainnet') {
    return envNetwork;
  }

  return 'testnet';
}

function PublishAttestationInner({ receiptId, receiptHash, rulesetHash }: PublishAttestationProps) {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const walletConnection = useWalletConnection();
  const currentClient = useCurrentClient();
  const currentNetwork = useCurrentNetwork();

  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [objectId, setObjectId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [gasBalanceMist, setGasBalanceMist] = useState<bigint | null>(null);
  const [isGasLoading, setIsGasLoading] = useState(false);

  const activeAccount = walletConnection.account ?? account ?? null;
  const activeWalletName = walletConnection.wallet?.name ?? null;
  const isBurnerWallet = activeWalletName?.toLowerCase().includes('burner') ?? false;
  const publishDisabledReason = !walletConnection.wallet
    ? 'No wallet connected.'
    : !activeAccount
      ? 'Wallet connected, but no active account is selected.'
      : !IS_CONFIGURED_PACKAGE_ID
        ? 'Contract package id is not configured.'
        : isPublishing
          ? 'Publishing transaction in progress.'
          : null;

  const selectedNetwork: Network =
    currentNetwork === 'devnet' || currentNetwork === 'mainnet' || currentNetwork === 'testnet'
      ? currentNetwork
      : 'testnet';

  useEffect(() => {
    let cancelled = false;

    const loadGas = async () => {
      if (!activeAccount) {
        setGasBalanceMist(null);
        return;
      }

      setIsGasLoading(true);
      try {
        const mist = await getSpendableGasMist(currentClient, activeAccount.address);
        if (!cancelled) {
          setGasBalanceMist(mist);
        }
      } catch {
        if (!cancelled) {
          setGasBalanceMist(null);
        }
      } finally {
        if (!cancelled) {
          setIsGasLoading(false);
        }
      }
    };

    void loadGas();

    return () => {
      cancelled = true;
    };
  }, [activeAccount?.address, currentClient, currentNetwork]);

  const publish = async () => {
    setError(null);
    setSaved(false);
    setTxDigest(null);
    setObjectId(null);

    if (!activeAccount) {
      setError('Connect wallet first.');
      return;
    }

    if (!IS_CONFIGURED_PACKAGE_ID) {
      setError('Set NEXT_PUBLIC_SUI_PACKAGE_ID with deployed contract package id.');
      return;
    }

    setIsPublishing(true);

    try {
      const gasBalance = await getSpendableGasMist(currentClient, activeAccount.address);
      if (gasBalance <= 0n) {
        throw new Error(
          `No spendable SUI gas coins on ${selectedNetwork} for ${activeAccount.address}. Fund this exact address from faucet and retry.`,
        );
      }

      const tx = new Transaction();
      const receiptUrl = `${window.location.origin}/api/receipts/${receiptId}`;

      tx.moveCall({
        target: `${DEPLOYED_PACKAGE_ID}::receipt_attestation::publish_attestation`,
        arguments: [
          tx.pure.vector('u8', hexToBytes(receiptHash)),
          tx.pure.vector('u8', hexToBytes(rulesetHash)),
          tx.pure.string(receiptUrl),
        ],
      });

      let digest = '';
      let finalized: unknown | null = null;

      try {
        const txResult = await dAppKit.signAndExecuteTransaction({ transaction: tx });
        digest = extractDigest(txResult);
      } catch (error) {
        if (!isMissingStatusError(error)) {
          throw error;
        }

        const signed = (await dAppKit.signTransaction({ transaction: tx })) as {
          bytes: string;
          signature: string;
        };

        const executed = await currentClient.core.executeTransaction({
          transaction: decodeBase64(signed.bytes),
          signatures: [signed.signature],
          include: {
            effects: true,
            transaction: true,
            bcs: true,
          },
        });

        digest = extractDigest(executed);
        finalized = executed;
      }

      if (!digest) {
        throw new Error('Transaction digest missing in wallet response');
      }

      if (!finalized) {
        finalized = await currentClient.core.getTransaction({
          digest,
          include: {
            effects: true,
          },
        });
      }

      const createdObjectId = extractCreatedObjectId(finalized);
      if (!createdObjectId) {
        throw new Error('Unable to detect created attestation object id from transaction effects');
      }

      const response = await fetch('/api/attest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receipt_id: receiptId,
          network: selectedNetwork,
          tx_digest: digest,
          object_id: createdObjectId,
          issuer: activeAccount.address,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Failed to save attestation reference');
      }

      setTxDigest(digest);
      setObjectId(createdObjectId);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attestation publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish Sui Attestation</CardTitle>
        <CardDescription>
          Connect wallet, publish on-chain attestation, and store tx digest/object id for later verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="font-mono">package_id: {DEPLOYED_PACKAGE_ID}</p>
          <p className="font-mono">receipt_hash: {receiptHash}</p>
          <p className="font-mono">ruleset_hash: {rulesetHash}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ConnectButton />
          <label className="text-xs text-muted-foreground">
            Network:
            <select
              value={selectedNetwork}
              onChange={(event) =>
                (dAppKit as unknown as { switchNetwork: (network: Network) => void }).switchNetwork(
                  event.target.value as Network,
                )
              }
              className="ml-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="testnet">testnet</option>
              <option value="devnet">devnet</option>
              <option value="mainnet">mainnet</option>
            </select>
          </label>
        </div>

        <div className="rounded-md border border-border bg-background p-3 text-xs">
          <p className="break-words">Wallet: {activeWalletName ?? 'Not connected'}</p>
          <p className="break-all">Account: {activeAccount?.address ?? 'Not selected'}</p>
          <p>Network: {selectedNetwork}</p>
          <p>Gas (MIST): {isGasLoading ? 'Checking...' : gasBalanceMist?.toString() ?? 'Unknown'}</p>
        </div>

        {isBurnerWallet ? (
          <p className="text-xs text-amber-700">
            Burner wallet uses a local throwaway key. If you reload or reconnect, address may change. Fund the exact
            address shown above.
          </p>
        ) : null}

        <Button
          onClick={publish}
          disabled={Boolean(publishDisabledReason)}
          className="w-full"
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing attestation...
            </>
          ) : (
            'Publish Attestation On-Chain'
          )}
        </Button>

        {publishDisabledReason ? (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              {publishDisabledReason}
            </p>
          </div>
        ) : null}

        {!IS_CONFIGURED_PACKAGE_ID ? (
          <p className="text-xs text-amber-700">
            Set `NEXT_PUBLIC_SUI_PACKAGE_ID` to enable publish flow after deploying contract.
          </p>
        ) : null}

        {saved && txDigest && objectId ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
            <p className="mb-1 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Attestation published and saved.
            </p>
            <p className="font-mono">issuer: {activeAccount?.address}</p>
            <p className="font-mono">tx_digest: {txDigest}</p>
            <p className="font-mono">object_id: {objectId}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PublishAttestation(props: PublishAttestationProps) {
  const [dAppKit, setDAppKit] = useState<unknown | null>(null);

  useEffect(() => {
    setDAppKit(
      createDAppKit({
        networks: NETWORKS,
        defaultNetwork: resolveDefaultNetwork(),
        createClient: (network) =>
          new SuiGrpcClient({
            network,
            baseUrl: FULLNODE_URLS[network],
          }),
        enableBurnerWallet: true,
      }),
    );
  }, []);

  if (!dAppKit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Publish Sui Attestation</CardTitle>
          <CardDescription>Initializing wallet toolkit...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <DAppKitProvider dAppKit={dAppKit as ReturnType<typeof createDAppKit>}>
      <PublishAttestationInner {...props} />
    </DAppKitProvider>
  );
}
