import whisper_timestamped as whisper
try:
    print("Loading...")
    model = whisper.load_model("base", device="cpu")
    print("Transcribing...")
    audio = whisper.load_audio("/home/deck/Music/Ultrastar/Songs/Rufus Wainwright - Hallelujah/Rufus Wainwright - Hallelujah.mp3")
    result = whisper.transcribe(model, audio, language="en")
    print("Done transcribing!")
except Exception as e:
    print("ERROR:", e)
