#!/usr/bin/env node
'use strict';
/**
 * runner.cjs - petla gauntletu audytu (fazy 2-4) na workerach `codex exec`.
 * Port semantyki .claude/skills/audyt/szablony/workflow.js: te same prompty,
 * dedup, agregacja werdyktow, liczenie suchych rund i przerwan. Roznica:
 * worker = proces codex (sub ChatGPT), sandbox read-only, wyjscie wymuszone
 * --output-schema i zbierane przez -o (plik ostatniej wiadomosci).
 *
 * Uzycie: node runner.cjs <sciezka/args.json> [--wznow] [--dry]
 *   --wznow  skonczone wywolania wracaja z journal.jsonl, reszta na zywo
 *   --dry    wypisz plan rundy 1 bez odpalania czegokolwiek
 * Wyniki: <dir args.json>/codex/{journal.jsonl, wynik.json, out/*.json}
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

// ---------- wejscie ----------
const argsPath = process.argv[2];
if (!argsPath) { console.error('uzycie: node runner.cjs <args.json> [--wznow] [--dry]'); process.exit(2); }
const WZNOW = process.argv.includes('--wznow');
const DRY = process.argv.includes('--dry');
const args = JSON.parse(fs.readFileSync(argsPath, 'utf8'));
const skillDir = __dirname;
const codexDir = path.join(path.dirname(path.resolve(argsPath)), 'codex');
const outDir = path.join(codexDir, 'out');
fs.mkdirSync(outDir, { recursive: true });
const journalPath = path.join(codexDir, 'journal.jsonl');

const kawalki = args.kawalki || [];
const maxRund = args.maxRund || 2;
const maxSuche = args.maxSuche || 1;
const obalaczyHigh = args.obalaczyHigh || 2;
const scratch = (args.repo || '') + '\\.claude\\worktrees';
const cfg = args.codex || {};
const CONCURRENCY = cfg.concurrency || 4;
const TIMEOUT_MS = (cfg.timeoutMin || 20) * 60 * 1000;
const MODEL = cfg.model || null;
const SCHEMA_FINDER = path.join(skillDir, 'schemas', 'finder_out.schema.json');
const SCHEMA_REFUTER = path.join(skillDir, 'schemas', 'refuter_out.schema.json');

// ---------- journal (resume) ----------
const cache = {};
if (WZNOW && fs.existsSync(journalPath)) {
  for (const linia of fs.readFileSync(journalPath, 'utf8').split('\n')) {
    if (!linia.trim()) continue;
    try { const w = JSON.parse(linia); if (w.ok) cache[w.key] = w.wynik; } catch (_) { /* uszkodzony wiersz - pomijamy */ }
  }
  log('wznowienie: ' + Object.keys(cache).length + ' wynikow z journala');
}
function zapiszJournal(key, ok, wynik, meta) {
  fs.appendFileSync(journalPath, JSON.stringify({ key, ok, wynik: ok ? wynik : null, meta, ts: new Date().toISOString() }) + '\n');
}
// czas LOKALNY, nie UTC - TLDR-y i workbenche maja mowic godzinami Kuby (lekcja 2026-08-25)
function log(m) { console.log('[runner ' + new Date().toLocaleTimeString('pl-PL', { hour12: false }) + '] ' + m); }

