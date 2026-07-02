import whisper_timestamped as whisper
model = whisper.load_model("base", device="cpu")
audio = whisper.load_audio("/home/deck/Music/Ultrastar/Songs/Rufus Wainwright - Hallelujah/Vocals.mp3")
result = whisper.transcribe(model, audio, language="en", vad=False)
for seg in result.get('segments', [])[:2]:
    for w in seg.get('words', []):
        print(f"{w['text']}: {w['start']} - {w['end']} (conf: {w['confidence']})")
