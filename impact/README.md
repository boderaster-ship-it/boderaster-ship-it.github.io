# IMPACT — Release Candidate 1

## Developerauftrag

Entwickle ein eigenständiges, hochwertiges 3D-Puzzlespiel für iPhone/Safari mit optionaler PWA-Installation. Das Spiel darf weder wie ein Technikdemo-Prototyp noch wie ein generisches KI-Spiel wirken.

### Unveränderlicher Core
Bei jeder relevanten Kollision kann der Spieler die Reaktionsregel programmieren:
1. **WHO** — reagiert der Core oder die getroffene Surface?
2. **WHERE** — in welche Weltachse wird der resultierende Impuls geleitet?

Der Spieler programmiert die Regeln vor dem Start. Das Spiel ist primär ein Puzzle, kein Reaktionstest.

### Qualitätsziel
- stylisierte Premium-3D-Optik
- vollständig touchfähig auf dem iPhone
- professionelles Hauptmenü, Kampagnen-/Levelauswahl, Pause, Settings, Result Screen
- Licht, Schatten, Fog, emissive Materialien, Partikel, Kamera-Orbit, Pinch-Zoom
- prozedurales Sounddesign und Ambience über WebAudio
- lokale Savegames, Sterne-/Par-System und Progression
- PWA-/Offline-Struktur
- keine Placeholder-Grafiken oder Debug-Menüs im Spielerpfad

### Umfang
- 5 Welten
- 50 Levels
- datengetriebene Levelarchitektur, erweiterbar ohne Engine-Neubau
- neue Mechaniken werden progressiv eingeführt: 2D-Vektoren → 3D-Vektoren → Surface-Reaction → Gates/Switches → Mastery

### Release-Abnahmekriterien
- alle 50 Soll-Lösungen werden automatisiert gegen die Gameplay-Logik simuliert
- keine Tastatur/Maus erforderlich
- der Core Loop ist innerhalb des ersten Levels verständlich
- Fortschritt bleibt nach Neustart erhalten
- Neustart/Retry verändert programmierte Regeln nur dann, wenn der Spieler bewusst den Level komplett zurücksetzt
