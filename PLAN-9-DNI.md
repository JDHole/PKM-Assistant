# Plan 9 dni - Obsek Plugin

> 9 dni x ~10h = ~90 godzin roboczych
> Cel: Stabilny plugin z agentami ktorzy PAMIETAJA i maja OSOBOWOSC
> Metoda: Vibe-coding z Claude Code
> Zaktualizowano: 2026-02-20 (na podstawie testow z dnia 1)

---

## Filozofia planu

1. **Najpierw UZYWAJ, potem BUDUJ** - od dnia 2 uzywasz pluginu na co dzien
2. **Pamiec + persona > fancy features** - lepiej 1 agent ktory pamieta niz 6 bez pamieci
3. **Publiczny plugin** - kazda funkcja musi dzialac dla obcego czlowieka
4. **Codziennie cos dziala** - na koniec kazdego dnia masz dzialajaca wersje

---

## DZIEN 1 - Fundamenty i porzadki ✅ ZROBIONE

**Co zrobiono:**
- [x] Commit calego kodu na GitHub (4 commity)
- [x] Naprawa builda (zepsute symlinki po przeniesieniu projektu)
- [x] Test pluginu w Obsidianie - wyniki lepsze niz oczekiwane!
- [x] Porzadek w dokumentacji (6 planow -> 1 WIZJA.md)
- [x] STATUS.md i DEVLOG.md zaktualizowane

**Co odkrylismy (dzialajace):**
- Chat z Jaskierem ✅
- MCP tools (vault_list, vault_read, vault_write) ✅
- System uprawnien (blokuje zapis!) ✅
- Token counter ✅
- Build + auto-kopia do vaultu ✅

**Co NIE dziala / nie zweryfikowane:**
- Pamiec miedzy sesjami (KLUCZOWE)
- Pozostali agenci (Iris, Dexter, Ezra, Silas, Lexie)
- vault_search, vault_delete
- Agent Sidebar, Agent Creator
- Workflow system

---

## DZIEN 2 - Weryfikacja pamieci i agentow

**Cel dnia:** Wiedziec DOKLADNIE jak dziala (lub nie) pamiec i agenci.

### Rano (5h)
- [ ] Przetestuj system pamieci Jaskiera:
  - Zamknij sesje, otworz nowa - czy Jaskier pamieata?
  - Sprawdz `.pkm-assistant/` - czy sa zapisane sesje?
  - Sprawdz RollingWindow.js - jak dziala okno kontekstu?
  - Sprawdz Summarizer.js - czy podsumowania sie tworza?
- [ ] Przetestuj przelaczanie agentow:
  - Czy da sie przejsc z Jaskiera na Iris/Dextera?
  - Jak wyglada UI przelaczania?
  - Czy kazdy agent ma oddzielna historie?

### Po poludniu (5h)
- [ ] Przetestuj vault_search i vault_delete
- [ ] Sprawdz Agent Sidebar - czy sie otwiera?
- [ ] Sprawdz Agent Creator Modal - czy mozna tworzyc agentow?
- [ ] Spisz WSZYSTKO co dziala i co nie w STATUS.md
- [ ] **ZACZNIJ UZYWAC PLUGINU** na co dzien

**Efekt dnia:** Wiesz dokladnie co trzeba naprawic/zbudowac. Mapa "dziala/nie dziala" jest kompletna.

---

## DZIEN 3 - Pamiec: Agent ktory PAMIETA

**Cel dnia:** Jaskier pamieta o czym rozmawialiscie wczoraj.

### Rano (5h)
- [ ] Jesli pamiec NIE DZIALA - napraw/zbuduj:
  - Automatyczny zapis sesji do `.pkm-assistant/sessions/`
  - Ladowanie ostatniej sesji przy starcie
  - Podsumowanie sesji przy zamknieciu
- [ ] Jesli pamiec DZIALA ALE SLABO - popraw:
  - Sprawdz jakosc podsumowant
  - Dostosuj trigger (kiedy robi podsumowanie)
  - Dodaj "kluczowe fakty" do kontekstu

### Po poludniu (5h)
- [ ] Test end-to-end pamieci:
  1. Powiedz Jaskierowi cos osobistego
  2. Zamknij sesje
  3. Otworz nowa - czy pamieta?
- [ ] Dopieszcz format sesji (czytelny markdown)
- [ ] Build + test + dogfooding

**Efekt dnia:** Jaskier pamieta miedzy sesjami. To GAME CHANGER.

---

## DZIEN 4 - Persona: Agent ktory MA CHARAKTER

**Cel dnia:** Jaskier zachowuje sie jak Jaskier, nie jak generyczny chatbot.

### Rano (5h)
- [ ] Przejrzyj system prompt Jaskiera - czy jest wystarczajacy?
- [ ] Popraw/rozbuduj osobowosc:
  - Styl komunikacji (po polsku, przyjacielski, ale nie nachalny)
  - Specjalizacje (organizacja, codzienne sprawy)
  - "Pamiec osobowosciowa" - agent wie KIM JEST user (imie, preferencje)
- [ ] Upewnij sie ze persona PRZETRWA miedzy sesjami (nie resetuje sie)

### Po poludniu (5h)
- [ ] Dodaj drugia agenta (Dexter lub Iris) z INNA osobowoscia
- [ ] Test: czy przelaczanie agentow zachowuje ich osobowosci?
- [ ] Kazdy agent ma swoj emoji, styl, specjalizacje
- [ ] Build + test

