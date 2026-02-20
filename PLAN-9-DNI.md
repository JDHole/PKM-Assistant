# Plan 9 dni - Obsek Plugin

> 9 dni x 10h = 90 godzin roboczych
> Cel: Stabilny, publiczny plugin z solidnym chatem AI w Obsidianie
> Metoda: Vibe-coding z Claude Code

---

## Filozofia planu

1. **Najpierw UZYWAJ, potem BUDUJ** - od dnia 2 zaczynasz uzywac pluginu na co dzien
2. **Solidny chat > fancy agenci** - lepiej jeden swietny chat niz 6 poldzialajaych agentow
3. **Publiczny plugin** - kazda funkcja musi dzialac dla obcego czlowieka, nie tylko dla Ciebie
4. **Codziennie cos dziala** - na koniec kazdego dnia masz dzialajaca wersje

---

## DZIEN 1 - Fundamenty i porzadki

**Cel dnia:** Czysta baza, git, wiesz dokladnie na czym stoisz.

### Rano (4h)
- [ ] Zcommitowac caly obecny kod na GitHub (zabezpieczenie)
- [ ] Przetestowac plugin w Obsidianie - co dokladnie dziala?
  - Czy chat odpowiada?
  - Czy widzi notatki?
  - Czy tworzy notatki?
  - Czy semantic search dziala?
- [ ] Spisac wyniki testow w STATUS.md

### Po poludniu (6h)
- [ ] Przejrzec stary kod agentow/pamieci - co mozna wykorzystac, co wyrzucic
- [ ] Stworzyc czysty branch: `feature/obsek-v1`
- [ ] Uporzdkowac foldery (archiwum starych planow, usuniecie martwego kodu)
- [ ] Zaktualizowac .gitignore i DEVLOG.md

**Efekt dnia:** Wiesz dokladnie co masz. Kod jest bezpieczny na GitHubie.

---

## DZIEN 2 - Rebranding: To jest OBSEK, nie Smart Connections

**Cel dnia:** Plugin wyglada jak Twoj produkt.

### Rano (5h)
- [ ] Zmiana nazwy wszedzie w UI: "Smart Connections" -> "Obsek"
- [ ] Nowe manifest.json (id, nazwa, autor, opis)
- [ ] Nowa ikona pluginu (prosta, rozpoznawalna)
- [ ] Zmiana tekstow w ustawieniach

### Po poludniu (5h)
- [ ] Wlasna strona ustawien (nie domyslna Smart Connections)
- [ ] Wlasny styl CSS (kolory, czcionki - prosta zmiana)
- [ ] Build + test w Obsidianie
- [ ] **ZACZNIJ UZYWAC PLUGINU** - zainstaluj w swoim vaulcie na stale

**Efekt dnia:** Otwierasz Obsidian i widzisz "Obsek" - Twoj plugin.

---

## DZIEN 3 - Chat v2: Solidny fundament

**Cel dnia:** Chat dziala niezawodnie i jest przyjemny w uzyciu.

### Rano (5h)
- [ ] Przeglad obecnego chat view - co trzeba poprawic
- [ ] Poprawki UX: ladowanie, bledy, puste stany
- [ ] Wyswietlanie ktorego modelu/providera uzywa
- [ ] Obsluga bledow (brak klucza API, timeout, limit)

### Po poludniu (5h)
- [ ] Markdown rendering w odpowiedziach
- [ ] Kopiowanie odpowiedzi jednym kliknieciem
- [ ] Historia chatow (przeglad poprzednich rozmow)
- [ ] Build + test + dogfooding (sam uzywaj!)

**Efekt dnia:** Chat jest przyjemny, czytelny, obsluguje bledy elegancko.

---

## DZIEN 4 - Kontekst notatek: AI ktore NAPRAWDE zna Twoje notatki

**Cel dnia:** AI daje odpowiedzi oparte na Twoich notatkach, nie zmysla.

### Rano (5h)
- [ ] Weryfikacja: czy RAG/embeddingi ze Smart Connections dzialaja?
- [ ] Testowanie: czy AI cytuje z notatek czy zmysla?
- [ ] Poprawki context retrieval jesli trzeba
- [ ] Wskaznik "z jakich notatek korzystam" w odpowiedzi

### Po poludniu (5h)
- [ ] Mozliwosc wrzucenia notatki do kontekstu recznie (@notatka)
- [ ] Przegladanie zrodel - klikalne linki do notatek w odpowiedzi
- [ ] Limit kontekstu i wskaznik ile miejsca zostalo
- [ ] Build + test

**Efekt dnia:** Pytasz AI o cos, AI odpowiada NA PODSTAWIE Twoich notatek i pokazuje skad to wie.

---

## DZIEN 5 - Akcje: AI ktore ROBI rzeczy w vaulcie

**Cel dnia:** AI nie tylko gada, ale tez dziala.

### Rano (5h)
- [ ] Tworzenie notatek z chatu ("stworz notatke z tego co powiedziales")
- [ ] Edycja istniejacych notatek ("dodaj to do mojej notatki X")
- [ ] Szukanie notatek ("znajdz wszystkie notatki o zdrowiu")

