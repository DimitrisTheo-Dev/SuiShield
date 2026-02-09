import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { z } from 'zod';
import { computeRulesetHash, type Finding, type ReceiptV1, withComputedHashes } from '@suishield/receipt';

const MAX_ZIP_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 500;
const MAX_FILTERED_BYTES = 10 * 1024 * 1024;
const MAX_FINDINGS = 400;

const RuleSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['high', 'medium', 'low']),
  title: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(['substring', 'regex']),
  pattern: z.string().min(1),
  flags: z.string().optional(),
  applies_to: z.enum(['move', 'manifest', 'any']),
  negate: z.boolean().optional(),
  remediation: z.string().min(1),
});

const RulesetSchema = z.object({
  version: z.string().min(1),
  rules: z.array(RuleSchema).min(1),
});

type Rule = z.infer<typeof RuleSchema>;

export type ScanInput = {
  repo_url: string;
  package_path: string;
  commit_sha?: string;
};

export type ScanOutput = {
  receipt: ReceiptV1;
  summary: {
    total_findings: number;
    high: number;
    medium: number;
    low: number;
    score: number;
    verdict: 'ALLOW' | 'REVIEW' | 'BLOCK';
  };
};

type Snapshot = {
  repo_url: string;
  commit_sha: string;
  commit_timestamp_ms: number;
  files: Map<string, string>;
};

type ScannableFile = {
  path: string;
  kind: 'move' | 'manifest';
  content: string;
};

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULESET_PATH = path.join(ROOT_DIR, 'ruleset.json');
const DEMO_FIXTURE_PATH = path.join(ROOT_DIR, 'fixtures', 'demo_move_package');

class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanError';
  }
}

function normalizePackagePath(packagePath: string): string {
  const trimmed = packagePath.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) throw new ScanError('package_path is required');
  if (trimmed.includes('..')) throw new ScanError('package_path cannot contain traversal segments');
  return trimmed;
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, ''))
    .join('\n');
}

function parseGitHubUrl(rawUrl: string): { owner: string; repo: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ScanError('repo_url must be a valid https GitHub URL');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    throw new ScanError('Only https://github.com URLs are supported');
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new ScanError('GitHub repo URL must include owner and repository name');
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');
  return { owner, repo };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SuiShield-Scanner/1.0',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ScanError(`GitHub API request failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

async function resolveCommit(owner: string, repo: string, explicitRef?: string): Promise<{
  commitSha: string;
  commitTimestampMs: number;
}> {
  let ref = explicitRef;

  if (!ref) {
    const meta = await fetchJson<{ default_branch: string }>(`https://api.github.com/repos/${owner}/${repo}`);
    ref = meta.default_branch;
  }

  const commit = await fetchJson<{
    sha: string;
    commit: {
      committer: {
        date: string;
      };
    };
  }>(`https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`);

  const commitTimestampMs = Date.parse(commit.commit.committer.date);
  if (!Number.isFinite(commitTimestampMs)) {
    throw new ScanError('Unable to parse commit timestamp from GitHub response');
  }

  return {
    commitSha: commit.sha,
    commitTimestampMs,
  };
}

async function fetchZipball(owner: string, repo: string, commitSha: string): Promise<Uint8Array> {
  const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${commitSha}`;
  const response = await fetch(zipUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SuiShield-Scanner/1.0',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ScanError(`Failed to fetch repository zipball (${response.status}): ${text.slice(0, 200)}`);
  }

  const headerSize = response.headers.get('content-length');
  if (headerSize && Number(headerSize) > MAX_ZIP_BYTES) {
    throw new ScanError(`Zipball exceeds ${MAX_ZIP_BYTES} byte limit`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > MAX_ZIP_BYTES) {
    throw new ScanError(`Zipball exceeds ${MAX_ZIP_BYTES} byte limit`);
  }

  return buffer;
}

async function extractZipFiles(zipBytes: Uint8Array): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(zipBytes);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  if (entries.length > MAX_FILES) {
    throw new ScanError(`Repository has ${entries.length} files which exceeds ${MAX_FILES} file limit`);
  }

  const files = new Map<string, string>();

  for (const entry of entries) {
    const strippedPath = entry.name.split('/').slice(1).join('/');
    if (!strippedPath) continue;

    const content = await entry.async('string');
    files.set(strippedPath, normalizeText(content));
  }

  return files;
}

async function fetchGitHubSnapshot(input: ScanInput): Promise<Snapshot> {
  const { owner, repo } = parseGitHubUrl(input.repo_url);
  const { commitSha, commitTimestampMs } = await resolveCommit(owner, repo, input.commit_sha);
  const zipBytes = await fetchZipball(owner, repo, commitSha);
  const files = await extractZipFiles(zipBytes);

  return {
    repo_url: `https://github.com/${owner}/${repo}`,
    commit_sha: commitSha,
    commit_timestamp_ms: commitTimestampMs,
    files,
  };
}

