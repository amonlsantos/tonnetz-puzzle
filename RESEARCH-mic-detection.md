# RESEARCH — Detecção de altura (pitch) de instrumento monofônico no microfone

Status: investigação — ticket #8 (branch `research/mic-detection`).
Escopo: o caminho de integração mais sólido para (1) `tune.js` no Angular 21, (2) o
motor de detecção de altura (`ACF2+` vs `pitchy`), (3) as constraints de
`getUserMedia`, (4) testes em Vitest + jsdom. Cada seção termina com uma
recomendação. Fontes primárias citadas por item; os trechos podem ser verificados
nos links/arquivos indicados.

---

## (a) Integração de `tune.js` no Angular 21

### O que o pacote é de fato

- **npm**: `tune.js` (com ponto: `tune.js`, não `tunejs`). `latest` = **1.0.1**,
  publicado em **2017-11-22**; o metadata do pacote foi tocado pela última vez em
  2022-05-22. Um único mantenedor (`fuki` / Fust Kilas). O repositório
  `fustkilas/tune.js` teve o último push em **2016-03-26**, 0 estrelas — na prática
  **abandonware**. Licença **MIT** (em `package.json` e no README do pacote).
  Fonte: registry do npm (`registry.npmjs.org/tune.js`) e `api.github.com/repos/fustkilas/tune.js`.
- **Conteúdo**: `tune.js` (arquivo único de **~1,19 MB**, 3.301 escalas) + `tunings.js`
  (duplicação do mesmo `TuningList`) + `tunings/**` com 3.301 arquivos `.mtx`
  (arquivo Scala). Os `.mtx` originais são o arquivo Scala documentado por Victor
  Cerullo — o README preserva o aviso *"Archive copyright 2003-2010 by Victor
  Cerullo"*, que deve acompanhar qualquer redistribuição.
- **Formato**: o código é um script clássico. Define `function Tune(){}` (construtor
  global) e `var TuningList = {…}` no escopo raiz. Em script clássico de browser
  esses viram globais; **em ESM (que é o caso do Angular) ficam no escopo do módulo
  e não são exportados** — `import 'tune.js'` resolve para um módulo vazio.
- **ESM/types**: o `package.json` do pacote não tem `module`, nem `exports`, nem
  `types`, nem `type`. Sem `.d.ts`. `main` é `tune.js`. Não há leaves para o
  bundler/esbuild resolverem condição `import`.
- **API que importa aqui**: `new Tune()`, `tune.loadScale(nome)`,
  `tune.tonicize(freq)`, `tune.note(grau, oitava)`, `tune.chord([…])`,
  `tune.search(nome)`, `tune.mode.output` (`'frequency' | 'ratio' | 'MIDI'`).
  Fonte: README do pacote e `tune.js` (métodos `frequency/ratio/MIDI`).

### Sobre os nomes de temperamento do ticket

O ticket e o `CONTEXT.md` descrevem o script como "globais `window[...]` de
temperamentos (`equal`, `just`, `meantone`, `pythagorean`, `werckmeisterI/II/III`)".
**Isso não corresponde ao pacote npm 1.0.1.** Verifiquei as 3.301 chaves de
`TuningList` (arquivo baixado do registry): não existem chaves `equal`, `just`,
`meantone`, `pythagorean` nem `werckmeisterI/II/III`. As chaves reais mais próximas
são:

| Intenção (CONTEXT.md) | Chave real em `TuningList` (1.0.1) |
|---|---|
| igual | **não existe** (há só o array de referência `etmajor` hardcoded + chaves `et-mix6`) |
| justa | `ji_12` (e `ji_12a/b/c`, `ji_17`, …) |
| pitagórico | `pyth_12` (e `pyth_17`, `pyth_31`, …) |
| meantone | `meanten`, `mean19`, `mean31` etc. (~5 chaves com "meant") |
| werckmeister | `werck1`, `werck3`, `werck3_eb`, `werck3_mod`, `werck4`, `werck5`, `werck6`, `werck6_dup`, `werck_cl5`, `werck_cl6` |

