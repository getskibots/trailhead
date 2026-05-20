// Builds function.zip with index.mjs, system-prompt.md, package.json, and node_modules.
// Cross-platform: uses the 'zip' shell if present, otherwise instructs manual zipping.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

if (!existsSync(resolve(root, 'node_modules'))) {
  console.error('Run `npm install` in lambda/ first.');
  process.exit(1);
}

try {
  // Remove old zip if present.
  if (existsSync(resolve(root, 'function.zip'))) {
    execSync(process.platform === 'win32' ? 'del function.zip' : 'rm function.zip', {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
  }

  if (process.platform === 'win32') {
    // PowerShell Compress-Archive
    const cmd = `powershell -NoProfile -Command "Compress-Archive -Path index.mjs,system-prompt.md,package.json,node_modules -DestinationPath function.zip -Force"`;
    execSync(cmd, { cwd: root, stdio: 'inherit' });
  } else {
    execSync('zip -r function.zip index.mjs system-prompt.md package.json node_modules', {
      cwd: root,
      stdio: 'inherit',
    });
  }

  console.log('\nfunction.zip built. Upload via AWS console or `aws lambda update-function-code`.');
} catch (e) {
  console.error('Zip failed:', e?.message ?? e);
  process.exit(1);
}
