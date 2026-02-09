import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { scanDemoFixture } from '../packages/scanner/src/index';

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

function runCommand(command: string, cwd?: string): { ok: boolean; output: string } {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd,
    }).trim();
    return { ok: true, output };
  } catch (error) {
    const output = error instanceof Error ? error.message : 'Command failed';
    return { ok: false, output };
  }
}

function getGitHubRepoInfo(): { url: string | null; ownerRepo: string | null } {
  const remote = runCommand('git remote get-url origin');
  if (!remote.ok || !remote.output) {
    return { url: null, ownerRepo: null };
  }

  const url = remote.output;

  const httpsMatch = url.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/);
  if (!httpsMatch) {
    return { url, ownerRepo: null };
  }

  return { url, ownerRepo: httpsMatch[1] };
}

async function checkCiStatus(ownerRepo: string): Promise<Check> {
  try {
    const response = await fetch(`https://api.github.com/repos/${ownerRepo}/actions/runs?per_page=1`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SuiShield-Submission-Check/1.0',
      },
    });

    if (!response.ok) {
      return {
        name: 'CI latest run',
        ok: false,
        detail: `GitHub API returned ${response.status}. Ensure repo is public and CI has run.`,
      };
    }

    const data = (await response.json()) as {
      workflow_runs?: Array<{ conclusion: string | null; status: string; html_url: string }>;
    };

    const latest = data.workflow_runs?.[0];
    if (!latest) {
      return {
        name: 'CI latest run',
        ok: false,
        detail: 'No workflow runs found. Push and run CI once.',
      };
    }

    const ok = latest.conclusion === 'success';
    return {
      name: 'CI latest run',
      ok,
      detail: `${latest.status}/${latest.conclusion ?? 'n/a'} - ${latest.html_url}`,
    };
  } catch (error) {
    return {
      name: 'CI latest run',
      ok: false,
      detail: error instanceof Error ? error.message : 'Unable to query CI status',
    };
  }
}

function checkFileIncludes(filePath: string, requiredTerms: string[]): Check {
  const fullPath = path.resolve(filePath);
  if (!existsSync(fullPath)) {
    return { name: `File exists: ${filePath}`, ok: false, detail: 'Missing' };
  }

  const content = readFileSync(fullPath, 'utf8');
  const missing = requiredTerms.filter((term) => !content.includes(term));

  return {
    name: `File content: ${filePath}`,
    ok: missing.length === 0,
    detail: missing.length === 0 ? 'All required terms present' : `Missing: ${missing.join(', ')}`,
  };
}

async function main() {
  const checks: Check[] = [];

  const gitInfo = getGitHubRepoInfo();
  checks.push({
    name: 'Repo public reminder',
    ok: Boolean(gitInfo.url),
    detail: gitInfo.url
      ? `Ensure this GitHub repo is public: ${gitInfo.url}`
      : 'No origin remote set. Set origin to your public GitHub repository.',
  });

  if (gitInfo.ownerRepo) {
    checks.push(await checkCiStatus(gitInfo.ownerRepo));
  } else {
    checks.push({
      name: 'CI latest run',
      ok: false,
      detail: 'Could not parse GitHub owner/repo from origin remote URL.',
    });
  }

  try {
    const demo = await scanDemoFixture();
    checks.push({
      name: 'Demo scan fixture',
      ok: Boolean(demo.receipt.hashes.receipt_hash),
      detail: `receipt_hash=${demo.receipt.hashes.receipt_hash}`,
    });
  } catch (error) {
    checks.push({
      name: 'Demo scan fixture',
      ok: false,
      detail: error instanceof Error ? error.message : 'Demo scan failed',
    });
  }

  const contractBuild = spawnSync('pnpm', ['contract:build'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  checks.push({
    name: 'Contract build',
    ok: contractBuild.status === 0,
    detail:
      contractBuild.status === 0
        ? 'sui move build succeeded'
        : `Failed: ${(contractBuild.stderr || contractBuild.stdout).slice(0, 240)}`,
  });

  checks.push(
    checkFileIncludes('docs/sdk_versions.md', ['@mysten/sui', '@mysten/dapp-kit-react', '@mysten/dapp-kit-core']),
  );

  checks.push(
    checkFileIncludes('AI_DISCLOSURE.md', [
      'Tool name',
      'Model version',
      'Key prompts',
      'Human review',
    ]),
  );

  checks.push(
    checkFileIncludes('README.md', [
      'Live URL:',
      'Demo Video URL:',
      'Hackathon Compliance Checklist',
    ]),
  );

  checks.push(checkFileIncludes('contracts/suishield_attestation/Move.toml', ['edition = "2024"']));

  for (const check of checks) {
    const status = check.ok ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${check.name}: ${check.detail}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
