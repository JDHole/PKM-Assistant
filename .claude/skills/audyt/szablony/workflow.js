export const meta = {
  name: 'audyt-gauntlet',
  description: 'Pętla gauntlet audytu pluginu PKM Assistant: szukacze per kawałek, obalacze per świeże znalezisko, runda za rundą do zbieżności albo sufitu rund.',
  phases: [
    { title: 'Szukanie', detail: 'Szukacze ze świeżym kontekstem przeglądają kawałki repo i zgłaszają znaleziska z dowodem plik:linia.' },
    { title: 'Obalanie', detail: 'Obalacze próbują obalić każde świeże znalezisko; potwierdzone przechodzi tylko przy zgodzie wszystkich.' }
  ]
};

// ---------- kontrakty wyjść agentów (sekcje 3.2 i 3.3 spec) ----------
const SEVERITY = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const PEWNOSC = ['potwierdzone', 'prawdopodobne', 'niezweryfikowalne'];
const DOWOD = {
  type: 'array', minItems: 1,
  items: {
    type: 'object', required: ['plik', 'linie', 'cytat'],
    properties: { plik: { type: 'string' }, linie: { type: 'string' }, cytat: { type: 'string' } }
  }
};
const FINDER_OUT = {
  type: 'object',
  required: ['znaleziska', 'co_dziala_dobrze', 'najwieksza_luka', 'sprawdzone'],
  properties: {
    znaleziska: {
      type: 'array',
      items: {
        type: 'object',
        required: ['tytul', 'twierdzenie', 'severity', 'pewnosc', 'dowod', 'scenariusz', 'reprodukcja'],
        properties: {
          tytul: { type: 'string' }, twierdzenie: { type: 'string' }, scenariusz: { type: 'string' },
          severity: { type: 'string', enum: SEVERITY }, pewnosc: { type: 'string', enum: PEWNOSC },
          dowod: DOWOD, granica: { type: 'string' },
          reprodukcja: { type: 'string' }, kierunek: { type: 'string' }
        }
      }
    },
    co_dziala_dobrze: { type: 'array', items: { type: 'string' } },
    najwieksza_luka: { type: 'string' },
    sprawdzone: { type: 'array', items: { type: 'string' } }
  }
};
const REFUTER_OUT = {
  type: 'object',
  required: ['werdykt', 'uzasadnienie', 'co_sprawdzilem'],
  properties: {
    werdykt: { type: 'string', enum: ['POTWIERDZONE', 'OBALONE', 'NIEWERYFIKOWALNE'] },
    uzasadnienie: { type: 'string' }, korekta_severity: { type: 'string' },
    co_sprawdzilem: { type: 'array', items: { type: 'string' } }
  }
};

// ---------- ustawienia biegu ----------
const kawalki = args.kawalki || [];
const modele = args.modele || {};
const maxRund = args.maxRund || 4;
const maxSuche = args.maxSuche || 2;
const obalaczyHigh = args.obalaczyHigh || 1;
const scratch = args.scratch || (args.repo + '/.claude/worktrees');