function selectPackageFiles(files: Map<string, string>, packagePath: string): ScannableFile[] {
  const normalizedPath = normalizePackagePath(packagePath);
  const prefix = `${normalizedPath}/`;

  const packageEntries = Array.from(files.entries())
    .filter(([filePath]) => filePath === `${normalizedPath}/Move.toml` || filePath.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b));

  if (packageEntries.length === 0) {
    throw new ScanError(`No files found under package_path '${normalizedPath}'`);
  }

  const hasManifest = packageEntries.some(([filePath]) => filePath === `${normalizedPath}/Move.toml`);
  if (!hasManifest) {
    throw new ScanError(`Move.toml not found at '${normalizedPath}/Move.toml'`);
  }

  let totalBytes = 0;
  for (const [, content] of packageEntries) {
    totalBytes += new TextEncoder().encode(content).byteLength;
  }

  if (totalBytes > MAX_FILTERED_BYTES) {
    throw new ScanError(`Filtered package size exceeds ${MAX_FILTERED_BYTES} byte limit`);
  }

  const moveFiles = packageEntries
    .filter(([filePath]) => filePath.startsWith(`${normalizedPath}/sources/`) && filePath.endsWith('.move'))
    .map(([filePath, content]) => ({ path: filePath, kind: 'move' as const, content }));

  const manifestFiles = packageEntries
    .filter(([filePath]) => filePath === `${normalizedPath}/Move.toml`)
    .map(([filePath, content]) => ({ path: filePath, kind: 'manifest' as const, content }));

  if (moveFiles.length === 0) {
    throw new ScanError(`No .move files found under '${normalizedPath}/sources'`);
  }

  return [...manifestFiles, ...moveFiles].sort((a, b) => a.path.localeCompare(b.path));
}

function isSafeRegex(pattern: string): boolean {
  if (pattern.length > 140) return false;
  if (/\\[1-9]/.test(pattern)) return false;
  if (/\(\?<([=!])/.test(pattern)) return false;
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) return false;
  return true;
}

function compileRuleRegex(rule: Rule): RegExp | null {
  if (rule.kind !== 'regex') return null;
  if (!isSafeRegex(rule.pattern)) {
    throw new ScanError(`Unsafe regex rejected for rule ${rule.id}`);
  }

  const safeFlags = (rule.flags ?? '').replace(/[^im]/g, '');
  return new RegExp(rule.pattern, safeFlags);
}

function matchesRule(line: string, rule: Rule, regex: RegExp | null): boolean {
  if (rule.kind === 'substring') {
    return line.includes(rule.pattern);
  }

  if (!regex) return false;
  regex.lastIndex = 0;
  return regex.test(line);
}

function lineMatches(content: string, rule: Rule, regex: RegExp | null): { line: number; snippet: string }[] {
  const lines = content.split('\n');
  const results: { line: number; snippet: string }[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (matchesRule(line, rule, regex)) {
      results.push({
        line: index + 1,
        snippet: line.slice(0, 200),
      });
    }
  }

  return results;
}

function findingComparator(a: Finding, b: Finding): number {
  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
  if (sevDiff !== 0) return sevDiff;

  const fileDiff = a.file.localeCompare(b.file);
  if (fileDiff !== 0) return fileDiff;

  if (a.line_start !== b.line_start) return a.line_start - b.line_start;
  if (a.line_end !== b.line_end) return a.line_end - b.line_end;

  return a.id.localeCompare(b.id);
}

function scoreFromFindings(findings: Finding[]): {
  score: number;
  verdict: 'ALLOW' | 'REVIEW' | 'BLOCK';
  severity_counts: { high: number; medium: number; low: number };
} {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  const weightedSum = counts.high * 10 + counts.medium * 5 + counts.low * 2;
  const score = Math.max(0, 100 - weightedSum);
  const verdict: 'ALLOW' | 'REVIEW' | 'BLOCK' =
    score >= 90 ? 'ALLOW' : score >= 70 ? 'REVIEW' : 'BLOCK';

  return {
    score,
    verdict,
    severity_counts: counts,
  };
}