### Po poludniu (5h)
- [ ] Podsumowywanie notatek ("podsumuj mi notatki z tego tygodnia")
- [ ] Przyciski szybkich akcji pod odpowiedziami AI
- [ ] System potwierdzenia ("AI chce edytowac X - pozwalasz?")
- [ ] Build + test

**Efekt dnia:** Mowisz AI co ma zrobic i AI to robi (za Twoja zgoda).

---

## DZIEN 6 - Pierwszy Agent: Proof of Concept

**Cel dnia:** System ktory pozwala miec rozne "osobowosci" AI.

### Rano (5h)
- [ ] Prosty system agentow: agent = nazwa + prompt systemowy + ikona
- [ ] Plik konfiguracyjny agenta (YAML lub JSON)
- [ ] Przelaczanie miedzy agentami w chacie
- [ ] Jeden gotowy agent testowy (np. Jaskier - organizator)

### Po poludniu (5h)
- [ ] Agent pamięta swoj kontekst (oddzielna historia od innych)
- [ ] UI: widac z kim rozmawiasz (awatar, imie)
- [ ] Drugi agent testowy (np. Dexter - techniczny)
- [ ] Build + test

**Efekt dnia:** Mozesz rozmawiac z 2 roznymi "osobami" AI, kazda ma swoj styl.

---

## DZIEN 7 - Ustawienia i konfiguracja dla uzytkownika

**Cel dnia:** Kazdy uzytkownik moze skonfigurowac plugin pod siebie.

### Rano (5h)
- [ ] Strona ustawien: wybor providera AI (Anthropic/OpenAI/Ollama/OpenRouter)
- [ ] Konfiguracja klucza API z poziomu ustawien (nie .env)
- [ ] Wybor domyslnego modelu
- [ ] Test z roznymi providerami

### Po poludniu (5h)
- [ ] Mozliwosc tworzenia wlasnych agentow (prosty formularz)
- [ ] Import/export agentow (dzielenie sie z innymi)
- [ ] Ustawienia per-agent (ktory model, temperatura)
- [ ] Build + test

**Efekt dnia:** Uzytkownik instaluje plugin, wpisuje klucz API, wybiera model - i dziala.

---

## DZIEN 8 - Polerowanie UI + onboarding

**Cel dnia:** Plugin wyglada profesjonalnie, nowy uzytkownik wie co robic.

### Rano (5h)
- [ ] Onboarding flow: co widzi uzytkownik gdy pierwszy raz wlaczy plugin
- [ ] Ladny sidebar z lista agentow
- [ ] Animacje, ladowanie, przejscia
- [ ] Responsive design (male/duze okna)

### Po poludniu (5h)
- [ ] Empty states (co widac gdy nie ma chatow, agentow itd.)
- [ ] Tooltips i podpowiedzi
- [ ] Ikony i branding finalny
- [ ] Dostepnosc (keyboard navigation, kontrast)

**Efekt dnia:** Plugin wyglada jak gotowy produkt, nie jak prototyp.

---

## DZIEN 9 - Stabilizacja + przygotowanie do publikacji

**Cel dnia:** Wszystko dziala, jest przetestowane, gotowe do pokazania swiatu.

### Rano (5h)
- [ ] Testy end-to-end: instalacja od zera, konfiguracja, uzycie
- [ ] Naprawienie wszystkich znalezionych bugow
- [ ] Performance: czy plugin nie spowalnia Obsidiana?
- [ ] Memory leaks: czy dluge uzycie nie zjada RAM-u?

### Po poludniu (5h)
- [ ] README.md - opis dla publicznosci
- [ ] Screenshots/GIFy do README
- [ ] Przygotowanie do Obsidian Community Plugins (wymagania)
- [ ] Finalna wersja, tag, release na GitHubie
- [ ] Celebracja! 🎉

**Efekt dnia:** Masz gotowa wersje 1.0 do opublikowania.

---

## Codzienne rytualy

**Rano (15 min):**
1. Git pull (na wypadek zmian)
2. Przeczytaj DEVLOG.md - co robiles wczoraj
3. Zaplanuj dzien

**Wieczorem (15 min):**
1. Git commit + push (zabezpiecz prace!)
2. Zaktualizuj DEVLOG.md
3. Zaktualizuj STATUS.md jesli cos sie zmienilo
4. Zanotuj co nie poszlo (do naprawienia jutro)

---

## Zasady 9 dni

1. **Kazdy dzien konczy sie dzialajaca wersja** - nie zostawiaj pollamanego kodu
2. **Commituj minimum 3x dziennie** - rano, w poludnie, wieczorem
3. **Jesli cos nie dziala po 2h - zmien podejscie** - nie walcz z kodem
4. **Uzywaj pluginu codziennie od dnia 2** - bedziesz widzial co naprawic
5. **Pisz w DEVLOG co robisz** - przyszly Ty bedzie wdzieczny

---

## Czego ten plan NIE zawiera (swiadomie)

- **Miniony/male modele** - za wczesnie, najpierw solidna baza
- **Zaawansowana hierarchia agentow** - v2, nie v1
- **MCP serwery** - dodamy pozniej gdy bedzie potrzeba
- **Komercjalizacja** - najpierw darmowy, dobry plugin

---

*Plan stworzony: 2026-02-20*
*Nastepna rewizja: po dniu 3 (polowa pierwszego tygodnia)*
