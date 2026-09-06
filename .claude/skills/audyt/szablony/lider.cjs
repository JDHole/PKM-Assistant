#!/usr/bin/env node
/**
 * lider.cjs - narzędzia lidera biegu gauntlet (fazy 5-6: składanie findings.json i RAPORT.md).
 *
 *   node .claude/skills/audyt/szablony/lider.cjs journal <transcriptDir> <biegDir>
 *        -> surowe/sprawdzone.json (wyniki szukaczy per kawałek: sprawdzone, najwieksza_luka, co_dziala_dobrze)
 *        -> surowe/journal_summary.json (ile wyników, ile padów)
 *   node .claude/skills/audyt/szablony/lider.cjs ids <biegDir> <karta>
 *        -> surowe/znaleziska_z_id.json (z workflow_result.json, id AUD-{karta}-NNN)
 *   node .claude/skills/audyt/szablony/lider.cjs prompt-synteza <biegDir> <karta> <szablon> <poprzeczkaPlik> <znanePlik> <liczbyPlik>
 *        -> surowe/prompt_synteza.md (placeholdery podstawiane funkcją, bez pułapki "$")
 *   node .claude/skills/audyt/szablony/lider.cjs zloz <biegDir> <metaPlik>
 *        -> findings.json (znaleziska_z_id + synteza.json + meta)
 *   node .claude/skills/audyt/szablony/lider.cjs raport <biegDir>
 *        -> RAPORT.md z findings.json
 */
'use strict';
const fs = require('fs');
const path = require('path');

const czytaj = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pisz = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
const podstaw = (tekst, mapa) => tekst.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in mapa ? mapa[k] : m));

const [cmd, ...a] = process.argv.slice(2);

