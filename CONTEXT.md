# Tonnetz Puzzle

Um quebra-cabeça harmônico no navegador: o jogador percorre uma malha (Tonnetz) movendo-se entre vizinhos ou seguindo a nota tocada no microfone, com foco em fluência do braço de guitarra/piano.

## Language

**Malha**:
O Tonnetz isométrico renderizado no SVG, com nós como alturas e três eixos de intervalo (quinta justa, terça maior, terça menor).
_Avoid_: Tabuleiro, grid

**Nó**:
Uma célula da malha identificada pela coordenada espacial (`node_r{r}_c{c}`), que carrega uma classe de altura e uma posição visual.
_Avoid_: Nota como identidade (duas células podem ter a mesma classe de altura)

**Classe de altura**:
O tom de uma nota independente da oitava, numerado 0–11 (C=0).
_Avoid_: Nota, pitch class por extenso (mantém o termo em inglês? Não — use classe de altura)

**Vizinho local**:
Um nó fisicamente adjacente ao nó atual na malha pela grade; a navegação do jogo só avança para vizinhos.
_Avoid_: Nó conectado, adjacência gráfica

**Trajeto**:
Sequência de nós visitados com navegação local; o estado desenhado como polilinha no SVG.
_Avoid_: Caminho (reservado para caminho mínimo), rota

**Caminho mínimo**:
Seqüência de nós entre dois pontos calculada por grafo (graphology) — base da nota-e-destino e das dicas.
_Avoid_: Trajeto (é a trilha jogada, não o ótimo)

**Altura (pitch)**:
O tom real detectado do áudio, em Hz; a detecção de altura extrai a freqüência fundamental do sinal do microfone.
_Avoid_: Nota (é o rótulo da classe de altura, não o sinal)

**Classe de altura detectada**:
A classe de altura (0–11) derivada da altura detectada — o que o modo move a malha ao reconhecer.
_Avoid_: Nota cantada/tocada como evento único

**Desvio em cents**:
A distância, em cents, entre a altura detectada e a nota alvo do temperamento; o afinador exibe isso em tempo real.
_Avoid_: Desafinação, erro de afinação

**Temperamento**:
O sistema de afinação que mapeia freqüências em notas (igual, pitagórico, meantone, werckmeister); no MVP só o igual rege a navegação.
_Avoid_: escala, afinação como sinônimo

**Modo instrumento**:
Modo de navegação ativado por toggle em que o microfone capta um instrumento real (monofônico, uma nota por vez) e a classe de altura detectada move o cursor pela malha seguindo as mesmas regras do clique.
_Avoid_: Modo voz, modo canto, modo microfone

**Grafia enarmônica**:
Convenção de rotulagem dos nomes das notas (sustenido D# vs bemol Eb). A classe 3 hoje é exibida como D#/Ré#, mas os comentários do código e a convenção de intervalos a tratam como Eb/Mi♭. Decisão pendente: se o display e a malha acompanham.

**Síntese**:
Reprodução de notas (Tone.js) ao navegar; fica emudecida durante o modo instrumento, quando o áudio que importa é o do instrumento real.
_Avoid_: Audio playback