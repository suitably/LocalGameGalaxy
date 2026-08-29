# Qwixx Spielvarianten & Sheet-Regelwerk [ID: TECH-QWIXX-RULES]

Dieses Dokument ist das verbindliche **Regelwerk und die Spezifikation aller Qwixx-Spielvarianten und Wertungsbögen** für die Implementierung in **LocalGameGalaxy**.

---

## 1. Übersicht aller Spielmodi / Sheet-Varianten

| Sheet-ID | Name | Besonderheit | Max. Punkte / Besonderheiten |
| :--- | :--- | :--- | :--- |
| `classic` | **Qwixx Klassisch (Standard)** | Standardfarbreihen (2× aufsteigend, 2× absteigend) | 4× 78 Pkt = 312 Pkt (abzgl. Fehlwürfe) |
| `gemixxt_a` | **Qwixx Gemixxt — Variante A** | Mehrfarbige Reihen (Zahlen sortiert, Farben wechseln in Segmenten) | Farbabhängige Farbwürfel-Entfernung |
| `gemixxt_b` | **Qwixx Gemixxt — Variante B** | Gemischte Zahlen (Farben fix, Zahlenreihenfolge wild gewürfelt) | Spezifische Abschlusszahlen (z. B. 2, 10, 3, 4) |
| `big_points` | **Qwixx Big Points** | 2 zweifarbige Zusatzreihen (Rot-Gelb & Grün-Blau) | Kreuze in Zusatzreihen zählen für BEIDE Nachbarfarben |
| `connected_stairs` | **Qwixx Connected — Treppe** | 11 optisch verbundene Treppenfelder quer über Reihen | 5. Wertungskategorie für Treppenkreuze (bis +66 Pkt) |
| `connected_chains` | **Qwixx Connected — Kette** | Gekoppelte Zahlenpaare zwischen Reihen | Zwangskreuz im verbundenen Zielfeld |
| `double_sub` | **Qwixx Double — Zusatzkästchen** | Kleine Unterkästchen unter Zahlen bei erneutem Wurf | Bis zu 16+ zählende Kreuze pro Reihe |
| `double_numbers` | **Qwixx Double — Doppelzahlen** | Bestimmte Felder enthalten Doppelzahlen | Zählen sofort als 2 Kreuze |
| `bonus` | **Qwixx Bonus** | Bonus-Symbole schalten Kettenreaktionen / Boni frei | Extra-Kreuze, Verdopplungen oder Schutz vor Fehlwürfen |

---

## 2. Detaillierte Regelwerke pro Modus

---

### Modus 1: Qwixx Klassisch (`classic`)

#### 1. Aufbau
- 4 Reihen mit jeweils 11 Zahlenfeldern:
  - **Rot**: `[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` (Aufsteigend)
  - **Gelb**: `[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` (Aufsteigend)
  - **Grün**: `[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]` (Absteigend)
  - **Blau**: `[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]` (Absteigend)
- 4 Fehlwurf-Felder (-5 Punkte je Fehlwurf).

#### 2. Spielablauf & Ankreuz-Regeln
- Die Zahlen müssen in jeder Reihe **strikt von links nach rechts** angekreuzt werden.
- Man darf Zahlen überspringen; einmal übersprungene Zahlen dürfen im weiteren Spielverlauf nicht mehr angekreuzt werden.
- **Aktion 1 (Alle Spieler)**: Die Summe der beiden weißen Würfel darf in einer beliebigen Farbreihe angekreuzt werden.
- **Aktion 2 (Nur aktiver Spieler)**: Die Summe aus einem weißen und einem farbigen Würfel darf in der entsprechenden Farbreihe angekreuzt werden.
- Kann oder will der aktive Spieler in beiden Aktionen kein Kreuz setzen, muss er einen **Fehlwurf** ankreuzen (-5 Punkte).

