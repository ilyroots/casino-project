import re

with open(r'G:\DEVELOPMENT\stake remake\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

views_to_remove = [
    'TRENDING VIEW',
    'NEW RELEASES VIEW',
    'FEATURE BUY-IN VIEW',
    'LIVE CASINO VIEW',
    'TABLE GAMES VIEW',
    'GAME SHOWS VIEW',
    'BLACKJACK VIEW',
    'ROULETTE VIEW',
    'BACCARAT VIEW',
    'VIDEO POKER VIEW',
    'SCRATCH CARDS VIEW',
    'SHOWDOWNS VIEW',
]

for view_name in views_to_remove:
    pattern = r'\s+<!-- ' + re.escape(view_name) + r' -->\s+<div class="view" data-view="[^"]+">.*?</div>'
    content = re.sub(pattern, '', content, flags=re.DOTALL)

# Modify slots view to show coming soon
slots_pattern = r'(<!-- SLOTS VIEW -->\s+<div class="view" data-view="slots">.*?<div class="content-scroll-inner">).*?(</div>\s+</div>)'

def slots_repl(m):
    return m.group(1) + '''
                        <div class="coming-soon-banner" style="padding:80px 20px;text-align:center;border:1px dashed var(--border);border-radius:12px;background:var(--surface);margin-top:12px;">
                            <div style="font-size:64px;margin-bottom:20px;">🎰</div>
                            <h3 style="font-size:28px;font-weight:600;margin-bottom:12px;color:var(--text-primary);">Coming Soon</h3>
                            <p style="color:var(--text-tertiary);max-width:500px;margin:0 auto;font-size:16px;">Our slots collection is launching soon. Stay tuned for the hottest games from Pragmatic Play, Hacksaw, Nolimit City, and more.</p>
                        </div>''' + m.group(2)

content = re.sub(slots_pattern, slots_repl, content, flags=re.DOTALL)

with open(r'G:\DEVELOPMENT\stake remake\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Removed', len(views_to_remove), 'game views and updated slots view.')