if (cmd === 'journal') {
  const [dir, biegDir] = a;
  const linie = fs.readFileSync(path.join(dir, 'journal.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const started = linie.filter((l) => l.type === 'started');
  const results = linie.filter((l) => l.type === 'result');
  const szukacze = [];
  let obalaczy = 0, nullowych = 0;
  for (const r of results) {
    if (!r.result) { nullowych++; continue; }
    if (Array.isArray(r.result.znaleziska)) {
      // kawałek z pierwszej wiadomości transkryptu agenta
      let kawalek = '?', runda = '?';
      try {
        const t = fs.readFileSync(path.join(dir, 'agent-' + r.agentId + '.jsonl'), 'utf8');
        const m = t.match(/KAWALEK=\{\\"id\\":\\"([a-z0-9-]+)\\"/) || t.match(/KAWALEK=\{"id":"([a-z0-9-]+)"/);
        if (m) kawalek = m[1];
        const mr = t.match(/RUNDA=(\d)/);
        if (mr) runda = mr[1];
      } catch (e) { /* brak transkryptu */ }
      szukacze.push({ agentId: r.agentId, kawalek, runda, znalezisk: r.result.znaleziska.length,
        najwieksza_luka: r.result.najwieksza_luka, co_dziala_dobrze: r.result.co_dziala_dobrze, sprawdzone: r.result.sprawdzone });
    } else if (r.result.werdykt) {
      obalaczy++;
    }
  }
  const surowe = path.join(biegDir, 'surowe');
  fs.mkdirSync(surowe, { recursive: true });
  pisz(path.join(surowe, 'sprawdzone.json'), szukacze);
  const summary = { started: started.length, results: results.length, szukaczy: szukacze.length, obalaczy, nullowych,
    brak_wyniku: started.length - results.length };
  pisz(path.join(surowe, 'journal_summary.json'), summary);
  console.log(JSON.stringify(summary));
  for (const s of szukacze) console.log(`  szukacz ${s.kawalek} r${s.runda}: ${s.znalezisk} znalezisk`);
}

else if (cmd === 'ids') {
  const [biegDir, karta] = a;
  const w = czytaj(path.join(biegDir, 'surowe', 'workflow_result.json'));
  const kolejnosc = w.kawalki.map((k) => k.id);
  const zs = [...w.znaleziska].sort((x, y) => (x.runda - y.runda) || (kolejnosc.indexOf(x.kawalek) - kolejnosc.indexOf(y.kawalek)));
  zs.forEach((z, i) => { z.id = `AUD-${karta}-${String(i + 1).padStart(3, '0')}`; });
  pisz(path.join(biegDir, 'surowe', 'znaleziska_z_id.json'), zs);
  const st = zs.reduce((acc, z) => { const k = z.status + '/' + z.pewnosc; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  console.log(`nadano ${zs.length} id; statusy: ${JSON.stringify(st)}`);
  for (const z of zs) console.log(`  ${z.id} [${z.severity}] ${z.status}/${z.pewnosc} ${z.kawalek} r${z.runda} | ${z.tytul}`);
}

else if (cmd === 'prompt-synteza') {
  const [biegDir, karta, szablon, poprzeczkaPlik, znanePlik, liczbyPlik, wejscie] = a;
  const tpl = fs.readFileSync(szablon, 'utf8').split('\r\n').join('\n');
  const cialo = tpl.split(/\n---\n/).slice(1).join('\n---\n'); // treść pod linią poziomą
  const zs = czytaj(path.join(biegDir, 'surowe', wejscie || 'znaleziska_z_id.json'));
  const spr = czytaj(path.join(biegDir, 'surowe', 'sprawdzone.json'));
  const coDziala = [];
  for (const s of spr) for (const t of (s.co_dziala_dobrze || [])) coDziala.push(`[${s.kawalek}] ${t}`);
  const prompt = podstaw(cialo, {
    KARTA: karta,
    POPRZECZKA: fs.readFileSync(poprzeczkaPlik, 'utf8').trim(),
    ZNALEZISKA_JSON: JSON.stringify(zs, null, 1),
    ZNANE: fs.readFileSync(znanePlik, 'utf8').trim(),
    CO_DZIALA: JSON.stringify(coDziala, null, 1),
    LICZBY: fs.readFileSync(liczbyPlik, 'utf8').trim(),
  });
  fs.writeFileSync(path.join(biegDir, 'surowe', 'prompt_synteza.md'), prompt, 'utf8');
  console.log(`prompt_synteza.md: ${prompt.length} znaków, znalezisk ${zs.length}, co_dziala ${coDziala.length}`);
}

else if (cmd === 'zloz') {
  const [biegDir, metaPlik] = a;
  const meta = czytaj(metaPlik);
  const zs = czytaj(path.join(biegDir, 'surowe', 'znaleziska_z_id.json'));
  const syn = czytaj(path.join(biegDir, 'surowe', 'synteza.json'));
  const byId = Object.fromEntries(zs.map((z) => [z.id, z]));
  // korekty syntezy
  for (const k of (syn.korekty || [])) {
    const z = byId[k.id]; if (!z) { console.warn('korekta: nieznane id ' + k.id); continue; }
    if (k.pole === 'severity') { z.severity_szukacza = z.severity; z.severity = k.wartosc; z.korekta_syntezy = k.powod; }
    else if (k.pole === 'powiazane') { z.powiazane = Array.isArray(k.wartosc) ? k.wartosc : [k.wartosc]; z.korekta_syntezy = k.powod; }
    else { z['korekta_' + k.pole] = k.wartosc; }
  }
  for (const kl of (syn.klastry || [])) for (const id of kl.znaleziska) { if (byId[id]) byId[id].klaster = kl.id; else console.warn('klaster: nieznane id ' + id); }
  for (const kd of (syn.kierunki || [])) { if (byId[kd.id]) byId[kd.id].kierunek_syntezy = kd.kierunek; }
  // kształt wg schematu: usuń pola spoza schematu (schemat nie ma additionalProperties na znaleziskach - zostawiamy, walidator zdecyduje)
  const liczby = {
    zgloszone: zs.length,
    obalone: zs.filter((z) => z.status === 'obalone').length,
    potwierdzone: zs.filter((z) => z.status !== 'obalone' && z.pewnosc === 'potwierdzone').length,
    niezweryfikowalne: zs.filter((z) => z.status !== 'obalone' && z.pewnosc === 'niezweryfikowalne').length,
    agentow: meta.agentow,
  };
  const bieg = Object.assign({}, meta.bieg, {
    znane_status: syn.znane_status || [],
    klastry: syn.klastry || [],
    co_dziala_dobrze: syn.co_dziala_dobrze || [],
    tldr: syn.tldr || '',
    liczby,
  });
  delete bieg.agentow;
  const ranking = syn.ranking || [];
  const rankIdx = (z) => { const i = ranking.indexOf(z.id); return i < 0 ? 999 : i; };
  const posort = [...zs].sort((x, y) => rankIdx(x) - rankIdx(y) || x.id.localeCompare(y.id));
  pisz(path.join(biegDir, 'findings.json'), { bieg, znaleziska: posort });
  console.log(`findings.json: ${posort.length} znalezisk, liczby ${JSON.stringify(liczby)}, klastry ${(syn.klastry || []).length}, ranking ${ranking.length}`);
}

else if (cmd === 'raport') {
  const [biegDir] = a;
  const f = czytaj(path.join(biegDir, 'findings.json'));
  const b = f.bieg;
  const potw = f.znaleziska.filter((z) => z.status !== 'obalone' && z.pewnosc === 'potwierdzone');
  const niew = f.znaleziska.filter((z) => z.status !== 'obalone' && z.pewnosc !== 'potwierdzone');
  const obal = f.znaleziska.filter((z) => z.status === 'obalone');
  const sev = (list) => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((s) => [s, list.filter((z) => z.severity === s).length]).filter((x) => x[1] > 0).map((x) => `${x[1]} ${x[0]}`).join(', ');
  const dowod = (z) => z.dowod.map((d) => `\`${d.plik}:${d.linie}\` - \`${String(d.cytat).replace(/\s*\n\s*/g, ' ').slice(0, 220)}\``).join('; ');
  const obalanie = (z) => z.obalanie.map((o) => `${o.werdykt} (${o.model || '?'}${o.korekta_severity ? ', korekta: ' + o.korekta_severity : ''}): ${String(o.uzasadnienie).replace(/\s*\n\s*/g, ' ').slice(0, 700)}`).join(' | ');
  const sekcja = (z) => {
    const kal = z.severity_szukacza && z.severity_szukacza !== z.severity ? ` (szukacz: ${z.severity_szukacza}, kalibracja syntezy)` : '';
    const linie = [
      `### ${z.id} [${z.severity}]${kal} ${z.tytul}`,
      '',
      `- **kawałek:** ${z.kawalek}, runda ${z.runda}${z.klaster ? `, klaster ${z.klaster}` : ''}`,
      `- **twierdzenie:** ${z.twierdzenie}`,
      `- **dowód:** ${dowod(z)}`,
      `- **scenariusz:** ${z.scenariusz}`,
    ];
    if (z.granica) linie.push(`- **granica:** ${z.granica}`);
    linie.push(`- **reprodukcja:** ${z.reprodukcja || 'source-only'}`);
    linie.push(`- **obalanie:** ${obalanie(z)}`);
    if (z.kierunek_syntezy) linie.push(`- **kierunek (synteza):** ${z.kierunek_syntezy}`);
    else if (z.kierunek) linie.push(`- **kierunek (szukacz):** ${z.kierunek}`);
    if (z.powiazane && z.powiazane.length) linie.push(`- **powiązane:** ${z.powiazane.join(', ')}`);
    if (z.korekta_syntezy) linie.push(`- **korekta syntezy:** ${z.korekta_syntezy}`);
    if (z.nota_lidera) linie.push(`- **nota lidera:** ${z.nota_lidera}`);
    return linie.join('\n');
  };
  const kaw = b.kawalki;
  const out = [];
  out.push(`# Audyt ${b.karta} - ${b.data.slice(0, 10)} (${b.id})`);
  out.push('');
  out.push(`Poprzeczka: ${b.poprzeczka}`);
  out.push('');
  out.push('## TLDR');
  out.push('');
  out.push(b.tldr);
  out.push('');
  out.push('## Liczby');
  out.push('');
  out.push(`- kawałki ${kaw.length} (zbieżne ${kaw.filter((k) => k.status === 'zbiezny').length}), rundy ${b.rundy} (stop: ${b.powod_stopu}, suche rundy na koniec: ${b.suche_rundy_na_koniec})`);
  out.push(`- zgłoszone ${b.liczby.zgloszone} / obalone ${b.liczby.obalone} / potwierdzone ${b.liczby.potwierdzone} / niezweryfikowalne ${b.liczby.niezweryfikowalne}; agentów ${b.liczby.agentow}`);
  out.push(`- potwierdzone wg severity: ${sev(potw) || 'brak'}; obalone: ${sev(obal) || 'brak'}`);
  out.push(`- tryb: ${b.tryb_szczegoly || b.tryb}`);
  out.push('');
  out.push('| kawałek | status | największa luka wg ostatniego szukacza |');
  out.push('|---|---|---|');
  for (const k of kaw) out.push(`| ${k.id} | ${k.status} | ${String(k.najwieksza_luka || '').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').slice(0, 400)} |`);
  out.push('');
  out.push('## Znaleziska potwierdzone (ranking)');
  out.push('');
  for (const z of potw) { out.push(sekcja(z)); out.push(''); }
  out.push('## Klastry systemowe');
  out.push('');
  if (!b.klastry.length) out.push('Brak klastrów (synteza nie znalazła trzech znalezisk o wspólnej przyczynie).');
  for (const k of b.klastry) out.push(`- **${k.id}** - ${k.przyczyna} Znaleziska: ${k.znaleziska.join(', ')}.`);
  out.push('');
  out.push('## Znane - czy nadal');
  out.push('');
  const zs = b.znane_status || [];
  const cnt = (s) => zs.filter((x) => x.status === s).length;
  out.push(`Razem ${zs.length}: naprawione ${cnt('naprawione')}, nadal ${cnt('nadal')}, nie_sprawdzono ${cnt('nie_sprawdzono')}.`);
  out.push('');
  for (const x of zs) out.push(`- **${x.status}** - ${x.skrot}${x.zrodlo ? ` (${x.zrodlo})` : ''}`);
  out.push('');
  out.push('## Obalone');
  out.push('');
  if (!obal.length) out.push('Brak.');
  for (const z of obal) {
    const lid = z.obalanie.find((x) => x.model === 'lider');
    const o = lid || z.obalanie.find((x) => x.werdykt === 'OBALONE') || z.obalanie[0] || {};
    const spor = lid ? ' (spór obalaczy: ' + z.obalanie.filter((x) => x.model !== 'lider').map((x) => x.werdykt.toLowerCase() + '/' + x.model).join(', ') + '; rozstrzygnięcie lidera)' : '';
    out.push(`- ${z.id} [${z.severity}] ${z.tytul}${spor} - ${String(o.uzasadnienie || '').replace(/\s*\n\s*/g, ' ').slice(0, lid ? 1400 : 400)}`);
  }
  out.push('');
  out.push('## Niezweryfikowalne');
  out.push('');
  if (!niew.length) out.push('Brak.');
  for (const z of niew) { out.push(sekcja(z)); out.push(''); }
  out.push('## Co działa dobrze');
  out.push('');
  for (const t of (b.co_dziala_dobrze || [])) out.push(`- ${t}`);
  out.push('');
  out.push('## Środowisko biegu');
  out.push('');
  const s = b.srodowisko;
  out.push(`- HEAD: ${s.head}`);
  out.push(`- branch: ${s.branch}`);
  out.push(`- OS: ${s.os}, node ${s.node}, harness/.env.local: ${s.env_local ? 'jest' : 'brak'}`);
  out.push(`- wykonanie: ${s.wykonanie}${b.wykonanie_szczegoly ? ' (' + b.wykonanie_szczegoly + ')' : ''}`);
  if (b.modele) out.push(`- modele: ${b.modele}`);
  if (b.koszt) out.push(`- koszt: ${b.koszt}`);
  if (b.weryfikacja) out.push(`- weryfikacja raportu: ${b.weryfikacja}`);
  if (b.pliki) out.push(`- pliki: ${b.pliki}`);
  if (b.poprzednie_biegi && b.poprzednie_biegi.length) out.push(`- poprzednie biegi karty: ${b.poprzednie_biegi.join(', ')}`);
  out.push('');
  fs.writeFileSync(path.join(biegDir, 'RAPORT.md'), out.join('\n'), 'utf8');
  console.log(`RAPORT.md: ${out.join('\n').length} znaków; potwierdzone ${potw.length}, obalone ${obal.length}, niezweryfikowalne ${niew.length}`);
}

else {
  console.error('nieznana komenda: ' + cmd);
  process.exit(2);
}
