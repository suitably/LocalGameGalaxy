import sys
import os
import re
import difflib

try:
    import whisper_timestamped as whisper
except ImportError:
    print("[Aligner] ERROR: whisper-timestamped is not installed.")
    sys.exit(1)

def parse_ultrastar(txt_path):
    headers = {}
    items = []
    
    # Robust encoding fallback (UTF-8 with BOM, pure UTF-8, CP1252, Latin-1)
    content = None
    for enc in ('utf-8-sig', 'utf-8', 'cp1252', 'latin-1'):
        try:
            with open(txt_path, 'r', encoding=enc) as f:
                content = f.read()
                break
        except (UnicodeDecodeError, OSError):
            continue
            
    if content is None:
        raise ValueError(f"Could not decode file {txt_path} with supported encodings.")

    for raw_line in content.splitlines():
        line = raw_line.rstrip('\r\n')
        line_clean = line.strip()
        if not line_clean:
            continue
        if line_clean.startswith('#'):
            parts = line_clean.split(':', 1)
            if len(parts) == 2:
                headers[parts[0][1:].strip().upper()] = parts[1].strip()
        elif line.lstrip().startswith((':', '*', 'F', 'R', 'G')):
            parts = line.lstrip().split(' ', 4)
            if len(parts) >= 4:
                note = {
                    'type': parts[0],
                    'start': int(parts[1]),
                    'duration': int(parts[2]),
                    'pitch': int(parts[3]),
                    'text': parts[4] if len(parts) > 4 else '',
                    'original_line': line
                }
                items.append(note)
        elif line.lstrip().startswith('-'):
            parts = line.lstrip().split(' ')
            items.append({
                'type': '-',
                'start': int(parts[1]) if len(parts) > 1 and parts[1].strip() else None,
                'original_line': line
            })
        elif line_clean.startswith(('P1', 'P2', 'P3', 'P4')):
            items.append({
                'type': 'P',
                'value': line_clean,
                'original_line': line
            })
        elif line_clean == 'E':
            items.append({'type': 'E', 'original_line': line})
        else:
            items.append({'type': 'raw', 'original_line': line})

    return headers, items

def group_syllables_into_words(items):
    words = []
    current_word = {'syllables': [], 'text': ''}
    
    for item in items:
        # Line breaks, Duet singer switches, or End finish the current word
        if item['type'] in ('-', 'P', 'E', 'raw'):
            if current_word['syllables']:
                words.append(current_word)
                current_word = {'syllables': [], 'text': ''}
            continue
            
        if item['type'] not in (':', '*', 'F', 'R', 'G'):
            continue
            
        t = item['text']
        
        # If syllable starts with a space or tilde, it begins a new word
        if t.startswith(' ') or t.startswith('~'):
            if current_word['syllables']:
                words.append(current_word)
            current_word = {'syllables': [item], 'text': t.strip(' ~')}
        else:
            current_word['syllables'].append(item)
            current_word['text'] += t.replace('~', '').strip()
            
        # If syllable ends with a space, finish the word
        if t.endswith(' '):
            words.append(current_word)
            current_word = {'syllables': [], 'text': ''}
            
    if current_word['syllables']:
        words.append(current_word)
        
    return words

def clean_word(w):
    # Keep unicode letters and digits (preserves German ä, ö, ü, ß, etc.)
    return re.sub(r'[\W_]+', '', w, flags=re.UNICODE).lower()