// ---------- prompty: identyczne jak workflow.js ----------
function promptSzukacza(kawalek, fokus, runda) {
  return 'Przeczytaj szablon ' + args.szablonSzukacz + ' i karte ' + args.kartaPath + '.\n' +
    'Wartosci placeholderow:\n' +
    'KAWALEK=' + JSON.stringify(kawalek) + '\n' +
    'POPRZECZKA=' + args.poprzeczka + '\n' +
    'ZNANE=' + JSON.stringify(args.znane || []) + '\n' +
    'FOCUS=' + fokus + '\nRUNDA=' + runda + '\nREPO=' + args.repo + '\nSCRATCH=' + scratch + '\n' +
    'UWAGA: dzialasz w sandboxie READ-ONLY. Reprodukcje wymagajaca zapisu OPISZ w sprawdzone[] zamiast wykonywac.\n' +
    'Odpowiedz wylacznie obiektem wg schematu.';
}
function bezNarracji(z) {
  return { tytul: z.tytul, twierdzenie: z.twierdzenie, severity: z.severity, pewnosc: z.pewnosc, dowod: z.dowod, scenariusz: z.scenariusz, granica: z.granica, reprodukcja: z.reprodukcja };
}
function promptObalacza(z) {
  return 'Przeczytaj szablon ' + args.szablonObalacz + ' i karte ' + args.kartaPath + '.\n' +
    'Wartosci placeholderow:\n' +
    'ZNALEZISKO=' + JSON.stringify(bezNarracji(z)) + '\n' +
    'NIE_FLAGOWAC=' + (args.nieFlagowac || '') + '\n' +
    'POPRZECZKA=' + args.poprzeczka + '\nREPO=' + args.repo + '\nSCRATCH=' + scratch + '\n' +
    'UWAGA: dzialasz w sandboxie READ-ONLY. Reprodukcje wymagajaca zapisu OPISZ w co_sprawdzilem[] zamiast wykonywac.\n' +
    'Odpowiedz wylacznie obiektem wg schematu.';
}