// ---------- prompty (workflow nie czyta plików; agent czyta szablon i kartę sam) ----------
function promptSzukacza(kawalek, fokus, runda) {
  return 'Przeczytaj szablon ' + args.szablonSzukacz + ' i kartę ' + args.kartaPath + '.\n' +
    'Wartości placeholderów:\n' +
    'KAWALEK=' + JSON.stringify(kawalek) + '\n' +
    'POPRZECZKA=' + args.poprzeczka + '\n' +
    'ZNANE=' + JSON.stringify(args.znane || []) + '\n' +
    'FOCUS=' + fokus + '\n' +
    'RUNDA=' + runda + '\n' +
    'REPO=' + args.repo + '\n' +
    'SCRATCH=' + scratch + '\n' +
    'Odpowiedz wyłącznie obiektem wg schematu.';
}
// Obalacz nie widzi rozumowania szukacza: idą tylko twierdzenie, dowód i skutek.
function bezNarracji(z) {
  return {
    tytul: z.tytul, twierdzenie: z.twierdzenie, severity: z.severity, pewnosc: z.pewnosc,
    dowod: z.dowod, scenariusz: z.scenariusz, granica: z.granica, reprodukcja: z.reprodukcja
  };
}
function promptObalacza(z) {
  return 'Przeczytaj szablon ' + args.szablonObalacz + ' i kartę ' + args.kartaPath + '.\n' +
    'Wartości placeholderów:\n' +
    'ZNALEZISKO=' + JSON.stringify(bezNarracji(z)) + '\n' +
    'NIE_FLAGOWAC=' + (args.nieFlagowac || '') + '\n' +
    'POPRZECZKA=' + args.poprzeczka + '\n' +
    'REPO=' + args.repo + '\n' +
    'SCRATCH=' + scratch + '\n' +
    'Odpowiedz wyłącznie obiektem wg schematu.';
}
function zadanieSzukacza(k, fokus, runda) {
  return () => agent(promptSzukacza(k, fokus, runda),
    { label: 'szukacz:' + k.id + ':r' + runda, phase: 'Szukanie', schema: FINDER_OUT, model: (runda > 1 && modele.szukacz2) ? modele.szukacz2 : modele.szukacz });
}
function zadanieObalacza(z, etykieta, model) {
  return () => agent(promptObalacza(z),
    { label: etykieta, phase: 'Obalanie', schema: REFUTER_OUT, model: model });
}

// Klucz dedupu. Obejmuje TAKŻE obalone - inaczej ten sam trop wraca co rundę i pętla nie zbiega.
function klucz(z, kawalekId) {
  const d = (z.dowod && z.dowod[0]) || {};
  return kawalekId + '|' + (d.plik || '?') + '|' + (d.linie || '?');
}
function polaczWerdykty(wpisy) {
  if (wpisy.length === 0) return 'BRAK';
  let potw = 0, obal = 0;
  for (const w of wpisy) { if (w.werdykt === 'POTWIERDZONE') potw++; else if (w.werdykt === 'OBALONE') obal++; }
  if (potw > 0 && obal > 0) return 'SPOR';
  if (potw === wpisy.length) return 'POTWIERDZONE';
  if (obal > 0) return 'OBALONE';
  return 'NIEWERYFIKOWALNE';
}

// ---------- stan pętli ----------
const seen = {};
const wyniki = [], focus = {}, statusKawalka = {}, bezNowych = {}, coDziala = {};
let runda = 0, suche = 0, agentow = 0, przerwane = false;
for (const k of kawalki) { focus[k.id] = 'cały zakres'; statusKawalka[k.id] = 'niezbiezny'; bezNowych[k.id] = 0; }
function saNiezbiezne() { return kawalki.some((k) => statusKawalka[k.id] === 'niezbiezny'); }

