# Szablon: workbench biegu

Lider kopiuje treść spod linii poziomej do `audyt/biegi/{id}/workbench.md`, podstawia
placeholdery i aktualizuje plik po każdej fazie oraz po każdej rundzie. To brudnopis
biegu, nie raport: ma być zawsze aktualny, nie ładny. Jeśli sesja padnie, następna
podnosi bieg z tego pliku.

---

# Workbench: {{ID}}

| | |
|---|---|
| Karta | {{KARTA}} |
| Tryb | {{TRYB}} |
| HEAD | {{HEAD}} |
| Start | {{START}} |
| Status | w toku |

## Poprzeczka

{{POPRZECZKA}}

## Teraz robię

(jedna linia, np. "runda 2, czekam na 4 szukaczy")

## Kawałki

| id | nazwa | runda | status | zgłoszone / obalone / potwierdzone | największa luka |
|---|---|---|---|---|---|
| K1 |  | 0 | niezbiezny | 0 / 0 / 0 | (z `najwieksza_luka` szukacza, wchodzi jako FOCUS następnej rundy) |

Status: `niezbiezny`, `zbiezny` (dwie rundy bez nowych potwierdzonych), `pominiety`.

## Log rund

| runda | co się stało |
|---|---|
|  | (1-3 linie: ilu szukaczy, ile zgłoszeń, ile obaleń, co się zmieniło w focusie) |

## Budżet

| | |
|---|---|
| rundy | 0 / (maxRund) |
| suche rundy | 0 / (maxSuche) |
| agentów wypuszczonych | 0 |
| powód stopu | - |

Powód stopu: `zbieznosc`, `sufit_rund`, `sufit_budzetu`, `przerwanie`.

## Znane (do sprawdzenia)

Z poprzednich biegów tej karty i z sekcji "Risk register" Katalogu Audytów.
Szukacze dostają tę listę, żeby nie odkrywać tego samego drugi raz. Do raportu idzie
status każdej pozycji.

| skrót | źródło | status |
|---|---|---|
|  | (risk register data / id biegu) | nadal / naprawione / nie_sprawdzono |

## Notatki lidera

Rozstrzygnięcia sporów obalaczy, decyzje o degradacji znaleziska do
NIEWERYFIKOWALNE, rzeczy do dopisania w raporcie.
