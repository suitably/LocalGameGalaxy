import difflib

us_words = [{'text': 'ive'}, {'text': 'heard'}, {'text': 'there'}, {'text': 'was'}, {'text': 'a'}, {'text': 'secret'}, {'text': 'chord'}]
wh_words = [{'text': 'i', 'start': 10.0, 'end': 10.5}, {'text': 'heard', 'start': 10.5, 'end': 11.0}, {'text': 'there', 'start': 11.0, 'end': 11.5}, {'text': 'a', 'start': 12.0, 'end': 12.1}, {'text': 'secret', 'start': 12.1, 'end': 12.5}, {'text': 'chord', 'start': 12.5, 'end': 13.0}]

us_clean = [w['text'] for w in us_words]
wh_clean = [w['text'] for w in wh_words]

sm = difflib.SequenceMatcher(None, us_clean, wh_clean)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    print(tag, us_clean[i1:i2], wh_clean[j1:j2])
