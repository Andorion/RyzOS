// Bump the build number in version.json
// Usage: node scripts/bump-version.js [major|minor|patch]
// No argument = bump build number only
// With argument = bump that semver part and reset build to 1

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const versionFile = resolve(__dirname, '..', 'version.json');
const packageFile = resolve(__dirname, '..', 'package.json');

const ver = JSON.parse(readFileSync(versionFile, 'utf8'));
const pkg = JSON.parse(readFileSync(packageFile, 'utf8'));

const bump = process.argv[2]; // major, minor, patch, or undefined

if (bump) {
  const [major, minor, patch] = ver.version.split('.').map(Number);
  if (bump === 'major') ver.version = `${major + 1}.0.0`;
  else if (bump === 'minor') ver.version = `${major}.${minor + 1}.0`;
  else if (bump === 'patch') ver.version = `${major}.${minor}.${patch + 1}`;
  else { console.error('Usage: bump [major|minor|patch]'); process.exit(1); }
  ver.build = 1;
} else {
  ver.build += 1;
}

writeFileSync(versionFile, JSON.stringify(ver, null, 2) + '\n');
pkg.version = ver.version;
writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Bumped to v${ver.version} build ${ver.build}`);