(oomportante: o "igual" — 12-EDO — o próprio `Tune` já produz via razões 2^(n/12);
qualquer integração pode usar o `etmajor` como referência ou injetar uma entrada
`equal` própria.)

### Caminhos de integração em Angular 21 (esbuild application builder)

1. **Global script via `angular.json`** — `options.scripts` do builder
   `@angular/build:application` resolve caminhos relativos e de pacote e injeta os
   arquivos como `<script>` (como se estivessem no `index.html`), com suporte a
   `inject`/`bundleName`. Confirmado na doc do Angular (`angular.dev/cli/build`,
   `/reference/configs/workspace-config`) e no schema do pacote 21.x
   (`scripts?: ScriptElement[]`). Depois basta um `.d.ts` ambiente:
   `declare const Tune: TuneStatic; declare const TuningList: TuningList;`.
2. **Vendoring "enxuto" (recomendado)** — portar a classe `Tune` (~100 linhas,
   sem dependências) + apenas as tabelas necessárias (`ji_12`, `pyth_12`,
   `meanten`, `werck3`/`werck6`, e `equal` gerado) para um módulo TS tipado em
   `src/vendor`. MIT permite (preservando o aviso do arquivo Scala). Cai de ~1,2 MB
   para ~10–20 KB, vira deep module tipado e testável, sem globals.
3. **Não recomendado**: `import 'tune.js'` direto (módulo vazio como explicado) ou
   `fetch`+`eval` em runtime.

### Recomendação (a)

Vendor próprio (caminho 2): extrair a classe `Tune` + 4-5 tabelas de temperamento
para um módulo TS tipado, com tipos `TuneStatic`/`TuningList` próprios. Se a
fidelidade ao upstream for prioridade, o caminho 1 (global script + tipos ambientes)
é a alternativa legítima — e o `tune.js` completo continua em `angular.json.scripts`.
Evitar o import ESM do npm; o pacote não foi feito para isso e está morto desde 2017.

---

## (b) Motor de detecção de altura: ACF2+ vs pitchy

Ambos são funções puras sobre um `Float32Array` de `analyser.getFloatTimeDomainData`
— perfeitamente testáveis no Vitest com senóides sintéticas, sem DOM. Diferenças:

### ACF2+ (Chris Wilson)

- **Origem**: `github.com/cwilso/PitchDetect` (`js/pitchdetect.js`), MIT (2014).
  É a função `autoCorrelate(buf, sampleRate)` — script global, ~45 linhas, zero
  dependências.
- **Correção de mito do ticket**: o ACF2+ **não vem do demo do tune.js** — o demo
  do tune.js (aba keyboard microtonal) não tem entrada de microfone. O ACF2+ é do
  PitchDetect do Chris Wilson. (Investigação: árvore do repo `fustkilas/tune.js`,
  `index.html` e `simple-demo.html` do pacote — nenhum usa mic.)
- **Algoritmo**: gate RMS (rejeita se `rms < 0.01`) → recorta o buffer entre o
  primeiro e o último sample com `|x| < 0.2` → autocorrelação por força bruta em
  todos os lags → pico máximo → interpolação parabólica (`T0 = T0 - b/(2a)`) →
  `sampleRate/T0`. Retorna `-1` para silêncio.
  Fonte: código em `https://raw.githubusercontent.com/cwilso/PitchDetect/master/js/pitchdetect.js`.
- **Qualidades**: latência = uma janela (`fftSize / sampleRate`); com 2048 @ 48 kHz
  ≈ 42,7 ms por leitura + cadência do `requestAnimationFrame`. Custo O(N²) na
  janela (≈1–2 Mi de operações por frame) — abaixo de 1 ms em hardware moderno.
  O próprio Chris Wilson, no README do repo: funciona bem para ondas monofônicas
  (fortes harmônicos atrapalham) e "works pretty well to tune my guitar".
