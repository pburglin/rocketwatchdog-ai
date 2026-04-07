import subprocess
import time
from pathlib import Path
from PIL import ImageGrab

OUT = Path('/Users/bob1/.openclaw/workspace/projects/rocketwatchdog-ai/docs/screenshots')
OUT.mkdir(parents=True, exist_ok=True)

shots = [
    ('http://127.0.0.1:4174/', 'dashboard.png'),
    ('http://127.0.0.1:4174/traffic', 'traffic.png'),
    ('http://127.0.0.1:4174/performance', 'performance.png'),
    ('http://127.0.0.1:4174/integrations', 'integrations.png'),
    ('http://127.0.0.1:4174/settings', 'settings.png'),
]

subprocess.run(['open', '-a', 'Google Chrome'], check=False)
time.sleep(1)
for url, filename in shots:
    subprocess.run(['open', '-a', 'Google Chrome', url], check=False)
    time.sleep(3)
    img = ImageGrab.grab()
    img.save(OUT / filename)
    print('saved', filename)
