# [Feedback] Melodiq-Notes: Instrument Practice (Multi-Stem Audio & Mobile-First UX Refinement)

> **Architektur-Kontext für Jules & Entwickler:**  
> Das Noten-Rendering (OpenSheetMusicDisplay / OSMD), MusicXML-Parsing, Web-MIDI-Input und Mikrofon-Pitch-Erkennung sind in `src/games/melodiq-notes/` **bereits vollständig implementiert**.  
> **WICHTIG:** Es darf **kein** Noten-Rendering in `src/games/melodiq/` neu gebaut werden und **keine** Cross-Game-Imports zwischen den beiden Spielen stattfinden!  
> Dieses Ticket erweitert das bestehende `src/games/melodiq-notes/` um die fehlende Multi-Stem-Audiowiedergabe sowie eine grundlegende mobile Touch- und Scrolling-Optimierung.

---

## 1. Problemstellung & Motivation (Ist-Zustand)

Aktuell leidet `src/games/melodiq-notes/` unter zwei Kernproblemen:
1. **Fehlende Multi-Stem Begleitspuren:** Es gibt aktuell nur einen einfachen internen Synthesizer (`useAudioSynth.ts`) oder stumme Notenanzeige. Für echtes Instrumenten-Training ("Minus-One") fehlen die synchronen Audio-Stems (Drums, Bass, Begleitung, Vocals) mit separater Stummschaltung.
2. **Schlechte Mobile/Touch-UX & "Scroll-Jail":**
   - **Verschachtelter Scroll-Konflikt:** Der Noten-Viewer (`SheetMusicViewer.tsx`) besitzt ein festes `maxHeight: '60vh'` mit `overflowY: 'auto'`. Auf Smartphones fängt dieser Bereich Touch-Gesten ab, wodurch die Seite blockiert ("Scroll-Jail") und das Gesamtdokument nicht flüssig scrollt.
   - **Überladener Viewport:** `ControlPanel`, `HardwareStatus` und `NoteStatusBar` nehmen auf kleinen Bildschirmen über 500px Höhe ein. Das eigentliche Notenblatt wird nach unten aus dem Viewport gedrängt.
   - **Schwer erreichbare Steuerung:** Play/Pause und Reset liegen am Seitenende. Während des Spielens auf einem Instrument kann die Wiedergabe nicht mit dem Daumen gesteuert werden.
   - **Canvas-Skalierung:** Notenzeilen sind auf 360–400px Smartphone-Displays oft abgeschnitten oder erfordern horizontales Paning.

---

## 2. Zielsetzung & Soll-Architektur

### A. Mobile-First UX & Scroll-Entkopplung (`src/games/melodiq-notes/`)
1. **Beseitigung der Scroll-Falle:**
   - Kein blockierendes inneres `overflowY: 'auto'` auf Touch-Screens. Entweder Vollbild-Notenmodus mit intuitivem Touch-Panning oder freies Scrolling im nativen Page-Flow.
   - Dynamischer OSMD-Zoom basierend auf der Screen-Breite (`zoom: window.innerWidth < 600 ? 0.65 : 1.0`), damit Takte lesbar auf das Display passen.
2. **Kompakte / Collapsible Steuerungselemente:**
   - Auf mobilen Viewports (`xs` bis `sm`): Hardware-Setup (MIDI/Mic) und Ordner-Synchronisation in ein einklappbares Accordion oder einen Settings-Drawer (`IconButton` mit Gear-Icon) auslagern.
   - Das Notenblatt erhält sofort nach dem Laden die maximale vertikale Bildschirmfläche.
3. **Sticky / Floating Bottom Action Bar:**
   - Play/Pause, Reset, Tempo-Regler (BPM) und Mute-Buttons fest am unteren Bildschirmrand verankern (Daumen-Erreichbarkeit auf Smartphones & Tablets).

### B. Multi-Stem Web Audio Engine (`src/games/melodiq-notes/useStemAudioPlayer.ts`)
1. **Gemeinsamer AudioContext:**
   - Laden der 4 Audiospuren (`drums`, `bass`, `instrument`, `vocals` bzw. `other`) in einen synchronisierten Web Audio `AudioContext`.
2. **Gain-Nodes & Minus-One Mute-Gruppen:**
   - Jeder Stem erhält einen eigenen `GainNode`.
   - UI-Buttons zur schnellen Stummschaltung der eigenen Spur (`[Mute Instrument]`), damit der Nutzer selbst zum Backing-Track spielen kann.
3. **Audio-Noten-Synchronisation:**
   - Verknüpfung der aktuellen Audiozeit (`audioContext.currentTime`) mit dem OSMD-Notencursor über `sync_offset_ms`.

---

## 3. Akzeptanzkriterien (Definition of Done)

- [ ] **Mobile Responsiveness:** Auf Smartphones (< 600px Breite) ist die Seite ohne Blockaden flüssig bedienbar. Keine feststeckenden Touch-Gesten auf dem Canvas.
- [ ] **Sticky Action Bar:** Play/Pause und Reset sind zu jedem Zeitpunkt im sichtbaren Viewport bedienbar.
- [ ] **Collapsible Settings:** Hardware- und Ordner-Konfiguration verbrauchen auf mobilen Geräten im Spielmodus keinen vertikalen Platz.
- [ ] **Multi-Stem Playback:** Web Audio Engine lädt Stems (sofern vorhanden) und erlaubt individuelles Stummschalten via Gain-Nodes.
- [ ] **Budget & Architektur:** Alle geänderten Dateien in `src/games/melodiq-notes/` halten das 250-Zeilen-Limit ein (`npm run check:budget`).
- [ ] **Zero Cross-Game Imports:** Keine unerlaubten Importe aus `src/games/melodiq` (`npm run check:architecture:diff`).
- [ ] **Tests:** Unit-Tests für den Stem-Player und den responsiven Noten-Viewer laufen sauber durch (`npm test`).