while (suche < maxSuche && runda < maxRund && saNiezbiezne()) {
  runda++;
  const aktywne = kawalki.filter((k) => statusKawalka[k.id] === 'niezbiezny');

  phase('Szukanie');
  const odpSzukaczy = await parallel(aktywne.map((k) => zadanieSzukacza(k, focus[k.id], runda)));
  agentow += aktywne.length;
  // Padnięty szukacz (null) nie może udawać "nic nie znalazłem" - lider ma to widzieć w logu.
  const padli = aktywne.filter((k, i) => !odpSzukaczy[i]).map((k) => k.id);
  if (padli.length > 0) log('runda ' + runda + ': szukacze bez wyniku (pad agenta): ' + padli.join(', '));
  // Wszyscy szukacze padli (np. limit sesji) - to NIE jest sucha runda, tylko przerwanie.
  // Lekcja z biegu 2026-08-22_security: runda 4 padła w całości i udawała zbieżność.
  if (padli.length === aktywne.length) { przerwane = true; runda--; log('runda ' + (runda + 1) + ': wszyscy szukacze padli - przerywam bieg, nie liczę jako suchej'); break; }

  const swieze = [];
  for (let i = 0; i < aktywne.length; i++) {
    const k = aktywne[i];
    const o = odpSzukaczy[i];
    if (!o) continue;
    if (o.najwieksza_luka) focus[k.id] = o.najwieksza_luka;
    for (const tekst of (o.co_dziala_dobrze || [])) coDziala[tekst] = true;
    for (const z of (o.znaleziska || [])) {
      const kl = klucz(z, k.id);
      if (seen[kl]) continue;
      seen[kl] = true;
      z.kawalek = k.id;
      z.runda = runda;
      swieze.push(z);
    }
  }

  const zadania = [];
  const opisy = [];
  for (let i = 0; i < swieze.length; i++) {
    const z = swieze[i];
    const wysokie = (z.severity === 'HIGH' || z.severity === 'CRITICAL');
    const niskie = (z.severity === 'LOW' || z.severity === 'INFO');
    const ilu = wysokie ? obalaczyHigh : 1;
    for (let j = 0; j < ilu; j++) {
      // Tryb oszczędny (2026-08-22): drugi obalacz HIGH i obalacz LOW/INFO idą tańszym modelem (modele.obalacz2), MEDIUM pierwszym.
      const model = (j === 0 && !niskie) ? modele.obalacz : (modele.obalacz2 || modele.obalacz);
      opisy.push({ idx: i, model: model });
      zadania.push(zadanieObalacza(z, 'obalacz:' + z.kawalek + ':z' + (i + 1) + ':o' + (j + 1), model));
    }
  }
  phase('Obalanie');
  const odpObalaczy = zadania.length > 0 ? await parallel(zadania) : [];
  agentow += zadania.length;

  const wpisyPer = swieze.map(() => []);
  for (let i = 0; i < odpObalaczy.length; i++) {
    const o = odpObalaczy[i];
    if (!o || !o.werdykt) continue;
    const wpis = { werdykt: o.werdykt, uzasadnienie: o.uzasadnienie || '', model: opisy[i].model };
    if (o.korekta_severity) wpis.korekta_severity = o.korekta_severity;
    wpisyPer[opisy[i].idx].push(wpis);
  }

  const nowePotw = {};
  for (const k of aktywne) nowePotw[k.id] = 0;
  let lacznieNowe = 0, lacznieObalone = 0;
  for (let i = 0; i < swieze.length; i++) {
    const z = swieze[i];
    const wpisy = wpisyPer[i];
    const agg = polaczWerdykty(wpisy);
    if (agg === 'POTWIERDZONE') {
      z.status = 'nowe';
      z.pewnosc = 'potwierdzone';
      nowePotw[z.kawalek]++;
      lacznieNowe++;
    } else if (agg === 'OBALONE') {
      z.status = 'obalone';
      lacznieObalone++;
    } else {
      // Spór albo brak werdyktu: znalezisko zostaje na stole, ale bez pieczątki. Rozstrzyga lider.
      z.status = 'nowe';
      z.pewnosc = 'niezweryfikowalne';
      const powod = (agg === 'SPOR' ? 'Spór obalaczy' : 'Obalacz nie zwrócił wyniku') +
        ' - do rozstrzygnięcia przez lidera.';
      wpisy.push({ werdykt: 'NIEWERYFIKOWALNE', uzasadnienie: powod, model: 'workflow' });
    }
    z.obalanie = wpisy;
    wyniki.push(z);
  }

  for (const k of aktywne) {
    bezNowych[k.id] = nowePotw[k.id] > 0 ? 0 : bezNowych[k.id] + 1;
    if (bezNowych[k.id] >= 2) statusKawalka[k.id] = 'zbiezny';
  }
  suche = lacznieNowe === 0 ? suche + 1 : 0;
  log('runda ' + runda + ': zgłoszone ' + swieze.length + ', obalone ' + lacznieObalone +
    ', potwierdzone ' + lacznieNowe + ', suche ' + suche + '/' + maxSuche);
}

const powodStopu = przerwane ? 'przerwanie' : (!saNiezbiezne() || suche >= maxSuche) ? 'zbieznosc' : 'sufit_rund';
log('stop: ' + powodStopu + ' po ' + runda + ' rundach, agentów: ' + agentow);

return {
  znaleziska: wyniki,
  kawalki: kawalki.map((k) => ({ id: k.id, status: statusKawalka[k.id], najwieksza_luka: focus[k.id] })),
  rundy: runda,
  suche_rundy_na_koniec: suche,
  powod_stopu: powodStopu,
  co_dziala_dobrze: Object.keys(coDziala),
  agentow: agentow
};
