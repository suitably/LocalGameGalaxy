import re

with open('src/i18n.ts', 'r', encoding='utf-8') as f:
    content = f.read()

en_adds = """
                    "helper": {
                        "title": "Helper Server Connection",
                        "desc": "Connect to a Melodiq Helper (PC/Server) to load 8000+ songs. Enter the URL (e.g., http://192.168.1.50:3000) and the Security Token shown on the Helper screen.",
                        "enable": "Enable Helper Connection",
                        "server_url": "Server URL",
                        "token": "Security Token",
                        "token_placeholder": "Copy from Helper Console/Screen",
                        "test": "Test Connection",
                        "connecting": "Connecting...",
                        "connected": "Connected! Found {{count}} songs.",
                        "unauthorized": "Unauthorized. Check Token.",
                        "error_status": "Error: {{status}}",
                        "conn_failed": "Connection Failed. Check URL or Network."
                    },
"""

de_adds = """
                    "helper": {
                        "title": "Helper-Server Verbindung",
                        "desc": "Verbinde dich mit einem Melodiq Helper (PC/Server), um über 8000 Songs zu laden. Gib die URL (z.B. http://192.168.1.50:3000) und das Sicherheitstoken vom Helper-Bildschirm ein.",
                        "enable": "Helper-Verbindung aktivieren",
                        "server_url": "Server-URL",
                        "token": "Sicherheitstoken",
                        "token_placeholder": "Vom Helper-Bildschirm kopieren",
                        "test": "Verbindung testen",
                        "connecting": "Verbinden...",
                        "connected": "Verbunden! {{count}} Songs gefunden.",
                        "unauthorized": "Nicht autorisiert. Überprüfe das Token.",
                        "error_status": "Fehler: {{status}}",
                        "conn_failed": "Verbindung fehlgeschlagen. Überprüfe die URL oder das Netzwerk."
                    },
"""

# Inject en
content = content.replace('"scan_qr": "Scan QR Code to Join",', en_adds + '                    "scan_qr": "Scan QR Code to Join",')
# Inject de
content = content.replace('"scan_qr": "QR-Code scannen, um beizutreten",', de_adds + '                    "scan_qr": "QR-Code scannen, um beizutreten",')

with open('src/i18n.ts', 'w', encoding='utf-8') as f:
    f.write(content)
