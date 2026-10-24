#!/usr/bin/env node
/**
 * Read-only external skill provenance inspector.
 * No installing, vendoring, auto-updating, writing, or agent spawning.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_LOCK_PATH = path.join(ROOT, '.agent-workflow/external-skills.lock.json');
const SHA = /^[0-9a-f]{40}$/;
const MODES = new Set(['required', 'conditional', 'dependency', 'optional', 'opt_in']);

export function validateLock(lock) {
  if (!lock || lock.schemaVersion !== 1 || !lock.sources || typeof lock.sources !== 'object' || !Array.isArray(lock.skills)) {
    throw Error('Invalid external skills lock schema');
  }
  const ids = new Set();
  for (const [id, source] of Object.entries(lock.sources)) {
    if (!/^[a-z0-9-]+$/.test(id) || !/^[\w.-]+\/[\w.-]+$/.test(source.repository) || !SHA.test(source.upstreamCommit) || source.ref !== 'main') {
      throw Error(`Invalid pinned source: ${id}`);
    }
  }
  for (const skill of lock.skills) {
    if (!/^[a-z0-9-]+$/.test(skill.id) || ids.has(skill.id)) throw Error(`Duplicate or invalid external skill ID: ${skill.id}`);
    ids.add(skill.id);
    if (!lock.sources[skill.source] || !MODES.has(skill.activation) || !SHA.test(skill.upstreamBlobSha) ||
        !skill.upstreamPath.startsWith('skills/') || !skill.upstreamPath.endsWith('/SKILL.md') ||
        skill.upstreamPath.split('/').includes('..') || !Array.isArray(skill.dependsOn)) {
      throw Error(`Invalid external skill entry: ${skill.id}`);
    }
  }
  for (const skill of lock.skills) {
    const paths = new Set([skill.upstreamPath]);
    if (!Array.isArray(skill.referenceFiles ?? [])) throw Error(`Invalid external reference list: ${skill.id}`);
    for (const reference of skill.referenceFiles ?? []) {
      const root = skill.upstreamPath.slice(0, skill.upstreamPath.lastIndexOf('/') + 1);
      if (typeof reference?.upstreamPath !== 'string' || !reference.upstreamPath.startsWith(root) ||
          !/^[\w./-]+\.md$/.test(reference.upstreamPath) || reference.upstreamPath.split('/').includes('..') ||
          paths.has(reference.upstreamPath) || !SHA.test(reference.upstreamBlobSha)) {
        throw Error(`Invalid external reference: ${skill.id}`);
      }
      paths.add(reference.upstreamPath);
    }
    for (const dependency of skill.dependsOn) {
      if (!ids.has(dependency) || dependency === skill.id) throw Error(`Missing/cyclic self dependency for ${skill.id}: ${dependency}`);
      if (lock.skills.find(x => x.id === dependency).source !== skill.source) throw Error(`Cross-source dependency needs explicit authorization: ${dependency}`);
    }
  }
  return lock;
}

export function loadLock(file = DEFAULT_LOCK_PATH) {
  return validateLock(JSON.parse(readFileSync(file, 'utf8')));
}

export function gitBlobSha(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

export function verifyLocalReference(lock, id, referencePath, localPath) {
  const skill = lock.skills.find(x => x.id === id);
  if (!skill) throw Error(`Unknown external skill: ${id}`);
  const reference = (skill.referenceFiles ?? []).find(x => x.upstreamPath === referencePath);
  if (!reference) throw Error(`Unknown external reference: ${id} / ${referencePath}`);
  const actual = gitBlobSha(readFileSync(localPath));
  return { id, referencePath, matchesPinnedBlob: actual === reference.upstreamBlobSha,
    expected: reference.upstreamBlobSha, actual, source: lock.sources[skill.source].repository };
}

export function verifyLocalSkill(lock, id, localPath) {
  const skill = lock.skills.find(x => x.id === id);
  if (!skill) throw Error(`Unknown external skill: ${id}`);
  const actual = gitBlobSha(readFileSync(localPath));
  return { id, matchesPinnedBlob: actual === skill.upstreamBlobSha, expected: skill.upstreamBlobSha, actual,
    source: lock.sources[skill.source].repository, upstreamPath: skill.upstreamPath };
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'orasqill-external-skills' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Error(`GitHub HTTP ${response.status} for ${url}`);
  return response.json();
}

/** Updates are advisory; pinned paths, blobs, and activation rules NEVER auto-change. */
export async function checkUpstream(lock, { sourceFilter = null, fetchImpl = fetch } = {}) {
  validateLock(lock);
  if (sourceFilter && !lock.sources[sourceFilter]) throw Error(`Unknown source: ${sourceFilter}`);
  const reports = [];
  for (const [id, source] of Object.entries(lock.sources)) {
    if (sourceFilter && id !== sourceFilter) continue;
    const base = `https://api.github.com/repos/${source.repository}`;
    try {
      const [commit, tree] = await Promise.all([
        fetchJson(`${base}/commits/${source.ref}`, fetchImpl),
        fetchJson(`${base}/git/trees/${source.ref}?recursive=1`, fetchImpl),
      ]);
      if (tree.truncated || !Array.isArray(tree.tree) || !SHA.test(commit.sha)) throw Error('Incomplete upstream tree/commit response');
      const hashes = new Map(tree.tree.filter(e => e.type === 'blob').map(e => [e.path, e.sha]));
      const skills = lock.skills.filter(s => s.source === id).map(skill => {
        const primaryStatus = !hashes.has(skill.upstreamPath) ? 'missing_upstream' :
          hashes.get(skill.upstreamPath) === skill.upstreamBlobSha ? 'unchanged' : 'changed';
        const references = (skill.referenceFiles ?? []).map(reference => ({
          path: reference.upstreamPath,
          status: !hashes.has(reference.upstreamPath) ? 'missing_upstream' :
            hashes.get(reference.upstreamPath) === reference.upstreamBlobSha ? 'unchanged' : 'changed',
          pinnedBlob: reference.upstreamBlobSha,
          upstreamBlob: hashes.get(reference.upstreamPath) ?? null,
        }));
        const status = primaryStatus !== 'unchanged' ? primaryStatus :
          references.some(r => r.status === 'missing_upstream') ? 'missing_upstream' :
          references.some(r => r.status === 'changed') ? 'changed' : 'unchanged';
        return { id: skill.id, status, primaryStatus,
          pinnedBlob: skill.upstreamBlobSha, upstreamBlob: hashes.get(skill.upstreamPath) ?? null,
          references };
      });
      reports.push({ source: id, repository: source.repository, pinnedCommit: source.upstreamCommit,
        upstreamCommit: commit.sha, repositoryChanged: commit.sha !== source.upstreamCommit, skills });
    } catch (err) {
      reports.push({ source: id, repository: source.repository, status: 'unknown', reason: String(err.message ?? err) });
    }
  }
  return reports;
}