- **Fraquezas**: sem medida de *clarity* (só o gate RMS fixo 0.01 e o trim 0.2 —
  constantes embutidas); erros de oitava possíveis; e um defeito de código: `a`,
  `b` (e `x1/x2/x3`) são declarados implicitamente (globais vazadas em modo loos).
- **Testability**: alta — função pura sobre `Float32Array`; senoide conhecida →
  freq esperada.

### pitchy

- **npm**: `pitchy`, `latest` **4.1.0** (2024-01-04). MIT. Um mantenedor, ativo
  (o v4 é ESM puro, sem mudanças funcionais sobre o v3). Unpacked **~33 KB**
  (`4.1.0`, 33.090 bytes) + dependência de runtime `fft.js@^4.0.4`.
  Fonte: registry do npm (`registry.npmjs.org/pitchy`) e `package.json` baixado.
- **ESM/types**: `"type": "module"`, `exports` com `types`/`default`, **`.d.ts`
  completo incluso** na raiz do pacote (`index.d.ts`, ~9 KB). API tipada de fábrica:
  `PitchDetector.forFloat32Array(len)`, `detector.findPitch(buf, sampleRate)` →
  `[hz, clarity]` (clarity 0..1; `[0,0]` para silêncio).
  Configurável: `clarityThreshold` (k do paper), `minVolumeAbsolute`,
  `minVolumeDecibels`, `maxInputAmplitude`. Exporta também `Autocorrelator`.
- **Algoritmo**: McLeod Pitch Method (MPM — *A Smarter Way to Find Pitch*, McLeod &
  Wyvill). NSDF (normalized square difference function) calculada por FFT
  (`fft.js` → O(N log N)), com pico via parabolic interpolation e o *clarity* como
  medida de confiança — isso torna o gate contra ruído muito mais limpo que o RMS
  fixo do ACF2+.
- **Contexto do repo**: o `pitchy@^4.1.0` já esteve neste projeto e foi removido no
  `d30bad6` por estar **não utilizado** ("chore: remove unused pitchy dep") — não
  por defeito. Re-adição é trivial e barata.
- **Testability**: igualmente alta (função pura); com a vantagem de já entregar
  `clarity`, o teste de "silêncio vira `[0,0]`" sai de fábrica.

### Outras opções mínimas

- `pitchfinder` (npm): pacote com vários algoritmos empacotados
  (ACF, MPM, YIN, MLS…); existiu e é utilizado (2.3.4, licença GNU GPL v3
  segundo o registry do npm — atenção ao copyleft se for usado em dependência de
  produto), mas não foi o foco deste ticket — vale só como fallback de catálogo;
  sem evidência de vantagem sobre `pitchy` para monofônico.

### Recomendação (b)

**`pitchy@4.1.0`** é o motor recomendado: ESM puro, tipos inclusos, mantido,
~33 KB, MPM com `clarity` nativa (melhor gate contra ruído que o RMS fixo do
ACF2+) e já testado neste repo em versão anterior. **ACF2+** fica como plano B
documentado: zero dependências, ~45 linhas, e é o algoritmo de referência dos
tutoriais — porém sem `clarity`, com constantes fixas e com o vazamento de
variáveis mencionado. Para o caso de uso (instrumento monofônico real, uma nota
por vez, tubo do afinador em cents) os dois atendem; `pitchy` destrava o afinação
via `clarity` e tipos.

---

## (c) Constraints de `getUserMedia` para detecção de altura

Fontes: MDN (`MediaTrackConstraints`, `echoCancellation`, `noiseSuppression`,
`getUserMedia`, `AnalyserNode.getFloatTimeDomainData`), Web Audio spec (issue
`WebAudio/web-audio-api#2322`), e o código do próprio demo do PitchDetect.

