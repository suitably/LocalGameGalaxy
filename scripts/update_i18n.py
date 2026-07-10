import re

with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    content = f.read()

en_adds = """
                    "hardware_mic": "Hardware Microphones",
                    "hardware_mic_desc": "Use this if you have physical microphones connected to this device.",
                    "enable_mic": "Enable Mic",
                    "hardware_mic_setup": "Hardware Mic Setup",
                    "host_tv_setup": "Host TV Setup",
                    "connect_phone": "Connect Phone",
                    "host_queue": "Host Queue",
                    "clear": "Clear",
                    "empty_queue": "Empty Queue",
                    "queue_empty_desc": "No songs in the queue yet.",
"""

de_adds = """
                    "hardware_mic": "Hardware-Mikrofone",
                    "hardware_mic_desc": "Verwende dies, wenn physische Mikrofone an dieses Gerät angeschlossen sind.",
                    "enable_mic": "Mikrofon aktivieren",
                    "hardware_mic_setup": "Hardware-Mikrofon-Setup",
                    "host_tv_setup": "Host-TV-Setup",
                    "connect_phone": "Handy verbinden",
                    "host_queue": "Host-Warteschlange",
                    "clear": "Leeren",
                    "empty_queue": "Leere Warteschlange",
                    "queue_empty_desc": "Noch keine Songs in der Warteschlange.",
"""

# Inject en
content = content.replace('"scan_qr": "Scan QR Code to Join",', en_adds + '                    "scan_qr": "Scan QR Code to Join",')
# Inject de
content = content.replace('"scan_qr": "QR-Code scannen, um beizutreten",', de_adds + '                    "scan_qr": "QR-Code scannen, um beizutreten",')

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(content)
