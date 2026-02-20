# Obsek Plugin - Dziennik Rozwoju (DEVLOG)

> Chronologiczny log wszystkich zmian, decyzji i nowych funkcji.
> Kazdy wpis AI dodaje automatycznie po sesji.

---

## Format wpisu

```
## [DATA] - Krotki opis
**Sesja z:** [ktore AI / narzedzie]
**Co zrobiono:**
- punkt 1
- punkt 2
**Pliki zmienione:**
- `sciezka/do/pliku.js` - co zmieniono
**Decyzje podjete:**
- decyzja i dlaczego
**Nastepne kroki:**
- co robic dalej
```

---

## 2026-02-20 - Porzadki i system dokumentacji

**Sesja z:** Claude Code (Opus 4.6)

**Co zrobiono:**
- Przeglad calej struktury projektu
- Identyfikacja co dziala a co jest niepewne
- Stworzenie systemu dokumentacji:
  - `STATUS.md` - przenosny kontekst projektu (kopiuj do innych chatow)
  - `DEVLOG.md` - ten plik, dziennik zmian
  - Aktualizacja `CLAUDE.md` - realne MVP zamiast zyczen

**Stan projektu na start:**
- Baza: Smart Connections v4.1.7 (dziala)
- Chat z AI w Obsidianie (dziala)
- AI widzi notatki i tworzy nowe (dziala)
- System agentow, pamieci, uprawnien (istnieje w kodzie, nie zweryfikowane)
- Git zainicjowany, 1 commit, duzo niezapisanego kodu

**Decyzje podjete:**
- Traktujemy obecny kod jako wczesne MVP / fundament
- Nie zakladamy ze cokolwiek poza chatem dziala az nie zweryfikujemy
- Caly development bedzie vibe-codowany z AI
- Dokumentacja ma byc przenoszalna miedzy chatami

**Nastepne kroki:**
- Zweryfikowac co naprawde dziala z istniejacego kodu
- Zabezpieczyc prace na GitHubie (commit + push)
- Zdecydowac o pierwszym celu rozwoju

---

<!-- NOWE WPISY DODAWAJ PONIZEJ TEJ LINII -->

## 2026-02-20 - Dzien 1: Commit bazowy + naprawa builda

**Sesja z:** Claude Code (Sonnet 4.6)

**Co zrobiono:**
- Zrobiono porzadek z git: commitujemy caly kod ktory istnial ale nie byl w repo
- Wykluczone z repo: external-deps/ (59MB bibl.), jdhole-skills/, jdhole-mcp-servers/ (wlasne git repo)
- Zaktualizowany .gitignore
- PROBLEM ZNALEZIONY: projekt zostal przeniesiony z "Moj dysk" na Desktop, symlinki w node_modules byly zepsute
- NAPRAWIONE: package.json - zmiana sciezek z `file:../` na `file:./external-deps/`
- Usuniete nieistniejace zaleznosci: smart-chunks, smart-instruct-model
- npm install przebudowal symlinki, build dziala
- npm run build: dist/main.js 882kb w 158ms - SUKCES

**Pliki zmienione:**
- `.gitignore` - external-deps/, jdhole-*, dodane do ignorowanych
- `package.json` - naprawione sciezki zaleznosci
- `package-lock.json` - przebudowany po npm install
- 58 nowych plikow src/ i dokumentacja (commit 2)

**Co zostalo POTWIERDZONE:**
- Plugin buduje sie bez bledow (npm run build)
- Plugin kopiuje sie automatycznie do vaultu Obsidiana

**Co NIE ZOSTALO zweryfikowane (nastepny krok):**
- Czy plugin laduje sie w Obsidianie bez bledow
- Czy chat z AI dziala
- Czy system agentow dziala
- Czy MCP, pamiec, uprawnienia dzialaja

**WYNIK TESTOW (w tej samej sesji):**

Plugin odpalony w Obsidianie - doslownie po buildzie. Wynik:
- Plugin laduje sie: TAK
- Indeksuje vault: TAK
- Chat z Jaskierem: TAK (agent gada po polsku, widzi vault)
- Token counter: TAK (6627/100000 widoczne w UI)
- MCP vault_list: TAK (listuje foldery)
- MCP vault_read: TAK (czyta notatki)
- MCP vault_write: TAK (po zatwierdzeniu uprawnien)
- System uprawnien: TAK! (vault_write zablokowany domyslnie, X czerwony, user musi zatwierdzic)
- Notatka stworzona w vaultcie: TAK

Model uzywany: Claude Sonnet 4 (via API)

**Nastepne kroki:**
- Przetestowac pozostalych agentow (Iris, Dexter, Ezra, Silas, Lexie)
- Sprawdzic vault_search i vault_delete
- Przetestowac system pamieci (czy Jaskier pamieata pomiedzy sesjami)
- Sprawdzic Agent Sidebar i Agent Creator Modal
- Zdecydowac o pierwszym celu rozwoju
