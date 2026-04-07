import webbrowser, time, os
from PIL import ImageGrab

browser = webbrowser.get('open -a /Applications/Google\\ Chrome.app %s')
pages = [
    ('http://127.0.0.1:4174/traffic','traffic.png'),
    ('http://127.0.0.1:4174/performance','performance.png'),
    ('http://127.0.0.1:4174/integrations','integrations.png'),
    ('http://127.0.0.1:4174/settings','settings.png'),
]
for url, name in pages:
    browser.open(url)
    time.sleep(3)
    ImageGrab.grab().save(os.path.join('docs/screenshots', name))
    print('saved', name, flush=True)
