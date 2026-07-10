import os
import re

src_dir = '/home/deck/Projects/LocalGameGalaxy/src'
pattern = re.compile(r'\s*backdropFilter:\s*\'blur\(\d+px\)\',?')

count = 0
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = pattern.sub('', content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
                print(f'Removed backdropFilter from {path}')

print(f'Done. Modified {count} files.')