async function loadRuleset(): Promise<{ raw: string; parsed: z.infer<typeof RulesetSchema> }> {
  const raw = await readFile(RULESET_PATH, 'utf8');
  const parsed = RulesetSchema.parse(JSON.parse(raw));
  return { raw, parsed };
}

function filterFilesForRule(files: ScannableFile[], rule: Rule): ScannableFile[] {
  if (rule.applies_to === 'any') return files;
  return files.filter((file) => file.kind === rule.applies_to);
}

function runRules(files: ScannableFile[], rules: Rule[]): Finding[] {
  const findings: Finding[] = [];

  for (const rule of [...rules].sort((a, b) => a.id.localeCompare(b.id))) {
    const regex = compileRuleRegex(rule);
    const applicableFiles = filterFilesForRule(files, rule);

    if (applicableFiles.length === 0) continue;

    if (rule.negate) {
      let found = false;
      for (const file of applicableFiles) {
        const matches = lineMatches(file.content, rule, regex);
        if (matches.length > 0) {
          found = true;
          break;
        }
      }

      if (!found) {
        const firstFile = applicableFiles[0];
        findings.push({
          id: rule.id,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          file: firstFile.path,
          line_start: 1,
          line_end: 1,
          evidence_snippet: `Pattern not found: ${rule.pattern}`,
          remediation: rule.remediation,
        });
      }

      continue;
    }

    for (const file of applicableFiles) {
      const matches = lineMatches(file.content, rule, regex);
      for (const match of matches) {
        findings.push({
          id: rule.id,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          file: file.path,
          line_start: match.line,
          line_end: match.line,
          evidence_snippet: match.snippet,
          remediation: rule.remediation,
        });

        if (findings.length >= MAX_FINDINGS) {
          return findings.sort(findingComparator);
        }
      }
    }
  }

  return findings.sort(findingComparator);
}

async function scanFromSnapshot(snapshot: Snapshot, packagePath: string): Promise<ScanOutput> {
  const selectedFiles = selectPackageFiles(snapshot.files, packagePath);
  const moveFileCount = selectedFiles.filter((file) => file.kind === 'move').length;

  const { raw, parsed } = await loadRuleset();
  const rulesetHash = await computeRulesetHash(raw);
  const findings = runRules(selectedFiles, parsed.rules);
  const scoring = scoreFromFindings(findings);

  const receipt = await withComputedHashes({
    version: '1',
    input: {
      repo_url: snapshot.repo_url,
      commit_sha: snapshot.commit_sha,
      package_path: normalizePackagePath(packagePath),
      file_count: moveFileCount,
    },
    generated_at_ms: snapshot.commit_timestamp_ms,
    ruleset: {
      ruleset_hash: rulesetHash,
      ruleset_version_string: parsed.version,
    },
    findings,
    scoring,
  });

  return {
    receipt,
    summary: {
      total_findings: findings.length,
      high: scoring.severity_counts.high,
      medium: scoring.severity_counts.medium,
      low: scoring.severity_counts.low,
      score: scoring.score,
      verdict: scoring.verdict,
    },
  };
}

export async function scanGitHubMovePackage(input: ScanInput): Promise<ScanOutput> {
  const snapshot = await fetchGitHubSnapshot(input);
  return scanFromSnapshot(snapshot, input.package_path);
}

async function loadLocalFixtureFiles(rootPath: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  const manifestPath = path.join(rootPath, 'Move.toml');
  files.set('demo_move_package/Move.toml', normalizeText(await readFile(manifestPath, 'utf8')));

  const sourceDir = path.join(rootPath, 'sources');
  const sourceFiles = await readFile(path.join(sourceDir, 'risk_demo.move'), 'utf8');
  files.set('demo_move_package/sources/risk_demo.move', normalizeText(sourceFiles));

  const helperFiles = await readFile(path.join(sourceDir, 'safe_helpers.move'), 'utf8');
  files.set('demo_move_package/sources/safe_helpers.move', normalizeText(helperFiles));

  return files;
}

export async function scanDemoFixture(): Promise<ScanOutput> {
  const files = await loadLocalFixtureFiles(DEMO_FIXTURE_PATH);
  const snapshot: Snapshot = {
    repo_url: 'demo://suishield/fixture',
    commit_sha: 'fixture-demo-commit',
    commit_timestamp_ms: 1767225600000,
    files,
  };

  return scanFromSnapshot(snapshot, 'demo_move_package');
}

export function summarizeFindings(findings: Finding[]): string {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return `high:${counts.high} medium:${counts.medium} low:${counts.low} total:${findings.length}`;
}

export { ScanError };
