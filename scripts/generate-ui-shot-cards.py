from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path('/Users/bob1/.openclaw/workspace/projects/rocketwatchdog-ai/docs/screenshots')
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1440, 920

screens = [
    ('dashboard.png', 'RocketWatchDog.ai Dashboard', ['Live control plane status', 'Readiness, workloads, traffic blocks', 'Latency trend and skill scan controls']),
    ('traffic.png', 'Traffic & Debug Logs', ['Request stream with filters', 'Search by request ID, backend, source IP', 'Debug log matches and payload capture']),
    ('performance.png', 'Performance Troubleshooting', ['Slowest recent requests', 'Backend latency summary', 'Admin latency diagnostics']),
    ('integrations.png', 'Integrations', ['Configured LLM and MCP backends', 'Integration mode visibility', 'Backend health and model inventory']),
    ('settings.png', 'Settings & Admin Controls', ['Debug mode toggle', 'Integration pattern reference', 'Runtime and security settings']),
]

try:
    title_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 48)
    body_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 28)
    small_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
except Exception:
    title_font = body_font = small_font = ImageFont.load_default()

for name, title, bullets in screens:
    img = Image.new('RGB', (W, H), '#0b1220')
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((40, 40, W-40, H-40), radius=28, fill='#111827', outline='#334155', width=2)
    d.rounded_rectangle((80, 90, 320, 850), radius=24, fill='#0f172a', outline='#1e293b', width=2)
    d.text((110, 130), 'RocketWatchDog', fill='#f8fafc', font=title_font)
    d.text((110, 210), 'Admin UI Preview', fill='#93c5fd', font=body_font)
    d.rounded_rectangle((360, 90, W-90, 210), radius=24, fill='#111827', outline='#1e293b', width=2)
    d.text((400, 130), title, fill='#f8fafc', font=title_font)
    y = 280
    for idx, bullet in enumerate(bullets, 1):
        d.rounded_rectangle((380, y-20, W-120, y+90), radius=20, fill='#0f172a', outline='#1e293b', width=2)
        d.text((420, y), f'{idx}. {bullet}', fill='#e2e8f0', font=body_font)
        y += 150
    d.text((400, 780), 'README screenshot placeholder generated from current implemented screen set.', fill='#94a3b8', font=small_font)
    d.text((400, 815), 'Use the live app locally for exact rendered visuals.', fill='#94a3b8', font=small_font)
    img.save(OUT / name)

print('generated')
