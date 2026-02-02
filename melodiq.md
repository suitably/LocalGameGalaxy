# 🎤 Melodiq - Karaoke in Your Pocket

**Melodiq** is a next-generation karaoke party game designed for the web. Unlike traditional karaoke where everyone huddles around one screen, Melodiq turns every player's smartphone into a **smart microphone and controller**.

## 🌟 How It Works
*   **The Host**: Runs on a PC/TV (Smart TV browser or HDMI). It displays the lyrics, music video, and live pitch visualization.
*   **The Controllers**: Players join by scanning a QR code with their phones. Their phone microphone captures audio, detects pitch in real-time, and sends it to the Host for scoring. No expensive hardware required!

---

## 🛠️ The Melodiq Helper Server

### Why do I need a Helper?
Browsers have strict security limits (`Sandbox`) that prevent web pages from freely reading thousands of files from your hard drive. Since a Karaoke library (UltraStar format) contains thousands of `.txt`, `.mp3`, and `.mp4` files, loading them directly in the browser causes:
1.  **Memory Crashes**: Attempting to load 50GB of media into Chrome/Safari will crash the tab.
2.  **Slow Performance**: Parsing 10,000 text files in JavaScript takes a long time.
3.  **No Mobile Access**: Your phone cannot access the `.mp3` files stored on your PC's hard drive.

**The Helper Server** solves this by:
*   Running as a lightweight native app on your PC.
*   Scanning your folders instantly.
*   Streaming only the song you are currently playing to the Host and connected Phones.

---

## 📦 Installation Guide

### Option A: Running from Source (Developers)
If you have this project open in VS Code:
1.  Navigate to the `server/` folder.
2.  Run `npm install`.
3.  Run `npm start`.
4.  Open `http://localhost:3000`.

### Option B: Standalone Installation (Recommended for Servers)
You can run the Helper on any spare PC, Raspberry Pi, or NAS (Linux/Windows/Mac) without installing Node.js.

1.  **Download the Binary**:
    Get the executable for your OS from the `server/dist/` folder of this project (or release page).
    *   Linux: `melodiq-server-linux`
    *   Windows: `melodiq-server-win.exe`
    *   MacOS: `melodiq-server-macos`
2.  **Copy to Server**: Place the file in a folder (e.g., `C:\Games\Melodiq` or `/opt/melodiq`).
3.  **Run It**: Double-click the `.exe` or run `./melodiq-server-linux` in terminal.
4.  **Configure**:
    *   Open your browser to `http://localhost:3000` (or your server's IP: `http://192.168.1.X:3000`).
    *   Use the interface to **Add Folders** where your UltraStar songs are located.

---

## ☁️ Exposing to Internet (Cloudflared)

If you want to host a party where friends join via 4G/5G (not on your Wi-Fi), or if you are running the Host on a Smart TV that can't access your local Helper, you can expose the Helper securely using **Cloudflare Tunnel**.

### Prerequisites
*   A free Cloudflare account.
*   `cloudflared` installed on your PC/Server.

### Step-by-Step

1.  **Install Cloudflared**:
    *   **Windows**: Download `.msi` from Cloudflare.
    *   **Linux**: `curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb`

2.  **Login**:
    ```bash
    cloudflared tunnel login
    ```
    (Authorize via browser).

3.  **Create a Tunnel**:
    ```bash
    cloudflared tunnel create melodiq
    ```

4.  **Route DNS** (Optional, for nice URL):
    If you own a domain (e.g., `mysite.com`), you can map `karaoke.mysite.com` to your tunnel.
    ```bash
    cloudflared tunnel route dns melodiq karaoke.mysite.com
    ```

5.  **Run the Tunnel**:
    Map the public tunnel to your local Helper (port 3000).
    ```bash
    cloudflared tunnel run --url http://localhost:3000 melodiq
    ```
    *OR simply for temporary testing (no login required):*
    ```bash
    cloudflared tunnel --url http://localhost:3000
    ```
    (Copy the `trycloudflare.com` URL it gives you).

### Connecting the App
1.  Open **Melodiq Settings** in the game.
2.  In **Helper URL**, enter your generic tunneling URL (e.g., `https://melodiq-party.trycloudflare.com`).
3.  Now your mobile phones can fetch lyrics and audio from anywhere!