#### 3. Reihe abschließen (Lock)
- Um eine Reihe abzuschließen, muss der Spieler die **letzte Zahl ganz rechts** (12 bei Rot/Gelb, 2 bei Grün/Blau) ankreuzen.
- **Bedingung**: Der Spieler muss in dieser Reihe bereits mindestens **5 Kreuze** vorweisen können (inklusive der letzten Zahl).
- Beim Abschließen wird zusätzlich das **Schlosssymbol** angekreuzt (zählt als weiteres reguläres Kreuz für die Endwertung).
- Der entsprechende Farbwürfel wird für alle Spieler entfernt und die Reihe ist für alle gesperrt.

#### 4. Wertung
- Punkteformel je Reihe für $n$ Kreuze: $\text{Punkte}(n) = \frac{n \cdot (n + 1)}{2}$
  - 1 Kreuz = 1 | 2 = 3 | 3 = 6 | 4 = 10 | 5 = 15 | 6 = 21 | 7 = 28 | 8 = 36 | 9 = 45 | 10 = 55 | 11 = 66 | 12 = 78
- Gesamtpunktzahl = $(\text{Rot} + \text{Gelb} + \text{Grün} + \text{Blau}) - (\text{Fehlwürfe} \times 5)$.

#### 5. Spielende
- Sobald ein Spieler seinen 4. Fehlwurf erhält **ODER** insgesamt 2 Reihen geschlossen sind.

---

### Modus 2: Qwixx Gemixxt — Variante A: Mehrfarbige Reihen (`gemixxt_a`)

#### 1. Aufbau
Die Zahlenwerte bleiben wie im Grundspiel auf- bzw. absteigend sortiert, jedoch wechseln die Farben innerhalb der Reihen in vier Blöcken:

- **Reihe 1 (Zahlen 2 bis 12)**:
  - 2, 3, 4, 5: **Rot**
  - 6, 7, 8: **Gelb**
  - 9, 10: **Grün**
  - 11, 12: **Blau** (Schlossfarbe: **Blau**)
- **Reihe 2 (Zahlen 2 bis 12)**:
  - 2, 3, 4: **Gelb**
  - 5, 6, 7: **Grün**
  - 8, 9, 10: **Blau**
  - 11, 12: **Rot** (Schlossfarbe: **Rot**)
- **Reihe 3 (Zahlen 12 bis 2)**:
  - 12, 11, 10, 9: **Grün**
  - 8, 7, 6: **Blau**
  - 5, 4: **Rot**
  - 3, 2: **Gelb** (Schlossfarbe: **Gelb**)
- **Reihe 4 (Zahlen 12 bis 2)**:
  - 12, 11, 10: **Blau**
  - 9, 8, 7: **Rot**
  - 6, 5, 4: **Gelb**
  - 3, 2: **Grün** (Schlossfarbe: **Grün**)

#### 2. Besondere Regeln
- **Weiße Würfelsumme**: Darf in jedem beliebigen Feld (unabhängig von der Feldfarbe) von links nach rechts angekreuzt werden.
- **Farbiger Würfel + weißer Würfel**: Darf **NUR** in einem Feld angekreuzt werden, das genau die Farbe dieses Farbwürfels besitzt!
  - *Beispiel*: Ein roter Würfel (4) + weißer Würfel (3) = 7 darf in Reihe 4 (wo 7 rot ist) angekreuzt werden, nicht aber in Reihe 1 (wo 7 gelb ist).
- **Reihenabschluss**:
  - Wird eine Reihe abgeschlossen (letzte Zahl rechts mit mind. 5 Kreuzen), wird der Farbwürfel der **Schlossfarbe** (Farbe des letzten Feldes) aus dem Spiel genommen.
  - Die abgeschlossene Zeile ist für alle Spieler gesperrt. In den übrigen Zeilen können Felder dieser Farbe weiterhin über die weißen Würfel angekreuzt werden.

#### 3. Wertung
- Jede der 4 Zeilen wird separat nach der Standardformel gewertet.

---

### Modus 3: Qwixx Gemixxt — Variante B: Gemischte Zahlen (`gemixxt_b`)

