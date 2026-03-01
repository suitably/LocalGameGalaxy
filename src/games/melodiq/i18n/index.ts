import i18n from '../../../i18n';

export const melodiqResources = {
    en: {
        melodiq: {
            title: "Melodiq",
            description: "Sing your heart out with friends!",
            library_empty: "Your library is empty",
            load_folder: "Load Song Directory",
            scanning: "Scanning...",
            import_stats: "Found: {{found}} | Processed: {{processed}} | Errors: {{errors}}",

            // New additions based on the UI
            play_now: "Play Now",
            play_next: "Play Next",
            add_end: "Add to Queue",
            play_now_locally_desc: "Locally",
            play_now_tv_desc: "On TV",
            play_next_desc: "Add to start of queue",
            add_end_desc: "Add to end of queue",
            search_placeholder: "Search title, artist...",
            cannot_connect: "Cannot connect to Melodiq Helper",
            helper_required: "To play local songs, you need the desktop helper app running.",
            download_helper: "Download Helper",
            retry_connection: "Retry Connection",
            songs_count: "{{filtered}} / {{total}} songs",
            genre: "Genre",
            year: "Year",
            language: "Language",
            edition: "Edition",
            clear_filters: "Clear Filters",
            loading_library: "Loading library... {{loaded}} / {{total}}",

            // Library Manager
            local_libraries: "Local Song Libraries",
            browser_storage: "Browser Storage",
            storage_desc: "Stores metadata in database. Files accessed directly from disk.",
            firefox_note: "Note: Firefox may have storage limits.",
            no_folders: "No local folders added.",
            remove_confirm: "Remove this folder from Browser Storage? Songs will be deleted from the database.",

            // Queue
            song_queue: "Song Queue",
            now_playing: "Now Playing",
            up_next: "Up Next ({{count}})",
            clear_all: "Clear All",
            queue_empty: "The queue is empty. Add some songs!",
            add_songs: "Add Songs",
            search_add: "Search to add...",

            // Phone Client
            host_settings: "Host Settings",
            host_desc: "Configure the TV/Host Server Connection remotely.",
            helper_url: "Helper URL",
            security_token: "Security Token",
            send_tv: "Send to TV",
            cancel: "Cancel",
            mic: "Mic",
            queue: "Queue",
            remote: "Remote",
            last_performance: "Last Performance",
            select_part: "Select Your Singer Part",
            in_game: "You are in the game! 🎤",
            sitting_out: "You are sitting out. 💤",
            leave_game: "Leave Game",
            join_game: "Join Game",
            your_name: "Your Name",
            your_color: "Your Color",
            microphone: "Microphone",
            default_mic: "Default",
            remote_control: "Remote Control",
            play_pause: "Play / Pause",
            restart: "Restart",
            next: "Next",
            exit_session: "Exit Session",
            stop_confirm: "Are you sure you want to stop the game?",
            control_desc: "Control the main screen from your phone.",
            no_matches: "No matches found",
            library_not_loaded: "Library not loaded",
            load_library_btn: "Load Library"
        }
    },
    de: {
        melodiq: {
            title: "Melodiq",
            description: "Sing dich frei mit Freunden!",
            library_empty: "Deine Bibliothek ist leer",
            load_folder: "Lieder-Ordner laden",
            scanning: "Scanne...",
            import_stats: "Gefunden: {{found}} | Verarbeitet: {{processed}} | Fehler: {{errors}}",

            // New additions based on the UI
            play_now: "Jetzt abspielen",
            play_next: "Als nächstes abspielen",
            add_end: "Zur Warteschlange hinzufügen",
            play_now_locally_desc: "Lokal",
            play_now_tv_desc: "Auf dem Fernseher",
            play_next_desc: "Am Anfang der Warteschlange einfügen",
            add_end_desc: "Am Ende der Warteschlange anfügen",
            search_placeholder: "Suche nach Titel, Künstler...",
            cannot_connect: "Keine Verbindung zum Melodiq Helper",
            helper_required: "Um lokale Lieder abzuspielen, muss die Desktop-Helper-App ausgeführt werden.",
            download_helper: "Helper herunterladen",
            retry_connection: "Verbindung erneut versuchen",
            songs_count: "{{filtered}} / {{total}} Lieder",
            genre: "Genre",
            year: "Jahr",
            language: "Sprache",
            edition: "Edition",
            clear_filters: "Filter zurücksetzen",
            loading_library: "Lade Bibliothek... {{loaded}} / {{total}}",

            // Library Manager
            local_libraries: "Lokale Liederkataloge",
            browser_storage: "Browser-Speicher",
            storage_desc: "Speichert Metadaten in der Datenbank. Dateien werden direkt von der Festplatte gelesen.",
            firefox_note: "Hinweis: Firefox kann Speicherplatz-Limits aufweisen.",
            no_folders: "Keine lokalen Ordner hinzugefügt.",
            remove_confirm: "Diesen Ordner aus dem Browser-Speicher entfernen? Lieder werden aus der Datenbank gelöscht.",

            // Queue
            song_queue: "Warteschlange",
            now_playing: "Läuft jetzt",
            up_next: "Als Nächstes ({{count}})",
            clear_all: "Alle löschen",
            queue_empty: "Die Warteschlange ist leer. Füge Lieder hinzu!",
            add_songs: "Lieder hinzufügen",
            search_add: "Suchen zum Hinzufügen...",

            // Phone Client
            host_settings: "Host-Einstellungen",
            host_desc: "Remote-Konfiguration für die TV/Host-Serververbindung.",
            helper_url: "Helper-URL",
            security_token: "Sicherheits-Token",
            send_tv: "An den Fernseher senden",
            cancel: "Abbrechen",
            mic: "Mikrofon",
            queue: "Warteschlange",
            remote: "Fernbedienung",
            last_performance: "Letzter Auftritt",
            select_part: "Wähle deine Gesangsstimme",
            in_game: "Du bist im Spiel! 🎤",
            sitting_out: "Du setzt aus. 💤",
            leave_game: "Spiel verlassen",
            join_game: "Dem Spiel beitreten",
            your_name: "Dein Name",
            your_color: "Deine Farbe",
            microphone: "Mikrofon",
            default_mic: "Standard",
            remote_control: "Fernbedienung",
            play_pause: "Play / Pause",
            restart: "Neu starten",
            next: "Weiter",
            exit_session: "Sitzung beenden",
            stop_confirm: "Bist du dir sicher, dass du das Spiel beenden möchtest?",
            control_desc: "Steuere den Hauptbildschirm von deinem Handy aus.",
            no_matches: "Keine Treffer gefunden",
            library_not_loaded: "Bibliothek nicht geladen",
            load_library_btn: "Bibliothek laden"
        }
    }
};

let melodiqI18nInitialized = false;

export const initMelodiqI18n = () => {
    if (melodiqI18nInitialized) return;

    // Add translations to the global 'translation' namespace
    i18n.addResourceBundle('en', 'translation', melodiqResources.en, true, true);
    i18n.addResourceBundle('de', 'translation', melodiqResources.de, true, true);

    melodiqI18nInitialized = true;
};
