const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const outDir = path.join(process.cwd(), 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

function runAppleScript(lines) {
  execFileSync('osascript', lines.flatMap((line) => ['-e', line]), { stdio: 'inherit' });
}

function capture(url, file) {
  runAppleScript([
    'tell application "Google Chrome"',
    'activate',
    'if (count of windows) = 0 then make new window',
    `set URL of active tab of front window to "${url}"`,
    'delay 3',
    'end tell'
  ]);
  execFileSync('screencapture', ['-x', path.join(outDir, file)] , { stdio: 'inherit' });
}

capture('http://127.0.0.1:4174/', 'dashboard.png');
capture('http://127.0.0.1:4174/traffic', 'traffic.png');
capture('http://127.0.0.1:4174/performance', 'performance.png');
capture('http://127.0.0.1:4174/integrations', 'integrations.png');
capture('http://127.0.0.1:4174/settings', 'settings.png');
console.log('captured real screenshots');
