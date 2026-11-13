#!/usr/bin/env node
// Home Assistant's own visibility-condition code (frontend, Apache-2.0), for
// the parity tests only. It is not committed: it is fetched on demand into
// test/ha-frontend (git-ignored), pinned by test/ha-frontend.lock.json to an
// exact commit with a SHA-256 hash for every file. Anything that doesn't
// match the pin, downloaded or cached, is refused.
//
//   node scripts/fetch-ha-conditions.mjs                 fetch and check the pinned files
//   node scripts/fetch-ha-conditions.mjs --update <tag>  pin a new release (commit + hashes)
//
// Files keep Home Assistant's paths, so their relative imports resolve. The
// few modules that would pull in the whole frontend are replaced by stand-ins
// built from Home Assistant's own functions, copied out word for word; only
// selector entity filtering is reduced to the domain check the location
// condition uses.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'test', 'ha-frontend');
const CACHE = join(OUT, '.upstream');
const LOCK = join(ROOT, 'test', 'ha-frontend.lock.json');
const REPO = 'home-assistant/frontend';

/** Copied as they are. */
const VERBATIM = [
  'src/panels/lovelace/common/validate-condition.ts',
  'src/common/condition/translate.ts',
  'src/common/condition/split.ts',
  'src/common/condition/evaluate-locally.ts',
  'src/common/datetime/check_time.ts',
  'src/common/datetime/weekday.ts',
  'src/common/array/ensure-array.ts',
  'src/common/entity/valid_entity_id.ts',
  'src/common/entity/compute_domain.ts',
  'src/common/entity/compute_state_domain.ts',
];

/** Read to build the stand-ins. */
const SOURCES = [
  'src/data/selector.ts',
  'src/data/device/device_registry.ts',
  'src/data/person.ts',
  'src/data/automation.ts',
  'src/data/entity/entity.ts',
  'src/data/translation.ts',
  'LICENSE.md',
];

/** Every upstream file the pin covers. */
const UPSTREAM = [...VERBATIM, ...SOURCES];

/** Thrown when files don't match the pin: never skip, always fail. */
export class PinMismatchError extends Error {}

/** Thrown when a needed file can't be downloaded (offline). */
export class OfflineError extends Error {}

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

const download = async (commit, path) => {
  let res;
  try {
    res = await fetch(`https://raw.githubusercontent.com/${REPO}/${commit}/${path}`);
  } catch (err) {
    throw new OfflineError(`cannot download ${path}: ${err.message}`);
  }
  if (!res.ok) throw new Error(`${path} at ${commit}: HTTP ${res.status}`);
  return res.text();
};

const readOrUndefined = (file) => readFile(file, 'utf8').catch(() => undefined);

const write = async (path, text) => {
  const file = join(OUT, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text);
};

/** One top-level declaration, from its line to the next top-level one. */
const extract = (source, name) => {
  const start = source.search(new RegExp(`^(export )?(const|function|enum|let) ${name}\\b`, 'm'));
  if (start < 0) throw new Error(`no ${name}`);
  const rest = source.slice(start + 1);
  const next = rest.search(/^(export |const |function |enum |let |interface |type |\/\*\*|\/\/)/m);
  return `${source.slice(start, next < 0 ? undefined : start + 1 + next).trimEnd()}\n`;
};

const exported = (text) => (text.startsWith('export ') ? text : `export ${text}`);

