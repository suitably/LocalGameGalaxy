import difflib

us = ["ive", "heard", "there", "was", "a", "secret", "chord"]
wh = ["thank", "you", "yeah", "ive", "heard", "there", "was", "a", "secret", "chord"]

sm = difflib.SequenceMatcher(None, us, wh)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    print(tag, us[i1:i2], wh[j1:j2])

print("---")
us2 = ["ive", "heard", "there", "was", "a", "secret", "chord"]
wh2 = ["thank", "you", "yeah"] # Complete hallucination, no match

sm2 = difflib.SequenceMatcher(None, us2, wh2)
for tag, i1, i2, j1, j2 in sm2.get_opcodes():
    print(tag, us2[i1:i2], wh2[j1:j2])
