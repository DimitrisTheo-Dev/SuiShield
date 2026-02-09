import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function npmViewVersion(pkg: string): string {
  const version = execSync(`npm view ${pkg} version`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  return version;
}

function main() {
  const now = new Date().toISOString();
  const suiVersion = npmViewVersion('@mysten/sui');
  const dappKitReactVersion = npmViewVersion('@mysten/dapp-kit-react');
  const dappKitCoreVersion = npmViewVersion('@mysten/dapp-kit-core');

  const output = `# Sui SDK Versions\n\nGenerated: ${now}\n\n- @mysten/sui: ${suiVersion}\n- @mysten/dapp-kit-react: ${dappKitReactVersion}\n- @mysten/dapp-kit-core: ${dappKitCoreVersion}\n\nCommand used:\n\n\`\`\`bash\nnpm view @mysten/sui version\nnpm view @mysten/dapp-kit-react version\nnpm view @mysten/dapp-kit-core version\n\`\`\`\n`;

  const docsDir = path.resolve('docs');
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(path.join(docsDir, 'sdk_versions.md'), output, 'utf8');

  console.log('Wrote docs/sdk_versions.md');
}

main();