/** Writes the tree the tests import, from checked upstream files. */
const build = async (lock, files) => {
  await rm(join(OUT, 'src'), { recursive: true, force: true });
  for (const path of VERBATIM) await write(path, files[path]);
  const header = (from) =>
    `// Stand-in for Home Assistant's ${from} at ${lock.tag} (${lock.commit}):\n` +
    `// functions copied word for word by scripts/fetch-ha-conditions.mjs. Do not edit.\n`;
  await write(
    'src/data/device/device_registry.ts',
    header('data/device/device_registry.ts') +
      exported(extract(files['src/data/device/device_registry.ts'], 'devicesInEffectiveArea')),
  );
  await write(
    'src/data/selector.ts',
    header('data/selector.ts') +
      `import { ensureArray } from "../common/array/ensure-array";\n` +
      `import { computeStateDomain } from "../common/entity/compute_state_domain";\n` +
      `import { devicesInEffectiveArea } from "./device/device_registry";\n\n` +
      `// Reduced: the location condition only filters entities by domain (zone).\n` +
      `const filterSelectorEntities = (filter: { domain?: string | string[] }, entity: { entity_id: string }) =>\n` +
      `  !filter.domain || ensureArray(filter.domain).includes(computeStateDomain(entity as never));\n` +
      `const filterSelectorDevices = (): boolean => { throw new Error("not in the stand-in"); };\n` +
      `const getDeviceIntegrationLookup = (): never => { throw new Error("not in the stand-in"); };\n\n` +
      [
        'expandLabelTarget',
        'expandFloorTarget',
        'expandAreaTarget',
        'expandDeviceTarget',
        'areaMeetsTargetSelector',
        'deviceMeetsTargetSelector',
        'entityMeetsTargetSelector',
        'resolveEntityIDs',
        'resolveIncludedEntityIDs',
      ]
        .map((n) => extract(files['src/data/selector.ts'], n))
        .join('\n'),
  );
  await write(
    'src/data/person.ts',
    header('data/person.ts') +
      `import { computeStateDomain } from "../common/entity/compute_state_domain";\n\n` +
      extract(files['src/data/person.ts'], 'cachedUserPerson') +
      '\n' +
      extract(files['src/data/person.ts'], 'getUserPerson'),
  );
  await write(
    'src/data/automation.ts',
    header('data/automation.ts') +
      extract(files['src/data/automation.ts'], 'CONDITION_ROW_CONFIG_KEYS') +
      '\n' +
      extract(files['src/data/automation.ts'], 'pickRowConfig'),
  );
  await write(
    'src/data/entity/entity.ts',
    header('data/entity/entity.ts') + extract(files['src/data/entity/entity.ts'], 'UNKNOWN'),
  );
  await write(
    'src/data/translation.ts',
    header('data/translation.ts') + extract(files['src/data/translation.ts'], 'TimeZone'),
  );
  await write('LICENSE', files['LICENSE.md']);
  await write(
    'README.md',
    `# Home Assistant frontend, condition code (${lock.tag}, ${lock.commit})\n\n` +
      'Fetched on demand by `scripts/fetch-ha-conditions.mjs` for the parity tests\n' +
      '(`src/lib/visibility.parity.test.ts`); git-ignored, never shipped. Pinned and\n' +
      'checked by `test/ha-frontend.lock.json`. Apache-2.0 (see LICENSE). Files under\n' +
      '`src/data/` are stand-ins made of functions copied from the files they\n' +
      'replace; selector entity filtering is reduced to a domain check.\n',
  );
};

/**
 * Makes test/ha-frontend match the pin: each upstream file from the cache
 * if its hash matches, else downloaded at the pinned commit and checked.
 * Throws PinMismatchError on any mismatch, OfflineError if a missing file
 * can't be downloaded. Returns the pin.
 */
export const ensureHaFrontend = async () => {
  const lock = JSON.parse(await readFile(LOCK, 'utf8'));
  const files = {};
  for (const path of UPSTREAM) {
    const want = lock.files[path];
    if (!want) throw new PinMismatchError(`${path} is not pinned in ${LOCK}`);
    const cached = await readOrUndefined(join(CACHE, path));
    if (cached !== undefined && sha256(cached) === want) {
      files[path] = cached;
      continue;
    }
    const text = await download(lock.commit, path);
    if (sha256(text) !== want) {
      throw new PinMismatchError(
        `${path} at ${lock.commit} does not match its pinned SHA-256 (${want}); refusing it`,
      );
    }
    await mkdir(dirname(join(CACHE, path)), { recursive: true });
    await writeFile(join(CACHE, path), text);
    files[path] = text;
  }
  // Rebuilt from the checked files every time: cheap, and never stale.
  await build(lock, files);
  return lock;
};

/** Pins a release: resolves the tag to its commit and records every file's hash. */
const update = async (tag) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(tag)}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`cannot resolve ${tag}: HTTP ${res.status}`);
  const { sha: commit } = await res.json();
  const files = {};
  for (const path of UPSTREAM) {
    files[path] = sha256(await download(commit, path));
  }
  const lock = { repo: REPO, tag, commit, files };
  await writeFile(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  await rm(OUT, { recursive: true, force: true });
  console.log(`pinned ${REPO} ${tag} at ${commit} (${UPSTREAM.length} files)`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf('--update');
  try {
    if (i >= 0) {
      const tag = process.argv[i + 1];
      if (!tag) throw new Error('--update needs a release tag, like 20261028.5');
      await update(tag);
    }
    const lock = await ensureHaFrontend();
    console.log(`test/ha-frontend matches ${lock.tag} (${lock.commit})`);
  } catch (err) {
    console.error(`ha-frontend: ${err.message}`);
    process.exit(err instanceof OfflineError ? 2 : 1);
  }
}
