#!/usr/bin/env node
/**
 * waliduj.cjs - walidator findings.json biegu audytu (schemat obok: findings.schema.json).
 * Użycie: node waliduj.cjs <findings.json> [--repo <ścieżka>]   (domyślnie repo = cwd)
 * Zero zależności npm. Exit 1 gdy są błędy, 0 gdy najwyżej ostrzeżenia.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const bledy = [], ostrzezenia = [];
const blad = (m) => bledy.push(m);
const ostrzez = (m) => ostrzezenia.push(m);

// ---------- argumenty ----------
let plikWe = null, repo = process.cwd();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--repo') { i++; if (argv[i]) repo = argv[i]; }
  else if (!plikWe) plikWe = argv[i];
}
if (!plikWe) { console.error('Użycie: node waliduj.cjs <findings.json> [--repo <ścieżka>]'); process.exit(2); }
let dane;
try { dane = JSON.parse(fs.readFileSync(plikWe, 'utf8')); }
catch (e) { console.error('BŁĄD: nie da się wczytać ani sparsować "' + plikWe + '": ' + e.message); process.exit(1); }

// ---------- enumy przepisane z sekcji 3.1 schematu ----------
const E = {
  karta: ['security', 'code-review', 'testy', 'bledy', 'dead-code', 'docs', 'wydajnosc', 'deps'],
  tryb: ['dzien', 'noc'],
  wykonanie: ['workflow', 'agent', 'codex-runner'],
  powod_stopu: ['zbieznosc', 'sufit_rund', 'sufit_budzetu', 'przerwanie'],
  statusKawalka: ['zbiezny', 'niezbiezny', 'pominiety'],
  statusZnanego: ['nadal', 'naprawione', 'nie_sprawdzono'],
  severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
  pewnosc: ['potwierdzone', 'prawdopodobne', 'niezweryfikowalne'],
  status: ['nowe', 'znane', 'obalone'],
  werdykt: ['POTWIERDZONE', 'OBALONE', 'NIEWERYFIKOWALNE'],
};

// ---------- pomocnicze ----------
function wymagane(obj, pola, gdzie) {
  const zly = (obj === null || typeof obj !== 'object');
  for (const p of pola) if (zly || obj[p] === undefined || obj[p] === null) blad(gdzie + ': brak wymaganego pola "' + p + '"');
}
function sprawdzEnum(wartosc, lista, gdzie, pole) {
  if (wartosc === undefined || wartosc === null) return;
  if (!lista.includes(wartosc)) blad(gdzie + ': pole "' + pole + '" ma wartość "' + wartosc + '", dozwolone: ' + lista.join(' | '));
}
function czyTablica(wartosc, gdzie, pole) {
  if (wartosc === undefined || wartosc === null) return false;
  if (!Array.isArray(wartosc)) { blad(gdzie + ': pole "' + pole + '" musi być tablicą'); return false; }
  return true;
}
function calkowita(wartosc, gdzie, pole) {
  if (wartosc !== undefined && wartosc !== null && !Number.isInteger(wartosc)) blad(gdzie + ': "' + pole + '" musi być liczbą całkowitą');
}

// ---------- bieg ----------
const bieg = dane.bieg;
if (!bieg || typeof bieg !== 'object' || Array.isArray(bieg)) {
  blad('korzeń: brak obiektu "bieg"');
} else {
  wymagane(bieg, ['id', 'karta', 'data', 'tryb', 'srodowisko', 'rundy', 'powod_stopu', 'kawalki'], 'bieg');
  sprawdzEnum(bieg.karta, E.karta, 'bieg', 'karta');
  sprawdzEnum(bieg.tryb, E.tryb, 'bieg', 'tryb');
  sprawdzEnum(bieg.powod_stopu, E.powod_stopu, 'bieg', 'powod_stopu');
  calkowita(bieg.rundy, 'bieg', 'rundy');
  calkowita(bieg.suche_rundy_na_koniec, 'bieg', 'suche_rundy_na_koniec');
  const sr = bieg.srodowisko;
  if (sr && typeof sr === 'object' && !Array.isArray(sr)) {
    wymagane(sr, ['os', 'node', 'head', 'branch', 'wykonanie'], 'bieg.srodowisko');
    sprawdzEnum(sr.wykonanie, E.wykonanie, 'bieg.srodowisko', 'wykonanie');
  } else if (sr !== undefined && sr !== null) blad('bieg: "srodowisko" musi być obiektem');
  if (czyTablica(bieg.kawalki, 'bieg', 'kawalki')) bieg.kawalki.forEach((k, i) => {
    const g = 'bieg.kawalki[' + i + ']';
    wymagane(k, ['id', 'nazwa', 'zakres', 'status'], g);
    sprawdzEnum(k && k.status, E.statusKawalka, g, 'status');
    if (k) czyTablica(k.zakres, g, 'zakres');
  });
  if (czyTablica(bieg.znane_status, 'bieg', 'znane_status')) bieg.znane_status.forEach((z, i) => {
    const g = 'bieg.znane_status[' + i + ']';
    wymagane(z, ['skrot', 'status'], g);
    sprawdzEnum(z && z.status, E.statusZnanego, g, 'status');
  });
  if (czyTablica(bieg.klastry, 'bieg', 'klastry')) {
    bieg.klastry.forEach((c, i) => wymagane(c, ['id', 'przyczyna', 'znaleziska'], 'bieg.klastry[' + i + ']'));
  }
}

// ---------- dowody: plik istnieje, zakres linii się mieści, cytat siedzi w zakresie ----------
const cacheLinii = {};
function liniePliku(rel) {
  if (cacheLinii[rel] !== undefined) return cacheLinii[rel];
  const pelna = path.resolve(repo, String(rel).split('\\').join('/'));  // separatory / i \ traktujemy tak samo
  let linie = null;
  try {
    if (fs.existsSync(pelna) && fs.statSync(pelna).isFile()) linie = fs.readFileSync(pelna, 'utf8').split(/\r?\n/);
  } catch (e) { linie = null; }
  cacheLinii[rel] = linie;
  return linie;
}
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

function sprawdzDowod(d, gdzie) {
  wymagane(d, ['plik', 'linie', 'cytat'], gdzie);
  if (!d || !d.plik || !d.linie || !d.cytat) return;
  if (!/^[0-9]+(-[0-9]+)?$/.test(String(d.linie))) {
    blad(gdzie + ': "linie" ma zły format ("' + d.linie + '"), oczekiwane N albo N-M'); return;
  }
  const linie = liniePliku(d.plik);
  if (linie === null) { blad(gdzie + ': plik "' + d.plik + '" nie istnieje w repo (' + repo + ')'); return; }
  const czesci = String(d.linie).split('-');
  const od = parseInt(czesci[0], 10);
  const doL = parseInt(czesci[1] !== undefined ? czesci[1] : czesci[0], 10);
  if (od < 1 || doL < od) { blad(gdzie + ': zakres linii "' + d.linie + '" jest bez sensu'); return; }
  if (doL > linie.length) {
    blad(gdzie + ': zakres "' + d.linie + '" wychodzi poza plik "' + d.plik + '" (' + linie.length + ' linii)'); return;
  }
  const cytat = norm(d.cytat);
  if (!cytat) { blad(gdzie + ': "cytat" jest pusty'); return; }
  const okno = norm(linie.slice(Math.max(0, od - 3), Math.min(linie.length, doL + 2)).join('\n'));
  if (okno.includes(cytat)) return;
  if (norm(linie.join('\n')).includes(cytat)) {
    ostrzez(gdzie + ': cytat jest w pliku "' + d.plik + '", ale poza zakresem ' + d.linie + ' (+/- 2 linie) - popraw numery linii');
  } else {
    blad(gdzie + ': cytatu nie ma nigdzie w pliku "' + d.plik + '" - dowód nie istnieje');
  }
}

// ---------- znaleziska ----------
const trybDzien = !bieg || bieg.tryb !== 'noc';
const widzianeId = {};
let nZgloszone = 0, nObalone = 0, nPotwierdzone = 0, nNiezweryfikowalne = 0;
if (!Array.isArray(dane.znaleziska)) {
  blad('korzeń: "znaleziska" musi być tablicą');
} else {
  nZgloszone = dane.znaleziska.length;
  dane.znaleziska.forEach((z, i) => {
    const gdzie = 'znaleziska[' + i + ']' + (z && z.id ? ' (' + z.id + ')' : '');
    wymagane(z, ['id', 'kawalek', 'tytul', 'twierdzenie', 'severity', 'pewnosc', 'status', 'dowod', 'scenariusz', 'obalanie'], gdzie);
    if (!z || typeof z !== 'object') return;
    if (z.id !== undefined && z.id !== null) {
      if (!/^AUD-[a-z-]+-[0-9]{3}$/.test(String(z.id))) blad(gdzie + ': "id" nie pasuje do wzorca AUD-{karta}-{NNN}');
      if (widzianeId[z.id] !== undefined) blad(gdzie + ': "id" powtarza się (pierwszy raz w znaleziska[' + widzianeId[z.id] + '])');
      else widzianeId[z.id] = i;
    }
    if (typeof z.tytul === 'string' && z.tytul.length > 120) blad(gdzie + ': "tytul" dłuższy niż 120 znaków');
    sprawdzEnum(z.severity, E.severity, gdzie, 'severity');
    sprawdzEnum(z.pewnosc, E.pewnosc, gdzie, 'pewnosc');
    sprawdzEnum(z.status, E.status, gdzie, 'status');
    calkowita(z.runda, gdzie, 'runda');
    if (czyTablica(z.dowod, gdzie, 'dowod')) {
      if (z.dowod.length < 1) blad(gdzie + ': "dowod" musi mieć co najmniej 1 wpis');
      z.dowod.forEach((d, j) => sprawdzDowod(d, gdzie + '.dowod[' + j + ']'));
    }
    let potwierdzenia = 0;
    if (czyTablica(z.obalanie, gdzie, 'obalanie')) z.obalanie.forEach((o, j) => {
      const g2 = gdzie + '.obalanie[' + j + ']';
      wymagane(o, ['werdykt', 'uzasadnienie'], g2);
      sprawdzEnum(o && o.werdykt, E.werdykt, g2, 'werdykt');
      if (o && o.werdykt === 'POTWIERDZONE') potwierdzenia++;
    });
    // Reguła obalania: nic nie wchodzi do raportu jako potwierdzone bez przejścia przez obalacza.
    if (z.status === 'nowe' && z.pewnosc === 'potwierdzone') {
      const wymaganych = (trybDzien && (z.severity === 'HIGH' || z.severity === 'CRITICAL')) ? 2 : 1;
      if (potwierdzenia < wymaganych) {
        blad(gdzie + ': status "nowe" + pewnosc "potwierdzone" wymaga ' + wymaganych +
          (wymaganych === 1 ? ' werdyktu ' : ' werdyktów ') + 'POTWIERDZONE w "obalanie" (jest ' + potwierdzenia + ')');
      }
    }
    if (z.status === 'obalone') nObalone++;
    else if (z.pewnosc === 'potwierdzone') nPotwierdzone++;
    else if (z.pewnosc === 'niezweryfikowalne') nNiezweryfikowalne++;
  });
}

// ---------- liczby biegu (sprawdzane tylko te podane) ----------
if (bieg && bieg.liczby && typeof bieg.liczby === 'object') {
  const policzone = { zgloszone: nZgloszone, obalone: nObalone, potwierdzone: nPotwierdzone, niezweryfikowalne: nNiezweryfikowalne };
  for (const klucz of Object.keys(policzone)) {
    const podane = bieg.liczby[klucz];
    if (podane !== undefined && podane !== policzone[klucz]) {
      blad('bieg.liczby: "' + klucz + '" = ' + podane + ', a z tablicy znalezisk wychodzi ' + policzone[klucz]);
    }
  }
}

// ---------- podsumowanie ----------
for (const o of ostrzezenia) console.log('OSTRZEŻENIE  ' + o);
for (const b of bledy) console.log('BŁĄD         ' + b);
console.log('');
console.log('Plik: ' + plikWe + '   repo: ' + repo);
console.log('Znaleziska: ' + nZgloszone + ' (obalone ' + nObalone + ', potwierdzone ' + nPotwierdzone + ', niezweryfikowalne ' + nNiezweryfikowalne + ')');
console.log(bledy.length === 0
  ? 'WYNIK: OK - zero błędów, ostrzeżeń: ' + ostrzezenia.length
  : 'WYNIK: ODRZUCONE - błędów: ' + bledy.length + ', ostrzeżeń: ' + ostrzezenia.length);
process.exit(bledy.length === 0 ? 0 : 1);