def main():
    if len(sys.argv) < 3:
        print("Usage: python align_lyrics.py <txt_path> <audio_path>")
        sys.exit(1)
        
    txt_path = sys.argv[1]
    audio_path = sys.argv[2]
    
    if not os.path.exists(txt_path):
        print(f"[Aligner] Error: Text file not found: {txt_path}")
        sys.exit(1)
    if not os.path.exists(audio_path):
        print(f"[Aligner] Error: Audio file not found: {audio_path}")
        sys.exit(1)

    print(f"[Aligner] Parsing {txt_path}...")
    headers, items = parse_ultrastar(txt_path)
    
    us_words = group_syllables_into_words(items)
    print(f"[Aligner] Found {len(us_words)} words in UltraStar TXT.")
    
    # Models directory cache
    models_dir = os.environ.get("WHISPER_MODELS_DIR", os.environ.get("TORCH_HOME", "/app/models"))
    if not os.path.exists(models_dir):
        models_dir = None
    print(f"[Aligner] Loading Whisper model (base) [Cache: {models_dir or 'default'}]...")
    model = whisper.load_model("base", device="cpu", download_root=models_dir)
    
    # Language mapping
    lang_map = {
        'english': 'en', 'german': 'de', 'spanish': 'es', 'french': 'fr',
        'italian': 'it', 'dutch': 'nl', 'portuguese': 'pt', 'russian': 'ru',
        'japanese': 'ja', 'korean': 'ko', 'chinese': 'zh', 'polish': 'pl',
        'swedish': 'sv', 'danish': 'da', 'norwegian': 'no', 'finnish': 'fi'
    }
    lang_raw = headers.get("LANGUAGE", "en").lower().strip()
    lang_code = lang_map.get(lang_raw, "en") if len(lang_raw) > 2 else (lang_raw or "en")
    print(f"[Aligner] Language: {lang_code} (from '{lang_raw}')")
    
    # Check for auditok VAD
    has_auditok = False
    try:
        import auditok
        has_auditok = True
    except ImportError:
        pass
        
    print(f"[Aligner] Transcribing audio with Whisper (VAD: {'auditok' if has_auditok else 'default'})...")
    audio = whisper.load_audio(audio_path)
    if has_auditok:
        result = whisper.transcribe(model, audio, language=lang_code, vad="auditok")
    else:
        result = whisper.transcribe(model, audio, language=lang_code)
    
    whisper_words = []
    for seg in result.get('segments', []):
        for w in seg.get('words', []):
            whisper_words.append({
                'text': w['text'],
                'clean': clean_word(w['text']),
                'start': float(w['start']),
                'end': float(w['end'])
            })
            
    print(f"[Aligner] Whisper transcribed {len(whisper_words)} words.")
    if not whisper_words:
        print("[Aligner] Warning: No words transcribed by Whisper. Leaving file unchanged.")
        sys.exit(0)

    # UltraStar format timing:
    # 1 beat = 60.0 / (BPM * 4) seconds. (BPM in UltraStar is quarter beats)
    orig_bpm = float(headers.get('BPM', '120').replace(',', '.'))
    if orig_bpm <= 0:
        orig_bpm = 120.0
    orig_gap = float(headers.get('GAP', '0').replace(',', '.'))

    def beat_to_time(b):
        return (orig_gap / 1000.0) + (b * 60.0 / (orig_bpm * 4.0))

    def time_to_beat(t):
        return int(round(t * (orig_bpm * 4.0) / 60.0))

    if not us_words:
        print("[Aligner] No singable syllables in UltraStar TXT. Generating lyrics automatically from audio transcription...")
        headers['GAP'] = '0'
        generated_items = []
        last_end = 0.0
        for w in whisper_words:
            if not w['clean']:
                continue
            if last_end > 0.0 and (w['start'] - last_end) > 1.2:
                generated_items.append({'type': 'break', 'line': f"- {time_to_beat(last_end + 0.1)}"})
            start_b = time_to_beat(w['start'])
            dur_b = max(1, time_to_beat(w['end']) - start_b)
            generated_items.append({
                'type': 'note',
                'note_type': ':',
                'start_beat': start_b,
                'duration': dur_b,
                'pitch': 10,
                'text': f" {w['text'].strip()}"
            })
            last_end = w['end']

        if generated_items:
            print(f"[Aligner] Generated {len(generated_items)} notes from speech transcription.")
            write_ultrastar(txt_path, headers, generated_items)
            print("[Aligner] Lyrics generation and alignment completed successfully!")
            sys.exit(0)
        else:
            print("[Aligner] Error: Whisper could not detect any lyrics in audio.")
            sys.exit(1)
        
    for w in us_words:
        w['orig_start'] = beat_to_time(w['syllables'][0]['start'])
        total_beats = sum(s['duration'] for s in w['syllables'])
        w['orig_end'] = beat_to_time(w['syllables'][0]['start'] + total_beats)

    # Align using SequenceMatcher
    us_clean = [clean_word(w['text']) for w in us_words]
    wh_clean = [w['clean'] for w in whisper_words]
    
    sm = difflib.SequenceMatcher(None, us_clean, wh_clean)
    
    mapped_blocks = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            if j2 > j1 and i2 > i1:
                start_time = whisper_words[j1]['start']
                end_time = whisper_words[j2 - 1]['end']
                if end_time <= start_time:
                    end_time = start_time + 0.1
                
                orig_start_time = us_words[i1]['orig_start']
                offset_diff = abs(start_time - orig_start_time)
                
                # Trust 3+ word matches up to 20s offset; single/dual word matches up to 7s offset
                word_count = j2 - j1
                if (word_count >= 3 and offset_diff < 20.0) or (word_count < 3 and offset_diff < 7.0):
                    mapped_blocks.append({'i1': i1, 'i2': i2, 'start': start_time, 'end': end_time})

    print(f"[Aligner] Successfully matched {len(mapped_blocks)} equal text blocks.")
    if not mapped_blocks:
        print("[Aligner] Warning: No matching text blocks found between Whisper and lyrics. Leaving original timings and GAP intact.")
        sys.exit(0)

    # Apply times to matched blocks
    for block in mapped_blocks:
        i1, i2 = block['i1'], block['i2']
        start_time, end_time = block['start'], block['end']
        
        us_sub = us_words[i1:i2]
        total_beats = sum(sum(s['duration'] for s in w['syllables']) for w in us_sub)
        if total_beats == 0:
            total_beats = 1
        
        current_time = start_time
        total_duration = max(0.1, end_time - start_time)
        
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
            
        prev_offset = None
        prev_orig_time = None
        for j in range(i - 1, -1, -1):
            if us_words[j].get('mapped') and 'offset' in us_words[j]:
                prev_offset = us_words[j]['offset']
                prev_orig_time = us_words[j]['orig_start']
                break
                
        next_offset = None
        next_orig_time = None
        for j in range(i + 1, len(us_words)):
            if us_words[j].get('mapped') and 'offset' in us_words[j]:
                next_offset = us_words[j]['offset']
                next_orig_time = us_words[j]['orig_start']
                break
                
        if prev_offset is not None and next_offset is not None:
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
            w_offset = 0.0
            
        w['new_start'] = max(0.0, w['orig_start'] + w_offset)
        w['new_end'] = max(w['new_start'] + 0.1, w['orig_end'] + w_offset)
        w['offset'] = w_offset
        w['mapped'] = True

    # Ensure strictly increasing times
    current_time = 0.0
    for w in us_words:
        if w['new_start'] < current_time:
            w['new_start'] = current_time
        if w['new_end'] <= w['new_start']:
            w['new_end'] = w['new_start'] + 0.1
        current_time = w['new_end']

    # Set GAP to 0 for unified absolute alignment and convert seconds back to beats
    headers['GAP'] = '0'
    
    def time_to_beat(t):
        return int(round(t * (orig_bpm * 4.0) / 60.0))
        
    for w in us_words:
        start_time = w['new_start']
        end_time = w['new_end']
        total_beats = sum(s['duration'] for s in w['syllables'])
        if total_beats == 0:
            total_beats = 1
        
        cur_t = start_time
        tot_d = max(0.05, end_time - start_time)
        for s in w['syllables']:
            s_dur_time = (s['duration'] / total_beats) * tot_d
            new_beat = time_to_beat(cur_t)
            next_beat = time_to_beat(cur_t + s_dur_time)
            new_dur_beat = max(1, next_beat - new_beat)
            
            s['start'] = new_beat
            s['duration'] = new_dur_beat
            cur_t += s_dur_time

    # Re-calculate line break positions (-)
    for i, item in enumerate(items):
        if item['type'] == '-':
            prev_syl = None
            next_syl = None
            for j in range(i - 1, -1, -1):
                if items[j]['type'] in (':', '*', 'F', 'R', 'G'):
                    prev_syl = items[j]
                    break
            for j in range(i + 1, len(items)):
                if items[j]['type'] in (':', '*', 'F', 'R', 'G'):
                    next_syl = items[j]
                    break
                    
            if prev_syl and next_syl:
                item['start'] = prev_syl['start'] + prev_syl['duration']
            elif prev_syl:
                item['start'] = prev_syl['start'] + prev_syl['duration']
            elif next_syl:
                item['start'] = max(0, next_syl['start'] - 2)
            else:
                item['start'] = 0

    print(f"[Aligner] Writing updated UltraStar TXT to {txt_path}...")
    with open(txt_path, 'w', encoding='utf-8') as f:
        for k, v in headers.items():
            f.write(f"#{k}:{v}\n")
        for item in items:
            t = item['type']
            if t in (':', '*', 'F', 'R', 'G'):
                f.write(f"{t} {item['start']} {item['duration']} {item['pitch']} {item['text']}\n")
            elif t == '-':
                f.write(f"- {item['start']}\n")
            elif t == 'P':
                f.write(f"{item['value']}\n")
            elif t == 'E':
                f.write("E\n")
            elif t == 'raw':
                f.write(f"{item['original_line']}\n")

    print("[Aligner] Lyrics alignment completed successfully!")

if __name__ == '__main__':
    main()