#### 1. Aufbau
Die vier Reihen behalten ihre durchgehende Grundfarbe, die Zahlenreihenfolge ist jedoch komplett gemischt:

- **Rote Reihe**: `[5, 7, 11, 9, 12, 3, 8, 10, 4, 6, 2]` — Abschlusszahl: **2**
- **Gelbe Reihe**: `[9, 12, 4, 6, 7, 2, 5, 8, 11, 3, 10]` — Abschlusszahl: **10**
- **Grüne Reihe**: `[8, 2, 10, 12, 6, 9, 7, 4, 5, 11, 3]` — Abschlusszahl: **3**
- **Blaue Reihe**: `[10, 6, 2, 8, 3, 11, 12, 5, 9, 7, 4]` — Abschlusszahl: **4**

#### 2. Besondere Regeln
- Das Ankreuzen erfolgt wie gewohnt **streng von links nach rechts**.
- **Reihenabschluss**:
  - Eine Reihe kann nur mit der Zahl ganz rechts abgeschlossen werden:
    - Rot: mit der **2**
    - Gelb: mit der **10**
    - Grün: mit der **3**
    - Blau: mit der **4**
  - Mindestanzahl von 5 Kreuzen in dieser Reihe ist weiterhin erforderlich.
  - Schloss-Symbol gibt +1 Kreuz und sperrt die Reihe / entfernt den Farbwürfel.

---

### Modus 4: Qwixx Big Points (`big_points`)

#### 1. Aufbau
- 4 Standard-Reihen (Rot 2..12, Gelb 2..12, Grün 12..2, Blau 12..2).
- **2 zweifarbige Bonusreihen**:
  - **Rot-Gelbe Bonusreihe**: 11 Felder (2 bis 12) zwischen der roten und gelben Reihe.
  - **Grün-Blaue Bonusreihe**: 11 Felder (12 bis 2) zwischen der grünen und blauen Reihe.

#### 2. Besondere Regeln
- **Bonusfeld ankreuzen**:
  - Ein Feld in einer Bonusreihe darf angekreuzt werden, wenn in derselben Zahlenspalte **bereits mindestens ein Feld** der beiden angrenzenden Farbreihen angekreuzt ist (oder im selben Spielzug angekreuzt wird).
  - Auch die Bonusreihen müssen von links nach rechts bespielt werden.
  - Das Ankreuzen eines Bonusfeldes zählt als reguläre Aktion (schützt vor Fehlwurf).
- **Reihenabschluss**:
  - Bonusfelder zählen **nicht** zu den 5 Mindestkreuzen für das Schließen einer normalen Reihe.
  - Wurde eine Farbreihe geschlossen, darf die zugehörige Bonusreihe weiter angekreuzt werden.

#### 3. Wertung
- Jedes Kreuz in der **Rot-Gelben Bonusreihe** wird bei der Endabrechnung **sowohl zur roten als auch zur gelben Reihe** addiert!
- Jedes Kreuz in der **Grün-Blauen Bonusreihe** wird **sowohl zur grünen als auch zur blauen Reihe** addiert!
- Dadurch können bis zu 15+ Kreuze pro Farbe erzielt werden (z. B. 15 Kreuze = 120 Punkte).

---

### Modus 5: Qwixx Connected — Treppe (`connected_stairs`)

#### 1. Aufbau
- 4 Standard-Reihen (Rot 2..12, Gelb 2..12, Grün 12..2, Blau 12..2).
- **11 Treppenfelder** sind optisch mit einem dicken Rand hervorgehoben und bilden eine durchgehende Diagonale/Treppe:
  - Rot: `[2, 3, 4]`
  - Gelb: `[5, 6, 7]`
  - Grün: `[7, 6, 5]`
  - Blau: `[4, 3, 2]`

#### 2. Besondere Regeln & Wertung
- Das Spiel folgt den Standardregeln.
- **5. Wertungskategorie (Treppenwertung)**:
  - Bei Spielende wird gezählt, wie viele der 11 Treppenfelder angekreuzt wurden.
  - Die Anzahl der Treppenkreuze wird mit der Standard-Punktetabelle (1=1, 2=3, ..., 11=66 Pkt) berechnet und als separater Bonus addiert.
