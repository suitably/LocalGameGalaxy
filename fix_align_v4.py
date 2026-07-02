import re

content = open("server/src/scripts/align_lyrics.py", "r").read()

new_align_logic = """
    # Calculate original times for all us_words to use as a fallback pacing
    orig_bpm = float(headers.get('BPM', '120').replace(',', '.'))
    orig_gap = float(headers.get('GAP', '0').replace(',', '.'))
    
    def beat_to_time(b):
        return (orig_gap / 1000.0) + (b * 60.0 / orig_bpm)
        
    for w in us_words:
        w['orig_start'] = beat_to_time(w['syllables'][0]['start'])
        total_beats = sum(s['duration'] for s in w['syllables'])
        w['orig_end'] = beat_to_time(w['syllables'][0]['start'] + total_beats)

    # Align using SequenceMatcher
    us_clean = [clean_word(w['text']) for w in us_words]
    wh_clean = [w['clean'] for w in whisper_words]
    
    sm = difflib.SequenceMatcher(None, us_clean, wh_clean)
    
    # First, collect all matched blocks (ONLY equal, to avoid hallucination mapping)
    mapped_blocks = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            if j2 > j1 and i2 > i1:
                start_time = whisper_words[j1]['start']
                end_time = whisper_words[j2-1]['end']
                if end_time <= start_time:
                    end_time = start_time + 0.1
                mapped_blocks.append({'i1': i1, 'i2': i2, 'start': start_time, 'end': end_time})

    # Now apply times to mapped us_words
    for block in mapped_blocks:
        i1, i2 = block['i1'], block['i2']
        start_time, end_time = block['start'], block['end']
        
        us_sub = us_words[i1:i2]
        total_beats = sum(sum(s['duration'] for s in w['syllables']) for w in us_sub)
        if total_beats == 0: total_beats = 1
        
        current_time = start_time
        total_duration = end_time - start_time
        
        for w in us_sub:
            w['new_start'] = current_time
            w_beats = sum(s['duration'] for s in w['syllables'])
            w_duration = (w_beats / total_beats) * total_duration
            w['new_end'] = current_time + w_duration
            current_time += w_duration
            w['mapped'] = True
            w['offset'] = w['new_start'] - w['orig_start']

    # Interpolate offsets for unmapped words
    for i, w in enumerate(us_words):
        if w.get('mapped'):
            continue
            
        # Find prev and next mapped words to interpolate offset
        prev_offset = None
        prev_orig_time = None
        for j in range(i-1, -1, -1):
            if us_words[j].get('mapped'):
                prev_offset = us_words[j]['offset']
                prev_orig_time = us_words[j]['orig_start']
                break
                
        next_offset = None
        next_orig_time = None
        for j in range(i+1, len(us_words)):
            if us_words[j].get('mapped'):
                next_offset = us_words[j]['offset']
                next_orig_time = us_words[j]['orig_start']
                break
                
        if prev_offset is not None and next_offset is not None:
            # Interpolate offset
            if next_orig_time > prev_orig_time:
                ratio = (w['orig_start'] - prev_orig_time) / (next_orig_time - prev_orig_time)
                ratio = max(0.0, min(1.0, ratio))
                w_offset = prev_offset + ratio * (next_offset - prev_offset)
            else:
                w_offset = prev_offset
        elif prev_offset is not None:
            w_offset = prev_offset
        elif next_offset is not None:
            w_offset = next_offset
        else:
            w_offset = 0.0 # No mapped words at all!
            
        w['new_start'] = max(0.0, w['orig_start'] + w_offset)
        w['new_end'] = max(0.0, w['orig_end'] + w_offset)
        w['mapped'] = True

    # Ensure strictly increasing non-overlapping times
    current_time = 0.0
    for w in us_words:
        if w['new_start'] < current_time:
            w['new_start'] = current_time
            if w['new_end'] < current_time + 0.1:
                w['new_end'] = current_time + 0.1
        current_time = w['new_end']

    mapped_us_words = us_words
"""

# Extract the part between "    us_clean =" and "    # Calculate new beats"
start_str = "    us_clean ="
end_str = "    # Calculate new beats"
start_idx = content.find("    # Align")
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_align_logic + content[end_idx:]
    open("server/src/scripts/align_lyrics.py", "w").write(new_content)
    print("Updated align_lyrics.py logic with offset interpolation")
else:
    print("Could not find blocks")