// ---------- worker codex ----------
function komendaCodex(schemaPath, outPath) {
  const parts = ['codex', 'exec', '-s', 'read-only', '--ephemeral', '--skip-git-repo-check',
    '-C', args.repo, '--output-schema', schemaPath, '-o', outPath, '--color', 'never'];
  if (MODEL) parts.push('-m', MODEL);
  parts.push('-');
  return parts.map((p) => (/\s/.test(p) ? '"' + p + '"' : p)).join(' ');
}
function killTree(pid) {
  try {
    if (process.platform === 'win32') execSync('taskkill /pid ' + pid + ' /T /F', { stdio: 'ignore' });
    else process.kill(-pid, 'SIGKILL');
  } catch (_) { /* proces mogl juz zejsc */ }
}
function odpalCodex(prompt, schemaPath, outPath) {
  return new Promise((resolve) => {
    try { fs.rmSync(outPath, { force: true }); } catch (_) {}
    const child = spawn(komendaCodex(schemaPath, outPath), { shell: true, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    let zabity = false;
    const timer = setTimeout(() => { zabity = true; killTree(child.pid); }, TIMEOUT_MS);
    child.stderr.on('data', (d) => { stderr += String(d); if (stderr.length > 4000) stderr = stderr.slice(-4000); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, blad: 'spawn: ' + e.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (zabity) return resolve({ ok: false, blad: 'timeout ' + (TIMEOUT_MS / 60000) + ' min' });
      let tekst = null;
      try { tekst = fs.readFileSync(outPath, 'utf8'); } catch (_) {}
      if (!tekst) return resolve({ ok: false, blad: 'exit ' + code + ', brak pliku -o; stderr: ' + stderr.slice(-500) });
      try { return resolve({ ok: true, wynik: JSON.parse(tekst) }); }
      catch (e) { return resolve({ ok: false, blad: 'niepoprawny JSON w -o: ' + e.message }); }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
function poprawnyFinder(o) { return o && Array.isArray(o.znaleziska) && Array.isArray(o.co_dziala_dobrze) && typeof o.najwieksza_luka === 'string' && Array.isArray(o.sprawdzone); }
function poprawnyRefuter(o) { return o && ['POTWIERDZONE', 'OBALONE', 'NIEWERYFIKOWALNE'].includes(o.werdykt) && typeof o.uzasadnienie === 'string' && Array.isArray(o.co_sprawdzilem); }
async function worker(key, prompt, schemaPath, walidator) {
  if (key in cache) { log('cache: ' + key); return cache[key]; }
  const outPath = path.join(outDir, key.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json');
  for (let proba = 1; proba <= 2; proba++) {
    const r = await odpalCodex(prompt, schemaPath, outPath);
    if (r.ok && walidator(r.wynik)) { zapiszJournal(key, true, r.wynik, { proba }); return r.wynik; }
    log('pad ' + key + ' (proba ' + proba + '): ' + (r.ok ? 'JSON nie spelnia kontraktu' : r.blad));
    if (proba === 2) zapiszJournal(key, false, null, { proba, blad: r.ok ? 'kontrakt' : r.blad });
  }
  return null; // pad - NIE jest werdyktem ani "nic nie znalazlem"
}
async function pula(zadania) {
  const wyniki = new Array(zadania.length).fill(null);
  let i = 0;
  async function wątek() { while (i < zadania.length) { const moj = i++; wyniki[moj] = await zadania[moj](); } }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, zadania.length) }, wątek));
  return wyniki;
}

// ---------- petla gauntletu: semantyka 1:1 z workflow.js ----------
function klucz(z, kawalekId) { const d = (z.dowod && z.dowod[0]) || {}; return kawalekId + '|' + (d.plik || '?') + '|' + (d.linie || '?'); }
function hash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 10); }
function polaczWerdykty(wpisy) {
  if (wpisy.length === 0) return 'BRAK';
  let potw = 0, obal = 0;
  for (const w of wpisy) { if (w.werdykt === 'POTWIERDZONE') potw++; else if (w.werdykt === 'OBALONE') obal++; }
  if (potw > 0 && obal > 0) return 'SPOR';
  if (potw === wpisy.length) return 'POTWIERDZONE';
  if (obal > 0) return 'OBALONE';
  return 'NIEWERYFIKOWALNE';
}

async function main() {
  const seen = {}; const wyniki = []; const focus = {}; const statusKawalka = {}; const bezNowych = {}; const coDziala = {};
  let runda = 0, suche = 0, agentow = 0, przerwane = false;
  for (const k of kawalki) { focus[k.id] = 'caly zakres'; statusKawalka[k.id] = 'niezbiezny'; bezNowych[k.id] = 0; }
  const saNiezbiezne = () => kawalki.some((k) => statusKawalka[k.id] === 'niezbiezny');

  if (DRY) {
    log('DRY RUN - plan rundy 1: ' + kawalki.length + ' szukaczy, concurrency ' + CONCURRENCY + ', timeout ' + (TIMEOUT_MS / 60000) + ' min/worker');
    log('komenda: ' + komendaCodex(SCHEMA_FINDER, path.join(outDir, 'szukacz_k1_r1.json')));
    log('prompt[0] (poczatek): ' + promptSzukacza(kawalki[0], 'caly zakres', 1).slice(0, 220).replace(/\n/g, ' | '));
    return;
  }

  while (suche < maxSuche && runda < maxRund && saNiezbiezne()) {
    runda++;
    const aktywne = kawalki.filter((k) => statusKawalka[k.id] === 'niezbiezny');
    log('runda ' + runda + ': ' + aktywne.length + ' szukaczy...');
    const odpSzukaczy = await pula(aktywne.map((k) => () => worker('szukacz_' + k.id + '_r' + runda, promptSzukacza(k, focus[k.id], runda), SCHEMA_FINDER, poprawnyFinder)));
    agentow += aktywne.length;
    const padli = aktywne.filter((k, i) => !odpSzukaczy[i]).map((k) => k.id);
    if (padli.length > 0) log('runda ' + runda + ': szukacze bez wyniku (pad workera): ' + padli.join(', '));
    if (padli.length === aktywne.length) { przerwane = true; runda--; log('wszyscy szukacze padli - przerywam bieg, nie licze jako suchej'); break; }

    const swieze = [];
    for (let i = 0; i < aktywne.length; i++) {
      const k = aktywne[i]; const o = odpSzukaczy[i];
      if (!o) continue;
      if (o.najwieksza_luka) focus[k.id] = o.najwieksza_luka;
      for (const t of (o.co_dziala_dobrze || [])) coDziala[t] = true;
      for (const z of (o.znaleziska || [])) {
        const kl = klucz(z, k.id);
        if (seen[kl]) continue;
        seen[kl] = true; z.kawalek = k.id; z.runda = runda; swieze.push(z);
      }
    }
    log('runda ' + runda + ': swieze zgloszenia: ' + swieze.length + ' - obalanie...');

    const zadania = []; const opisy = [];
    for (let i = 0; i < swieze.length; i++) {
      const z = swieze[i];
      const wysokie = (z.severity === 'HIGH' || z.severity === 'CRITICAL');
      const ilu = wysokie ? obalaczyHigh : 1;
      for (let j = 0; j < ilu; j++) {
        opisy.push({ idx: i });
        const key = 'obalacz_' + hash(klucz(z, z.kawalek)) + '_o' + (j + 1);
        zadania.push(() => worker(key, promptObalacza(z), SCHEMA_REFUTER, poprawnyRefuter));
      }
    }
    const odpObalaczy = zadania.length > 0 ? await pula(zadania) : [];
    agentow += zadania.length;

    const wpisyPer = swieze.map(() => []);
    for (let i = 0; i < odpObalaczy.length; i++) {
      const o = odpObalaczy[i];
      if (!o || !o.werdykt) continue;
      const wpis = { werdykt: o.werdykt, uzasadnienie: o.uzasadnienie || '', model: 'codex' };
      if (o.korekta_severity) wpis.korekta_severity = o.korekta_severity;
      wpisyPer[opisy[i].idx].push(wpis);
    }

    const nowePotw = {}; for (const k of aktywne) nowePotw[k.id] = 0;
    let lacznieNowe = 0, lacznieObalone = 0;
    for (let i = 0; i < swieze.length; i++) {
      const z = swieze[i]; const wpisy = wpisyPer[i]; const agg = polaczWerdykty(wpisy);
      if (agg === 'POTWIERDZONE') { z.status = 'nowe'; z.pewnosc = 'potwierdzone'; nowePotw[z.kawalek]++; lacznieNowe++; }
      else if (agg === 'OBALONE') { z.status = 'obalone'; lacznieObalone++; }
      else {
        z.status = 'nowe'; z.pewnosc = 'niezweryfikowalne';
        wpisy.push({ werdykt: 'NIEWERYFIKOWALNE', uzasadnienie: (agg === 'SPOR' ? 'Spor obalaczy' : 'Obalacz nie zwrocil wyniku') + ' - do rozstrzygniecia przez lidera.', model: 'runner' });
      }
      z.obalanie = wpisy; wyniki.push(z);
    }

    for (const k of aktywne) {
      bezNowych[k.id] = nowePotw[k.id] > 0 ? 0 : bezNowych[k.id] + 1;
      if (bezNowych[k.id] >= 2) statusKawalka[k.id] = 'zbiezny';
    }
    suche = lacznieNowe === 0 ? suche + 1 : 0;
    log('runda ' + runda + ': zgloszone ' + swieze.length + ', obalone ' + lacznieObalone + ', potwierdzone ' + lacznieNowe + ', suche ' + suche + '/' + maxSuche);
  }

  const powodStopu = przerwane ? 'przerwanie' : (!saNiezbiezne() || suche >= maxSuche) ? 'zbieznosc' : 'sufit_rund';
  log('stop: ' + powodStopu + ' po ' + runda + ' rundach, workerow: ' + agentow);
  const wynik = {
    znaleziska: wyniki,
    kawalki: kawalki.map((k) => ({ id: k.id, status: statusKawalka[k.id], najwieksza_luka: focus[k.id] })),
    rundy: runda, suche_rundy_na_koniec: suche, powod_stopu: powodStopu,
    co_dziala_dobrze: Object.keys(coDziala), agentow, silnik: 'codex-cli'
  };
  fs.writeFileSync(path.join(codexDir, 'wynik.json'), JSON.stringify(wynik, null, 2));
  log('wynik: ' + path.join(codexDir, 'wynik.json'));
}

main().catch((e) => { console.error('[runner] BLAD krytyczny: ' + (e && e.stack || e)); process.exit(1); });
