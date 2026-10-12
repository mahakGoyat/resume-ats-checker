/**
 * Runner for scripts/check-pdf-export.mjs.
 *
 * The check imports the app's TypeScript modules directly so it exercises the
 * real export code path rather than a mock. Node's type stripping cannot follow
 * the extensionless relative imports the app uses, so this bundles the check
 * with esbuild first and then runs the bundle from inside the package so that
 * node_modules resolution still works. Bare imports stay external.
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const artifactRoot = resolve(here, '..');

const outDir = mkdtempSync(join(artifactRoot, 'node_modules', '.resume-pdf-check-'));
const outFile = join(outDir, 'check.mjs');

try {
  await build({
    entryPoints: [join(here, 'check-pdf-export.mjs')],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    packages: 'external',
    logLevel: 'warning',
    loader: { '.ts': 'ts' },
  });
  process.argv[1] = outFile;
  process.env.RESUME_ARTIFACT_ROOT = artifactRoot;
  await import(pathToFileURL(outFile).href);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
