/**
 * Hak rozwiązywania modułów dla AVA: bare-specyfier `obsidian` → atrapa harnessu.
 *
 * PO CO: pakiet `obsidian` z npm to SAME TYPY — w `node_modules/obsidian` nie ma ani jednego
 * pliku wykonywalnego. Każdy test, który (choćby pośrednio) importuje plik produkcyjny
 * dotykający `obsidian` jako WARTOŚCI, wywracał się na `ERR_MODULE_NOT_FOUND` jeszcze przed
 * pierwszą asercją. Build produkcyjny i harness rozwiązują to aliasem esbuilda; AVA nie ma
 * etapu builda, więc ten sam alias zakładamy hakiem ESM Node'a (`node:module` → `register`).
 *
 * KSZTAŁT: plik jest wpinany przez `ava.nodeArguments` jako `--import`, ZA `--import=tsx`.
 * Sam hak (moduł `resolve`) siedzi w `data:`-URL-u poniżej, bo hak żyje w osobnym wątku
 * i nie ma prawa importować niczego względnego — cała jego wiedza to jeden adres atrapy,
 * wstrzyknięty tu jako literał.
 *
 * Rozwiązanie ODDAJE STER dalszym hakom (`next(...)` z adresem pliku atrapy) zamiast
 * zwracać wynik z `shortCircuit` — dzięki temu transpilacja `.ts` dalej należy do `tsx`.
 */
import { register } from 'node:module';

const MOCK_URL = new URL('./obsidian.ts', import.meta.url).href;

const hookSource = `
const MOCK_URL = ${JSON.stringify(MOCK_URL)};

export async function resolve(specifier, context, next) {
  if (specifier === 'obsidian') return next(MOCK_URL, context);
  return next(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(hookSource)}`);
