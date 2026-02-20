# Claude Code - Sciaga dla JDHole

## Komendy (wpisz w czacie)

| Komenda   | Co robi                          |
|-----------|----------------------------------|
| /model    | Zmien model (tanszy/drozszy)     |
| /clear    | Wyczysc rozmowe (UZYWAJ CZESTO!) |
| /commit   | Zapisz zmiany w git              |
| /help     | Pomoc                            |
| Esc       | Przerwij odpowiedz AI            |

## Kiedy /clear?

- Skonczyles temat -> /clear
- Nowa funkcja -> /clear
- Gadacie w kolko o tym samym -> /clear i opisz od nowa
- Ogolnie: co 15-30 min intensywnej pracy

## Kiedy ktory model?

| Sytuacja                        | Model          |
|---------------------------------|----------------|
| Codzienne kodowanie             | Sonnet (/model)|
| Trudny bug, nie wiem co jest    | Opus (domyslny)|
| Planowanie architektury         | Opus           |
| Proste zmiany, szukanie plikow  | Haiku (/model) |

## Jak gadac z Claude Code?

DOBRZE (mow CO chcesz):
- "ten przycisk nie dziala, napraw"
- "chce zeby chat wyswietlal nazwe agenta na gorze"
- "to wyglada brzydko, popraw CSS"
- "nie rozumiem co ten kod robi, wytlumacz"

ZLE (nie musisz mowic JAK):
- "uzyj React hooków z useEffect..."
- "zaimplementuj wzorzec Observer..."
- "dodaj EventListener do DOM..."

## Jak oszczedzac tokeny?

1. /clear po kazdym temacie
2. Jedno zadanie = jedna rozmowa
3. Sonnet do codziennej roboty, Opus na trudne rzeczy
4. Nie wklejaj ogromnych tekstow jesli nie musisz
5. Jesli cos nie dziala - Esc, /clear, opisz problem od nowa

## Codzienny rytual

RANO:
1. Otworz VS Code
2. Przeczytaj DEVLOG.md (co robilem wczoraj)
3. Powiedz Claude: "czesc, dzis robimy [X], przeczytaj DEVLOG.md"

CO 2-3 GODZINY:
1. /commit (zapisz postep)
2. Przetestuj w Obsidianie

WIECZOR:
1. /commit (ostatni zapis)
2. Powiedz: "zaktualizuj DEVLOG.md o dzisiejsze zmiany"
3. git push (wypchnij na GitHub)

## Gdy cos nie dziala

1. Esc (przerwij)
2. /clear (wyczysc kontekst)
3. Opisz problem OD NOWA, krotko
4. Jesli dalej nie dziala - skopiuj blad i wklej mi go
5. Jesli DALEJ nie dziala - "zmien podejscie, to nie dziala"

## Pamietaj

- Ty mowisz CO, ja mowie JAK
- Nie musisz umiec programowac
- Testuj w Obsidianie po kazdej zmianie
- /clear /clear /clear (nie zapomnij!)
