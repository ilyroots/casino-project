with open(r'G:\DEVELOPMENT\stake remake\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '<h1 class="view-hero-title">Live Casino</h1>' in line:
        start_idx = i
    if start_idx and '<!-- PROMOTIONS VIEW -->' in line:
        end_idx = i
        break

if start_idx and end_idx:
    del lines[start_idx:end_idx]
    with open(r'G:\DEVELOPMENT\stake remake\index.html', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'Removed orphaned content from line {start_idx+1} to {end_idx+1}')
else:
    print(f'Start: {start_idx}, End: {end_idx}')
