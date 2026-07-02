import re

content = open("server/src/scripts/align_lyrics.py", "r").read()

new_align_logic = """
    # Align using SequenceMatcher
    us_clean = [clean_word(w['text']) for w in us_words]
    wh_clean = [w['clean'] for w in whisper_words]
    
    sm = difflib.SequenceMatcher(None, us_clean, wh_clean)
    
    # We will process opcodes and assign a 'new_start' and 'new_end' to every us_word.
    # To handle 'delete' (whisper missed the word), we need to know the surrounding matched times.
    
    # First, collect all matched blocks
    mapped_blocks = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ('equal', 'replace'):
            if j2 > j1 and i2 > i1:
                start_time = whisper_words[j1]['start']
                end_time = whisper_words[j2-1]['end']
                if end_time <= start_time:
                    end_time = start_time + 0.1
                mapped_blocks.append({'i1': i1, 'i2': i2, 'start': start_time, 'end': end_time})

    # Now apply times to us_words
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

    # Handle unmapped words
    for i, w in enumerate(us_words):
        if w.get('mapped'):
            continue
            
        # Find prev mapped and next mapped
        prev_end = None
        for j in range(i-1, -1, -1):
            if us_words[j].get('mapped'):
                prev_end = us_words[j]['new_end']
                break
                
        next_start = None
        for j in range(i+1, len(us_words)):
            if us_words[j].get('mapped'):
                next_start = us_words[j]['new_start']
                break
                
        # Estimate duration: 0.3s per word
        est_duration = 0.3
        
        if prev_end is not None and next_start is not None:
            # Middle gap. Attach to prev_end.
            w['new_start'] = prev_end
            w['new_end'] = prev_end + est_duration
            if w['new_end'] > next_start:
                w['new_end'] = next_start # clamp
        elif next_start is not None:
            # Beginning of song. Attach to next_start and work backwards.
            # Wait, if we are looping forward, we can just do:
            # Count how many unmapped words are before next_start
            unmapped_before = 0
            for j in range(i, len(us_words)):
                if us_words[j].get('mapped'):
                    break
                unmapped_before += 1
            w['new_start'] = next_start - (unmapped_before * est_duration)
            if w['new_start'] < 0: w['new_start'] = 0.0
            w['new_end'] = w['new_start'] + est_duration
            # update next_start for the next unmapped word
            next_start = w['new_end'] # wait this is wrong, but we process left to right so it's ok if we recalculate or just use this
        elif prev_end is not None:
            # End of song
            w['new_start'] = prev_end
            w['new_end'] = prev_end + est_duration
        else:
            # No mapped words at all!
            w['new_start'] = i * est_duration
            w['new_end'] = (i+1) * est_duration
            
        w['mapped'] = True

    # Make sure we don't have overlapping times caused by backward attachment
    # Sort them by new_start? No, keep original order, just fix times.
    current_time = 0.0
    for w in us_words:
        if w['new_start'] < current_time:
            w['new_start'] = current_time
            if w['new_end'] < current_time + 0.1:
                w['new_end'] = current_time + 0.1
        current_time = w['new_end']

    mapped_us_words = us_words
"""

# Extract the part between "# Align" and "    # Calculate new beats"
start_str = "    # Align"
end_str = "    # Calculate new beats"
start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_align_logic + content[end_idx:]
    open("server/src/scripts/align_lyrics.py", "w").write(new_content)
    print("Updated align_lyrics.py logic again")
else:
    print("Could not find blocks")
