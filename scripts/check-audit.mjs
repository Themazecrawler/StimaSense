import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const policy = JSON.parse(readFileSync(new URL('../security-audit-exceptions.json', import.meta.url), 'utf8'));
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('npm_execpath is unavailable; run this policy check through `npm run audit`.');
}

const result = spawnSync(process.execPath, [npmCli, 'audit', '--json'], {
  encoding: 'utf8',
  windowsHide: true,
});
if (result.error) throw result.error;
if (!result.stdout?.trim()) {
  throw new Error(`npm audit returned no JSON. ${result.stderr || ''}`.trim());
}

const audit = JSON.parse(result.stdout);
const now = new Date();
const failures = [];

for (const [packageName, vulnerability] of Object.entries(audit.vulnerabilities || {})) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;
  const exception = policy.exceptions.find(item => item.package === packageName);
  if (!exception) {
    failures.push(`${packageName}: unapproved ${vulnerability.severity} vulnerability`);
    continue;
  }
  if (!exception.owner || !exception.justification || new Date(`${exception.expires}T23:59:59Z`) < now) {
    failures.push(`${packageName}: exception is incomplete or expired (${exception.expires})`);
    continue;
  }

  const advisoryIds = vulnerability.via
    .filter(item => typeof item === 'object')
    .map(item => item.url?.split('/').pop())
    .filter(Boolean);
  const transitiveVia = vulnerability.via.filter(item => typeof item === 'string');
  const unexpectedAdvisories = advisoryIds.filter(id => !(exception.advisories || []).includes(id));
  const unexpectedTransitive = transitiveVia.filter(name => !(exception.transitiveVia || []).includes(name));
  if (unexpectedAdvisories.length || unexpectedTransitive.length) {
    failures.push(`${packageName}: new paths ${[...unexpectedAdvisories, ...unexpectedTransitive].join(', ')}`);
  }
}

if (failures.length) {
  console.error(`Dependency audit policy failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Dependency audit policy passed; all high/critical findings are absent or explicitly time-bounded.');