**Efekt dnia:** Rozmawiasz z 2 roznymi "osobami" AI - kazda ma charakter.

---

## DZIEN 5 - Rebranding: To jest OBSEK

**Cel dnia:** Plugin wyglada jak Twoj produkt, nie jak fork.

### Rano (5h)
- [ ] Zmiana nazwy wszedzie: "Smart Connections" -> "Obsek"
- [ ] Nowe manifest.json (id: obsek, nazwa, autor JDHole)
- [ ] Nowa ikona pluginu
- [ ] Zmiana tekstow w ustawieniach

### Po poludniu (5h)
- [ ] Wlasne kolory/styl CSS
- [ ] Ustawienia: API key z poziomu ustawien (nie .env)
- [ ] Wybor modelu AI z poziomu ustawien
- [ ] Build + test

**Efekt dnia:** Otwierasz Obsidian i widzisz "Obsek" - Twoj plugin.

---

## DZIEN 6 - Chat UX: Przyjemna rozmowa

**Cel dnia:** Chat jest czytelny, elegancki, obsluguje bledy.

### Rano (5h)
- [ ] Przeglad obecnego chatu - co trzeba poprawic
- [ ] Obsluga bledow: brak klucza API, timeout, limit tokenow
- [ ] Wyswietlanie ktory model/provider jest uzywany
- [ ] Lepsze ladowanie i puste stany ("brak chatow")

### Po poludniu (5h)
- [ ] Poprawki markdown rendering
- [ ] Kopiowanie odpowiedzi jednym kliknieciem
- [ ] Historia chatow (lista poprzednich rozmow)
- [ ] Build + test + dogfooding

**Efekt dnia:** Chat jest przyjemny, czytelny, elegancko obsluguje problemy.

---

## DZIEN 7 - Kontekst notatek: AI ktore ZNA Twoje notatki

**Cel dnia:** Gdy pytasz AI o cos, odpowiada na PODSTAWIE Twoich notatek.

### Rano (5h)
- [ ] Weryfikacja RAG/embeddingów - czy AI cytuje z notatek?
- [ ] Poprawki retrieval jesli trzeba
- [ ] Wskaznik "z jakich notatek korzystam" w odpowiedzi

### Po poludniu (5h)
- [ ] Klikalne linki do notatek w odpowiedzi
- [ ] Limit kontekstu i wskaznik ile miejsca zostalo
- [ ] Mozliwosc dodania notatki do kontekstu recznie
- [ ] Build + test

**Efekt dnia:** AI odpowiada na podstawie TWOICH notatek i pokazuje skad to wie.

---

## DZIEN 8 - Ustawienia i onboarding

**Cel dnia:** Nowy uzytkownik moze ustawic plugin w 2 minuty.

### Rano (5h)
- [ ] Onboarding flow: co widzi nowy user
- [ ] Strona ustawien: provider, API key, model, agent
- [ ] Test z roznymi providerami (Claude, GPT, Ollama)
- [ ] Formularz tworzenia wlasnych agentow (jesli Agent Creator nie dziala)

### Po poludniu (5h)
- [ ] Ladny sidebar z lista agentow
- [ ] Tooltips i podpowiedzi
- [ ] Responsive design (male/duze okna)
- [ ] Build + test

**Efekt dnia:** Ktos instaluje plugin, wpisuje klucz API i w 2 minuty rozmawia z AI.

---

## DZIEN 9 - Stabilizacja + publikacja

**Cel dnia:** Wszystko dziala, gotowe do pokazania swiatu.

### Rano (5h)
- [ ] Test end-to-end: instalacja od zera
- [ ] Naprawienie bugow
- [ ] Performance: czy plugin nie spowalnia Obsidiana?
- [ ] Memory leaks: czy dlugie uzycie nie zjada RAM?

### Po poludniu (5h)
- [ ] README.md - opis dla publicznosci
- [ ] Screenshots do README
- [ ] Przygotowanie do Community Plugins
- [ ] Tag, release na GitHubie
- [ ] Push na GitHub

**Efekt dnia:** Masz gotowa wersje 1.0!

---

## Codzienne rytualy

**Rano (15 min):**
1. Przeczytaj DEVLOG.md - co robilem wczoraj
2. Powiedz Claude: "czesc, dzis robimy [X], przeczytaj DEVLOG.md"
3. git pull

**Co 2-3 godziny:**
1. Commit (zapisz postep)
2. Build + test w Obsidianie

**Wieczor (15 min):**
1. Commit + push
2. Zaktualizuj DEVLOG.md
3. Zaktualizuj STATUS.md jesli cos sie zmienilo

---

## Zasady

1. **Kazdy dzien konczy sie dzialajaca wersja** - nie zostawiaj pollamanego kodu
2. **Commituj minimum 3x dziennie** - rano, w poludnie, wieczorem
3. **Jesli cos nie dziala po 2h - zmien podejscie**
4. **Uzywaj pluginu codziennie od dnia 2**
5. **Pisz w DEVLOG co robisz**

---

## Czego ten plan NIE zawiera (swiadomie)

- **Miniony/male modele** - za wczesnie, najpierw solidna baza
- **Zaawansowana hierarchia agentow** - v2, nie v1
- **Web search** - nice to have, nie must have
- **Komercjalizacja** - najpierw darmowy, dobry plugin

---

*Plan stworzony: 2026-02-20*
*Zaktualizowany: 2026-02-20 (po testach dnia 1)*
*Kolejna rewizja: po dniu 3*
