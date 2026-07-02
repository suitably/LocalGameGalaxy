import sys
import os
import re
import json
import difflib

try:
    import whisper_timestamped as whisper
except ImportError:
    print("whisper-timestamped is not installed.")
    sys.exit(1)

def parse_ultrastar(txt_path):
    headers = {}
    notes = []
    with open(txt_path, 'r', encoding='utf-8-sig') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith('#'):
                parts = line.split(':', 1)
                if len(parts) == 2:
                    headers[parts[0][1:]] = parts[1].strip()
            elif line.startswith((':', '*', 'F')):
                parts = line.split(' ', 4)
                if len(parts) >= 4:
                    note = {
                        'type': parts[0],
                        'start': int(parts[1]),
                        'duration': int(parts[2]),
                        'pitch': int(parts[3]),
                        'text': parts[4] if len(parts) > 4 else '',
                        'original_line': line
                    }
                    notes.append(note)
            elif line.startswith('-'):
                parts = line.split(' ')
                notes.append({
                    'type': '-',
                    'start': int(parts[1]) if len(parts) > 1 else None,
                    'original_line': line
                })
            elif line == 'E':
                notes.append({'type': 'E', 'original_line': line})
    return headers, notes

def group_syllables_into_words(notes):
    words = []
    current_word = {'syllables': [], 'text': ''}
    
    for note in notes:
        if note['type'] not in (':', '*', 'F'):
            continue
            
        t = note['text']
        
        # If it starts with space, it's definitely a new word
        if t.startswith(' ') or t.startswith('~'):
            if current_word['syllables']:
                words.append(current_word)
            current_word = {'syllables': [note], 'text': t.strip(' ~')}
        else:
            current_word['syllables'].append(note)
            current_word['text'] += t.replace('~', '').strip()
            
        # If it ends with space, the next one will be a new word
        if t.endswith(' '):
            words.append(current_word)
            current_word = {'syllables': [], 'text': ''}
            
    if current_word['syllables']:
        words.append(current_word)
        
    return words

def clean_word(w):
    return re.sub(r'[^a-zA-Z0-9]', '', w).lower()

def main():
    if len(sys.argv) < 3:
        print("Usage: python align_lyrics.py <txt_path> <audio_path>")
        sys.exit(1)
        
    txt_path = sys.argv[1]
    audio_path = sys.argv[2]
    
    print(f"[Aligner] Parsing {txt_path}...")
    headers, notes = parse_ultrastar(txt_path)
    
    us_words = group_syllables_into_words(notes)
    if not us_words:
        print("[Aligner] No syllables found in TXT.")
        sys.exit(1)
        
    print(f"[Aligner] Found {len(us_words)} words in UltraStar TXT.")
    
    print(f"[Aligner] Loading Whisper model (base)...")
    model = whisper.load_model("base", device="cpu")
    
    # Map UltraStar language to ISO 639-1
    lang_map = {
        'english': 'en', 'german': 'de', 'spanish': 'es', 'french': 'fr',
        'italian': 'it', 'dutch': 'nl', 'portuguese': 'pt', 'russian': 'ru',
        'japanese': 'ja', 'korean': 'ko', 'chinese': 'zh', 'polish': 'pl',
        'swedish': 'sv', 'danish': 'da', 'norwegian': 'no', 'finnish': 'fi'
    }
    lang_raw = headers.get("LANGUAGE", "en").lower().strip()
    lang_code = lang_map.get(lang_raw, "en") if len(lang_raw) > 2 else lang_raw
    print(f"[Aligner] Using language: {lang_code} (from {lang_raw})")
    
    import subprocess
    import sys
    try:
        import auditok
    except ImportError:
        print("[Aligner] Installing auditok for VAD...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "auditok", "--break-system-packages"])
        
    print(f"[Aligner] Transcribing audio with auditok VAD...")
    audio = whisper.load_audio(audio_path)
    result = whisper.transcribe(model, audio, language=lang_code, vad="auditok")
    
    whisper_words = []
    for seg in result.get('segments', []):
        for w in seg.get('words', []):
            whisper_words.append({
                'text': w['text'],
                'clean': clean_word(w['text']),
                'start': w['start'],
                'end': w['end']
            })
            
    print(f"[Aligner] Whisper transcribed {len(whisper_words)} words.")
    



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
                
                # Check if offset is insane (likely a hallucination mapped to wrong word)
                orig_start_time = us_words[i1]['orig_start']
                offset_diff = abs(start_time - orig_start_time)
                
                # Trust 3+ word matches up to 15s offset. Trust single word matches up to 5s offset.
                if ((j2 - j1) >= 3 and offset_diff < 15.0) or offset_diff < 5.0:
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
    # Calculate new beats
    # Let's set GAP to 0, and use BPM.
    bpm = float(headers.get('BPM', '120').replace(',', '.'))
    
    headers['GAP'] = '0'
    
    def time_to_beat(t):
        return int(round(t * 1000 * bpm / 60000))
        
    # Update notes
    for w in mapped_us_words:
        start_time = w['new_start']
        end_time = w['new_end']
        total_beats = sum(s['duration'] for s in w['syllables'])
        if total_beats == 0: total_beats = 1
        
        current_time = start_time
        for s in w['syllables']:
            s_duration_time = (s['duration'] / total_beats) * (end_time - start_time)
            new_beat = time_to_beat(current_time)
            new_dur_beat = max(1, time_to_beat(current_time + s_duration_time) - new_beat)
            
            s['start'] = new_beat
            s['duration'] = new_dur_beat
            
            current_time += s_duration_time
            
    # Fix line breaks
    for i, note in enumerate(notes):
        if note['type'] == '-':
            # Find prev and next syllable
            prev_syl = None
            next_syl = None
            for j in range(i-1, -1, -1):
                if notes[j]['type'] in (':', '*', 'F'):
                    prev_syl = notes[j]
                    break
            for j in range(i+1, len(notes)):
                if notes[j]['type'] in (':', '*', 'F'):
                    next_syl = notes[j]
                    break
                    
            if prev_syl and next_syl:
                note['start'] = prev_syl['start'] + prev_syl['duration']
            elif prev_syl:
                note['start'] = prev_syl['start'] + prev_syl['duration']
            elif next_syl:
                note['start'] = next_syl['start'] - 2
            else:
                note['start'] = 0

    print(f"[Aligner] Writing updated TXT to {txt_path}...")
    with open(txt_path, 'w', encoding='utf-8') as f:
        for k, v in headers.items():
            f.write(f"#{k}:{v}\n")
        for n in notes:
            if n['type'] in (':', '*', 'F'):
                f.write(f"{n['type']} {n['start']} {n['duration']} {n['pitch']} {n['text']}\n")
            elif n['type'] == '-':
                f.write(f"- {n['start']}\n")
            elif n['type'] == 'E':
                f.write("E\n")
                
    print(f"[Aligner] Done!")

if __name__ == '__main__':
    main()
