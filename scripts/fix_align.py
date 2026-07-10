import re

content = open("server/src/scripts/align_lyrics.py", "r").read()

mapping_code = """
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
    
    # Create initial prompt from first 30 words to anchor Whisper
    prompt_words = [w['clean'] for w in us_words[:30]]
    initial_prompt = " ".join(prompt_words)
    
    print(f"[Aligner] Transcribing audio with VAD and initial_prompt...")
    audio = whisper.load_audio(audio_path)
    result = whisper.transcribe(model, audio, language=lang_code, initial_prompt=initial_prompt, vad=True)
"""

old_code = """
    print(f"[Aligner] Transcribing audio...")
    audio = whisper.load_audio(audio_path)
    result = whisper.transcribe(model, audio, language=headers.get("LANGUAGE", "en").lower()[:2] if "LANGUAGE" in headers else None)
"""

content = content.replace(old_code.strip(), mapping_code.strip())
open("server/src/scripts/align_lyrics.py", "w").write(content)
print("Updated align_lyrics.py")
