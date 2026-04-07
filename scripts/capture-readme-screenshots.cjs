const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const outDir = path.join(process.cwd(), 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

function capture(url, file) {
  const script = [
    'tell application "Google Chrome"',
    'if not running then launch',
    'activate',
    'if (count of windows) = 0 then make new window',
    'set URL of active tab of front window to "' + url + '"',
    'delay 2',
    'end tell',
    'do shell script "screencapture -x ' + path.join(outDir, file) + '"'
  ].join('\n');
  execFileSync('osascript', ['-e', script], { stdio: 'inherit' });
}

capture('http://127.0.0.1:4174/', 'dashboard.png');
capture('http://127.0.0.1:4174/traffic', 'traffic.png');
capture('http://127.0.0.1:4174/performance', 'performance.png');
capture('http://127.0.0.1:4174/integrations', 'integrations.png');
capture('http://127.0.0.1:4174/settings', 'settings.png');
console.log('screenshots captured');