- Gesamtpunktzahl = $\text{Rot} + \text{Gelb} + \text{Grün} + \text{Blau} + \text{Treppe} - \text{Fehlwürfe}$.

---

### Modus 6: Qwixx Connected — Kette (`connected_chains`)

#### 1. Aufbau
- 4 Standard-Reihen mit festen Verbindungslinien (Ketten) zwischen Paaren von Feldern:
  - Rot 4 $\leftrightarrow$ Gelb 6
  - Rot 9 $\leftrightarrow$ Blau 7
  - Gelb 3 $\leftrightarrow$ Grün 10
  - Grün 6 $\leftrightarrow$ Blau 4
  - Gelb 11 $\leftrightarrow$ Grün 3

#### 2. Besondere Regeln
- **Ketten-Effekt**: Kreuzt ein Spieler ein Feld an, das durch eine Kette verbunden ist, **muss** er sofort auch das verbundene Partnerfeld in der anderen Reihe ankreuzen.
- Das Partnerfeld darf auch dann angekreuzt werden, wenn in jener Reihe dadurch weiter links liegende Felder übersprungen werden.
- Befindet sich die Zielreihe bereits rechts vom Partnerfeld, ist der Kettensprung nicht mehr möglich (bzw. das auslösende Feld darf nicht gewählt werden).

---

### Modus 7: Qwixx Double — Zusatzkästchen (`double_sub`)

#### 1. Aufbau
- Unter den Standard-Zahlenfeldern befindet sich jeweils ein zweites, kleineres Zusatzkästchen.

#### 2. Besondere Regeln
- Wurde eine Zahl im Hauptfeld bereits angekreuzt, darf bei einem späteren Wurf derselben Zahl das kleine Zusatzkästchen angekreuzt werden.
- Jedes Zusatzkästchen zählt als vollwertiges Extrakreuz bei der Zeilenabrechnung.

---

### Modus 8: Qwixx Double — Doppelzahlen (`double_numbers`)

#### 1. Aufbau
- Bestimmte Zahlenfelder (z. B. Rot 6, Gelb 8, Grün 7, Blau 5) sind als Doppelzahlen markiert.

#### 2. Besondere Regeln
- Beim Ankreuzen eines Doppelzahl-Feldes werden automatisch **2 Kreuze** auf einmal gewertet.

---

### Modus 9: Qwixx Bonus (`bonus`)

#### 1. Aufbau
- Spezielle Bonus-Symbole auf ausgewählten Feldern.
- Bei Erreichen lösen sie Sonderaktionen aus:
  - **Sofort-Kreuz**: Freies Kreuz in einer Wunschfarbe.
  - **Fehlwurf-Schutz**: Letzter Fehlwurf wird annulliert.
  - **Zeilen-Verdoppler**: Am Spielende zählt die schwächste Reihe doppelt.

---

## 3. Datenmodell & Erweiterungs-Architektur

Für die saubere Integration in React & TypeScript wird ein modulares **Sheet-Registry-Muster** verwendet:

```typescript
export interface SheetCell {
    number: number;
    color: RowColor; // Display/matching color
    isLock?: boolean;
    isStair?: boolean;
    chainId?: string;
    hasSubBox?: boolean;
    isDouble?: boolean;
    bonusType?: string;
}

export interface SheetRowDefinition {
    id: string;
    defaultColor: RowColor;
    cells: SheetCell[];
    lockNumber: number;
    lockColor: RowColor;
}

export interface SheetDefinition {
    id: QwixxSheetType;
    name: string;
    description: string;
    rows: SheetRowDefinition[];
    hasBonusRows?: boolean;
    bonusRows?: SheetRowDefinition[];
    hasStairScoring?: boolean;
}
```

Dadurch bleibt die Kernlogik (Reducer, Highlights, Multiplayer-Broadcasts) vollständig generisch und erweiterbar.