export async function main(argv = process.argv.slice(2), { fetchImpl = fetch, output = console.log } = {}) {
  const [command, ...args] = argv;
  const lock = loadLock();
  if (command === 'list' && !args.length) {
    for (const skill of lock.skills) output(`${skill.id}\t${skill.activation}\t${lock.sources[skill.source].repository}\t${skill.upstreamPath}`);
    return 0;
  }
  if (command === 'verify-file' && args.length === 2) {
    const report = verifyLocalSkill(lock, args[0], args[1]);
    output(JSON.stringify(report, null, 2));
    return report.matchesPinnedBlob ? 0 : 2;
  }
  if (command === 'verify-reference' && args.length === 3) {
    const report = verifyLocalReference(lock, args[0], args[1], args[2]);
    output(JSON.stringify(report, null, 2));
    return report.matchesPinnedBlob ? 0 : 2;
  }
  if (command === 'check-updates' && (args.length === 0 || args.length === 2 && args[0] === '--source')) {
    const reports = await checkUpstream(lock, { sourceFilter: args[1] || null, fetchImpl });
    output(JSON.stringify(reports, null, 2));
    return reports.some(r => r.status === 'unknown') ? 2 : 0;
  }
  throw Error('Usage: external-skills.mjs list | verify-file <skill-id> <installed-SKILL.md> | verify-reference <skill-id> <upstream-path> <installed-reference.md> | check-updates [--source karpathy|matt|ponytail]');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(`EXTERNAL_SKILL_ERROR: ${error.message}`); process.exitCode = 1; });
}