- **Desligar o processamento**: `autoGainControl: false`, `echoCancellation: false`,
  `noiseSuppression: false`. AGC muda a amplitude; echo-cut/noise-suppression são
  DSP que podem distorcer ou atrasar o sinal e prejudicam leituras de afinador.
  Em `ConstrainBoolean`, o valor simples é *preferência* ("will attempt… but will
  not fail"); para torná-lo obrigatório usa-se `{ exact: false }`, com risco de
  `OverconstrainedError` em plataformas que não honrem o pedido. Na prática, nos
  Chrome/Edge desktop os valores simples são atendidos. Os prefixos legados
  `googEchoCancellation: "false"` etc. (que aparecem no PitchDetect) são obsoletos.
- **Mono**: `channelCount: 1` — coerente com instrumento monofônico e evita
  downmix estereofônico.
- **Sample rate**: não é preciso (nem aconselhável) fixar a taxa do *track*
  (`sampleRate`) como `exact` — o `MediaStreamAudioSourceNode` re-amostra o track
  para a taxa do `AudioContext` (Chromium re-amostra; o spec caminha para exigir a
  re-amostragem; o Firefox antigo chegou a lançar erro quando as taxas diferiam —
  issue #2322, hoje resolvido). Use o `audioContext.sampleRate` real como entrada
  dos detectores (ACF2+/pitchy ambos recebem `sampleRate`). 44.1/48 kHz padrão
  servem; janela de 2048 @ 48 kHz ≈ 42,7 ms. Para janelas menores/precisão em
  agudos pode-se criar o context com `new AudioContext({ sampleRate: 48000 })`.
- **Sample size**: deixar o padrão (16 bits); sem motivo para mexer.
- **Device picker / enumeração**: `navigator.mediaDevices.enumerateDevices()`
  filtrando `kind === 'audioinput'` e, opcionalmente, `deviceId` (ideal) no pedido.
  `getUserMedia` exige gesto do usuário (permissão) — o próprio toggle do Modo
  Instrumento é o gesto natural. Segurar uma referência ao `stream` e chamar
  `track.stop()` no teardown.
- **Contexto/síntese**: quando o microfone estiver ativo, a síntese (Tone.js) deve
  ficar mudada (é o que o `CONTEXT.md` já prevê para o modo instrumento) para o
  detector só ver o instrumento real.
- **Loop de leitura** (independente do motor): `analyser.fftSize = 2048` (potência
  de 2); `analyser.smoothingTimeConstant`/`minDecibels`/`maxDecibels` afetam **só**
  dados de frequência — o `getFloatTimeDomainData(new Float32Array(analyser.fftSize))`
  copia exatamente `fftSize` samples (MDN) e é a fonte dos detectores. Loop por
  `requestAnimationFrame`.

### Recomendação (c)

Constraints mínimas: `{ autoGainControl: false, echoCancellation: false,
noiseSuppression: false, channelCount: 1 }`, sem `exact`, sem `sampleRate`
obrigatória (usar `audioContext.sampleRate` para o detector), enumeração via
`enumerateDevices` para picker opcional e `track.stop()` no desligamento.

---

## (d) Testes em Vitest + jsdom

- **jsdom não implementa Web Audio**: `AudioContext`, `AnalyserNode`,
  `MediaStreamAudioSourceNode`, `navigator.mediaDevices` e `getUserMedia` não
  existem no jsdom (issue `jsdom/jsdom#2900`, aberta). Vale para o jsdom 28 deste
  repo.
- **`web-audio-test-api`** (npm, MIT): ~0.5.2 no dist-tag (versões até 0.6.4),
  último toque **2022** — efetivamente descontinuado, anterior à era AudioWorklet;
  não indicado.
- **`web-audio-mock`** (npm, MIT): 0.1.9, mesmo estado (2022). Não indicado.
- **`faking-media-streams`**: não é pacote npm; é o helper `fake-media-stream.js`
  do `webrtc/samples`, pensado para **e2e no Chrome/Selenium**
  (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`) — não
  serve para testes unitários em jsdom.
- **Melhor prática atual (e o padrão visto em bastantes projetos de produção)**:
  shims manuais mínimos por teste, via Vitest:
  - `vi.stubGlobal('AudioContext', class MockAudioContext {...})` com `sampleRate`,
    `state`, `createAnalyser()` devolvendo `{ get fftSize()/set fftSize(),
    getFloatTimeDomainData(out)` que escreve um sinal determinístico
    (ex.: `out[i] = 0.5 * Math.sin(2π·f·i/sampleRate)` ) }`, e
    `createMediaStreamSource()` devolvendo `{ connect: vi.fn(), disconnect: vi.fn() }`.
  - `Object.defineProperty(navigator, 'mediaDevices', { value: {
    getUserMedia: vi.fn().mockResolvedValue(fakeStream) }, configurable: true })`,
    onde `fakeStream.getAudioTracks()` → `[{ stop: vi.fn() }]`.
  - `vi.unstubAllGlobals()` no `afterEach`.
- **Ponto-chave**: os detectores são **puros** — ACF2+/`pitchy.findPitch` precisam
  apenas de um `Float32Array` sintético; **nenhum mock de Web Audio é necessário
  para testar a matemática**. Os mocks só são necessários para testar o serviço que
  costura `getUserMedia → AudioContext → createMediaStreamSource → createAnalyser →
  getFloatTimeDomainData → detector`, e para validar o ciclo de vida
  (permissão negada, `NotAllowedError`, teardown).
- **Alternativa mais completa**: `standardized-audio-context-mock` (npm, MIT,
  latest 10.0.1, modificado **2026-06-20** — mantido pelo autor do
  `standardized-audio-context`; TS types; mesma API do SAC) se a equipe preferir um
  grafo falso mais completo em vez de hand-rolled. Bem-visto, mas adiciona uma
  camada de abstração desnecessária para um único uso de `AnalyserNode`.

### Recomendação (d)

Shim manual por teste (`vi.stubGlobal`/`vi.fn()` + `vi.unstubAllGlobals()`),
injetando senoide sintética no `getFloatTimeDomainData` para o teste do serviço de
microfone; a matemática do detector (ACF2+/pitchy) é testada com buffers puros,
sem jsdom/Web Audio. Se aparecer a necessidade de um grafo falso maior, usar
`standardized-audio-context-mock`; não usar `web-audio-test-api`/`web-audio-mock`/
`faking-media-streams` (mortos ou sem finalidade para unit test).

---

## Resumo das recomendações

1. **tune.js** — não importar do npm (ESM vazio; pacote 2017/MIT, 1,2 MB): *vendor
   próprio* da classe `Tune` + tabelas `ji_12`/`pyth_12`/`meanten`/`werck3`(+`werck6`)/`equal`
   como módulo TS tipado; ou, na segunda opção, carregar o arquivo completo via
   `angular.json → options.scripts` (global) + `.d.ts` ambiente.
2. **Detecção** — `pitchy@4.1.0` (ESM, tipos inclusos, ~33 KB, MPM com `clarity`,
   já usada neste repo antes do `d30bad6`). ACF2+ fica como fallback zero-dep,
   documentando o vazamento de globals e a falta de `clarity`.
3. **getUserMedia** — `{ autoGainControl: false, echoCancellation: false,
   noiseSuppression: false, channelCount: 1 }`, sem `exact` no `sampleRate`; sempre
   usar `audioContext.sampleRate` no detector; `fftSize=2048`, loop por rAF.
4. **Testes** — detectores puros com senóides sintéticas (sem mock de Web Audio);
   serviço de mic com shim manual em Vitest (`vi.stubGlobal('AudioContext', …)`,
   `mediaDevices` via `defineProperty`, `getFloatTimeDomainData` escrevendo sinal
   determinístico); `standardized-audio-context-mock` apenas se precisar de grafo
   maior.