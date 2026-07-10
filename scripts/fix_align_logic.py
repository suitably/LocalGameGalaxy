import re

content = open("server/src/scripts/align_lyrics.py", "r").read()

# 1. Remove initial_prompt
content = re.sub(r'# Create initial prompt from first 30 words.*?\n.*?initial_prompt = " "\.join\(prompt_words\)\n', '', content, flags=re.DOTALL)
content = content.replace(', initial_prompt=initial_prompt', '')
content = content.replace('with initial_prompt', 'without initial_prompt')

# 2. Rewrite the alignment logic
new_align_logic = """
    # Align using only exact matches to avoid hallucination mapping
    us_clean = [clean_word(w['text']) for w in us_words]
    wh_clean = [w['clean'] for w in whisper_words]
    
    sm = difflib.SequenceMatcher(None, us_clean, wh_clean)
    
    # First pass: map exactly matched words
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for idx in range(i2 - i1):
                u_idx = i1 + idx
                w_idx = j1 + idx
                us_words[u_idx]['new_start'] = whisper_words[w_idx]['start']
                us_words[u_idx]['new_end'] = whisper_words[w_idx]['end']
                us_words[u_idx]['mapped'] = True

    # Second pass: interpolate unmapped words
    last_end = 0.0
    for i in range(len(us_words)):
        if us_words[i].get('mapped'):
            last_end = us_words[i]['new_end']
            continue
            
        # Find next mapped word to interpolate
        next_start = None
        unmapped_count = 0
        for j in range(i, len(us_words)):
            if us_words[j].get('mapped'):
                next_start = us_words[j]['new_start']
                break
            unmapped_count += 1
            
        if next_start is None:
            # If no next mapped word, just guess 0.3s per word
            next_start = last_end + (unmapped_count * 0.3)
            
        # Distribute time between last_end and next_start
        total_beats = sum(sum(s['duration'] for s in w['syllables']) for w in us_words[i:i+unmapped_count])
        if total_beats == 0: total_beats = 1
        
        current_time = last_end
        gap_duration = next_start - last_end
        
        for j in range(i, i+unmapped_count):
            w_beats = sum(s['duration'] for s in us_words[j]['syllables'])
            w_duration = (w_beats / total_beats) * gap_duration
            us_words[j]['new_start'] = current_time
            us_words[j]['new_end'] = current_time + w_duration
            current_time += w_duration
            us_words[j]['mapped'] = True

    mapped_us_words = us_words
"""

# Find the old align block
start_idx = content.find("    # Align")
end_idx = content.find("    if not mapped_us_words:")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_align_logic + content[end_idx:]
    open("server/src/scripts/align_lyrics.py", "w").write(content)
    print("Updated align_lyrics.py logic")
else:
    print("Failed to find align block")
