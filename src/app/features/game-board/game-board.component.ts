import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../core/services/audio.service';
import { GraphEngineService } from '../../core/services/graph-engine.service';
import { NoteNode, NoteEdge, EdgeType } from '../../core/models/note.model';
import { TONNETZ_PRESETS } from '../../core/models/tonnetz-coordinate.model';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-black text-slate-100 flex flex-col">

      <!-- ============ HEADER UNIFICADO ============ -->
      <header class="sticky top-0 z-20 bg-black/70 backdrop-blur-md border-b border-slate-800/70">
        <div class="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">

          <!-- Título + status de áudio -->
          <div class="flex items-center gap-4">
            <div class="flex flex-col">
              <h1 class="text-lg font-bold tracking-tight text-slate-100">Tonnetz Puzzle</h1>
              <span class="text-[11px] uppercase tracking-widest text-slate-500">Malha Harmônica</span>
            </div>

            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800/70 bg-black/50">
              <span
                class="w-2.5 h-2.5 rounded-full"
                [ngClass]="audioInitialized()
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                  : 'bg-slate-800'"></span>
              <span class="text-xs font-medium" [class.text-emerald-400]="audioInitialized()" [class.text-slate-500]="!audioInitialized()">
                {{ audioInitialized() ? 'ÁUDIO ATIVO' : 'ÁUDIO INATIVO' }}
              </span>
            </div>
          </div>

          <!-- Seletores -->
          <div class="flex items-center gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Nota Raiz</span>
              <select
                [value]="currentRootPitchClass()"
                (change)="onRootChange($event)"
                class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 hover:border-slate-700 transition-colors cursor-pointer">
                <option *ngFor="let note of availableRoots" [value]="note.pitchClass">
                  {{ note.name }} · {{ note.labelPt }}
                </option>
              </select>
            </label>

            <label class="flex flex-col gap-1">
              <span class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Configuração</span>
              <select
                [value]="currentPreset()"
                (change)="onPresetChange($event)"
                class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 hover:border-slate-700 transition-colors cursor-pointer">
                <option value="classic">Clássico (3,4,5)</option>
                <option value="wholetone">Tons Inteiros (2,4,6)</option>
                <option value="chromatic">Cromático (1,4,7)</option>
                <option value="diminished">Diminuto (1,3,8)</option>
                <option value="augmented">Aumentado (4,4,4)</option>
              </select>
            </label>
          </div>

          <!-- Controles de áudio -->
          <div class="flex items-center gap-2">
            <button
              (click)="initializeAudio()"
              [disabled]="audioInitialized()"
              class="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                border
                disabled:cursor-not-allowed
                text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10">
              {{ audioInitialized() ? 'Áudio OK' : 'Inicializar Áudio' }}
            </button>

            <button
              (click)="stopAllSounds()"
              [disabled]="!audioInitialized()"
              class="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                disabled:cursor-not-allowed disabled:opacity-40
                text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10">
              Parar Sons
            </button>
          </div>
        </div>
      </header>

      <!-- ============ ÁREA PRINCIPAL ============ -->
      <main class="flex-1 p-6">
        <div class="max-w-7xl mx-auto">

          <!-- Tabuleiro + Painel Lateral -->
          <div class="flex gap-3 items-stretch">

          <!-- Malha Harmônica (canvas SVG) -->
          <div class="relative flex-1 min-w-0 h-[500px] md:h-[650px] rounded-2xl overflow-hidden bg-black/80 border border-slate-800/70 backdrop-blur-md shadow-2xl shadow-black/60">

            <!-- SVG Responsivo -->
            <svg
              [attr.viewBox]="viewBox"
              preserveAspectRatio="xMidYMid meet"
              (click)="onSvgClick($event)"
              class="w-full h-full block select-none">

              <!-- Camada de arestas (três eixos vetoriais) -->
              <g>
                <line
                  *ngFor="let edge of edges"
                  [attr.x1]="getNodeById(edge.from)?.x"
                  [attr.y1]="getNodeById(edge.from)?.y"
                  [attr.x2]="getNodeById(edge.to)?.x"
                  [attr.y2]="getNodeById(edge.to)?.y"
                  [ngClass]="getEdgeStrokeClass(edge)"
                  class="transition-all duration-200"
                  [attr.data-edge-type]="edge.type" />
              </g>

              <!-- Camada do trajeto do caminho (linha contínua sobre as arestas) -->
              <g *ngIf="pathPolylinePoints()">
                <polyline
                  [attr.points]="pathPolylinePoints()"
                  fill="none"
                  class="stroke-white stroke-[3px]"
                  style="filter: drop-shadow(0 0 6px rgba(255,255,255,0.8));"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  pointer-events="none" />
              </g>

              <!-- Camada de nós -->
              <g>
                <g
                  *ngFor="let node of nodes"
                  [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
                  (click)="onNodeClick(node, $event)"
                  class="cursor-pointer">

                  <circle
                    r="25"
                    [ngClass]="getNodeCircleClass(node)"
                    class="transition-all duration-200" />

                  <circle
                    *ngIf="isInPath(node.id)"
                    r="29"
                    fill="none"
                    class="stroke-white/60 stroke-[2px] pointer-events-none" />

                  <text
                    text-anchor="middle"
                    dominant-baseline="middle"
                    dy="1"
                    [ngClass]="getNodeLabelClass(node)"
                    class="text-sm font-bold pointer-events-none select-none">
                    {{ node.name }}
                  </text>
                </g>
              </g>
            </svg>

            <!-- Indicador de modo de navegação -->
            <div class="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/70 border border-slate-800/70 backdrop-blur-sm">
              <span class="text-[11px] font-medium text-slate-300 tracking-wide">
                Clique em um vizinho para estender o trajeto
              </span>
            </div>
          </div>

          <!-- Painel de Resumo (lateral, compacto) -->
            <aside class="w-52 shrink-0 hidden md:flex flex-col rounded-2xl bg-black/80 border border-slate-800/70 backdrop-blur-md shadow-2xl shadow-black/60 p-3">
              <div *ngIf="selectedNode(); else semSelecao" class="flex flex-col h-full min-h-0">

                <!-- Cabeçalho -->
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Resumo</h3>
                  <span
                    class="text-[9px] px-1.5 py-0.5 rounded-full"
                    [ngClass]="isSelectedRoot() ? 'bg-pink-500/20 text-pink-300' : 'bg-violet-500/20 text-violet-300'">
                    {{ isSelectedRoot() ? 'RAIZ' : 'NOTA' }}
                  </span>
                </div>

                <!-- Nota em destaque -->
                <div class="text-center py-2.5 mb-2 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <div
                    class="text-2xl font-bold leading-none"
                    [ngClass]="isSelectedRoot() ? 'text-pink-300' : 'text-violet-200'">
                    {{ selectedNode()?.name }}
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1">{{ selectedNode()?.labelPt }}</div>
                </div>

                <!-- Detalhes compactos -->
                <div class="space-y-1.5 text-xs">
                  <div class="flex justify-between">
                    <span class="text-slate-400">PC</span>
                    <span class="font-mono font-semibold text-white">{{ selectedNode()?.pitchClass }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Posição</span>
                    <span class="font-mono font-semibold text-violet-200">r{{ selectedNode()?.row }}·c{{ selectedNode()?.col }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Vizinhos</span>
                    <span class="font-mono font-semibold text-white">{{ currentNeighbors().length }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Passos</span>
                    <span class="font-mono font-semibold text-white">{{ pathLength() }}</span>
                  </div>
                </div>

                <!-- Ações (rodapé) -->
                <div class="mt-auto pt-3 space-y-1.5">
                  <button
                    *ngIf="pathLength() > 0"
                    (click)="clearPath()"
                    class="w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors duration-200
                      border border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10">
                    ✕ Limpar Caminho
                  </button>
                  <button
                    (click)="pinSelectedAsRoot()"
                    class="w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors duration-200
                      border border-pink-500/20 bg-pink-500/5 text-pink-300 hover:bg-pink-500/10">
                      Fixar como Raiz
                  </button>
                </div>
              </div>

              <!-- Estado vazio -->
              <ng-template #semSelecao>
                <div class="flex flex-col flex-1 items-center justify-center text-center gap-2">
                  <span class="text-xl text-slate-400">♪</span>
                  <p class="text-[10px] text-slate-400 leading-relaxed px-2">
                    Selecione um nó na malha para ver o resumo
                  </p>
                </div>
              </ng-template>
            </aside>
          </div>

          <!-- Legenda Harmônica -->
          <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span class="flex items-center gap-2">
              <span class="w-3 h-0.5 bg-cyan-500/70 rounded"></span> Quinta Justa (7) — eixo 0°
            </span>
            <span class="flex items-center gap-2">
              <span class="w-3 h-0.5 bg-amber-500/70 rounded"></span> Terça Maior (4) — eixo +60°
            </span>
            <span class="flex items-center gap-2">
              <span class="w-3 h-0.5 bg-emerald-500/70 rounded"></span> Terça Menor (3) — eixo -60°
            </span>
            <span class="flex items-center gap-2">
              <span class="w-3 h-0.5 bg-white/80 rounded"></span> Trajeto Ativo
            </span>
            <span class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-pink-600"></span> Raiz
            </span>
            <span class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-violet-600"></span> Selecionada
            </span>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class GameBoardComponent implements OnInit, OnDestroy {
  nodes: NoteNode[] = [];
  edges: NoteEdge[] = [];

  /** ID espacial do nó sob "cursor" (último clicado) */
  selectedNodeId = signal<string | null>(null);

  /** Vizinhos LOCAIS do nó selecionado (posição específica no tabuleiro) */
  currentNeighbors = signal<string[]>([]);

  /** Trajeto contínuo: sequência de IDs espaciais visitados */
  currentPath = signal<string[]>([]);

  audioInitialized = signal<boolean>(false);
  currentRootPitchClass = signal<number>(0);
  currentPreset = signal<string>('classic');

  viewBox = '0 0 800 600';

  availableRoots = [
    { pitchClass: 0, name: 'C', labelPt: 'Dó' },
    { pitchClass: 1, name: 'C#', labelPt: 'Dó#' },
    { pitchClass: 2, name: 'D', labelPt: 'Ré' },
    { pitchClass: 3, name: 'D#', labelPt: 'Ré#' },
    { pitchClass: 4, name: 'E', labelPt: 'Mi' },
    { pitchClass: 5, name: 'F', labelPt: 'Fá' },
    { pitchClass: 6, name: 'F#', labelPt: 'Fá#' },
    { pitchClass: 7, name: 'G', labelPt: 'Sol' },
    { pitchClass: 8, name: 'G#', labelPt: 'Sol#' },
    { pitchClass: 9, name: 'A', labelPt: 'Lá' },
    { pitchClass: 10, name: 'A#', labelPt: 'Lá#' },
    { pitchClass: 11, name: 'B', labelPt: 'Si' },
  ];

  /** Nó selecionado (derivado do sinal) */
  selectedNode = computed<NoteNode | undefined>(() => {
    const id = this.selectedNodeId();
    return id ? this.getNodeById(id) : undefined;
  });

  /** Pontos SVG da polilinha do trajeto contínuo */
  pathPolylinePoints = computed<string | null>(() => {
    const path = this.currentPath();
    if (path.length < 2) return null;

    const points = path
      .map(id => this.getNodeById(id))
      .filter((n): n is NoteNode => !!n)
      .map(n => `${n.x},${n.y}`);

    return points.length >= 2 ? points.join(' ') : null;
  });

  constructor(
    private audioService: AudioService,
    private graphEngine: GraphEngineService
  ) {}

  ngOnInit(): void {
    this.loadGraph();
    this.updateViewBox();
  }

  ngOnDestroy(): void {
    this.audioService.stopAll();
  }

  private loadGraph(): void {
    this.nodes = this.graphEngine.getAllNodes();
    this.edges = this.graphEngine.getAllEdges();

    // Limpar estado de navegação ao recarregar a malha
    this.selectedNodeId.set(null);
    this.currentNeighbors.set([]);
    this.currentPath.set([]);
  }

  private updateViewBox(): void {
    this.viewBox = this.graphEngine.getViewBox(40);
  }

  async initializeAudio(): Promise<void> {
    await this.audioService.initialize();
    this.audioInitialized.set(true);
  }

  /**
   * NAVEGAÇÃO LOCAL: clique interage com a posição específica no tabuleiro.
   *
   * - Clique em nó adjacente ao último do trajeto → estende o caminho
   * - Clique em nó não adjacente → inicia novo trajeto naquela posição
   * - Clique no último nó → desseleciona e limpa o trajeto
   */
  onNodeClick(node: NoteNode, event: Event): void {
    event.stopPropagation();

    const path = this.currentPath();
    const lastId = path.length > 0 ? path[path.length - 1] : null;

    // Clique no nó atual → desseleciona
    if (this.selectedNodeId() === node.id && lastId === node.id) {
      this.clearPath();
      return;
    }

    const isAdjacent = lastId !== null && this.graphEngine.areNeighbors(lastId, node.id);

    if (isAdjacent) {
      // Estender trajeto: avança para o vizinho ESPECÍFICO desta região
      this.currentPath.set([...path, node.id]);
      this.selectedNodeId.set(node.id);
      this.currentNeighbors.set(this.graphEngine.getNeighbors(node.id));
    } else {
      // Iniciar novo trajeto nesta posição local
      this.currentPath.set([node.id]);
      this.selectedNodeId.set(node.id);
      this.currentNeighbors.set(this.graphEngine.getNeighbors(node.id));
    }

    // Toca a nota com formato correto (ex: "C4", "F#4")
    this.audioService.playNote(this.getNoteName(node));
  }

  /**
   * Constrói o nome da nota no formato que o Tone.js espera
   */
  getNoteName(node: NoteNode): string {
    return `${node.name}${node.octave}`;
  }

  clearPath(): void {
    this.currentPath.set([]);
    this.selectedNodeId.set(null);
    this.currentNeighbors.set([]);
  }

  onSvgClick(event: Event): void {
    this.clearPath();
  }

  stopAllSounds(): void {
    this.audioService.stopAll();
  }

  onRootChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRoot = parseInt(select.value, 10);

    this.currentRootPitchClass.set(newRoot);
    this.graphEngine.setRootNote(newRoot);

    this.loadGraph();
    this.updateViewBox();
  }

  onPresetChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const presetName = select.value;

    this.currentPreset.set(presetName);

    const intervals = TONNETZ_PRESETS[presetName as keyof typeof TONNETZ_PRESETS];
    if (intervals) {
      this.graphEngine.setIntervals(intervals);
      this.loadGraph();
      this.updateViewBox();
    }
  }

  pinSelectedAsRoot(): void {
    const node = this.selectedNode();
    if (!node) return;

    this.currentRootPitchClass.set(node.pitchClass);
    this.graphEngine.setRootNote(node.pitchClass);

    this.loadGraph();
    this.updateViewBox();
  }

  getNodeById(nodeId: string): NoteNode | undefined {
    return this.graphEngine.getNode(nodeId);
  }

  isNeighbor(nodeId: string): boolean {
    return this.currentNeighbors().includes(nodeId);
  }

  isInPath(nodeId: string): boolean {
    return this.currentPath().includes(nodeId);
  }

  pathLength(): number {
    return this.currentPath().length;
  }

  /**
   * Determina se a nota selecionada também é instância da raiz
   */
  isSelectedRoot(): boolean {
    return !!this.selectedNode()?.isRoot;
  }

  /**
   * Classes de cor das arestas baseadas nos TRÊS EIXOS VETORIAIS FIXOS.
   * Cada tipo de aresta tem sempre o mesmo ângulo e a mesma cor.
   */
  getEdgeStrokeClass(edge: NoteEdge): string {
    switch (edge.type as EdgeType) {
      case 'perfectFifth': // Eixo Horizontal (0°)
        return 'stroke-cyan-500/40 stroke-[2px]';
      case 'majorThird': // Diagonal Subindo (+60°)
        return 'stroke-amber-500/40 stroke-[2px]';
      case 'minorThird': // Diagonal Descendo (-60°)
        return 'stroke-emerald-500/40 stroke-[2px]';
      default:
        return 'stroke-slate-700 stroke-[2px]';
    }
  }

  /**
   * Classes do círculo dos nós conforme estado LOCAL
   */
  getNodeCircleClass(node: NoteNode): string {
    // Nó Raiz (todas as instâncias da pitch class raiz)
    if (node.isRoot) {
      return 'fill-pink-600/80 stroke-pink-300 drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]';
    }

    // Último nó do trajeto (cursor atual)
    const path = this.currentPath();
    if (path.length > 0 && path[path.length - 1] === node.id) {
      return 'fill-violet-600 stroke-violet-300 drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]';
    }

    // Nós intermediários do trajeto
    if (this.isInPath(node.id)) {
      return 'fill-violet-600/90 stroke-violet-300';
    }

    // Vizinho LOCAL da nota atual (suave)
    if (this.isNeighbor(node.id)) {
      return 'fill-violet-600/30 stroke-violet-400/50 hover:fill-violet-600/50';
    }

    // Nó Inativo
    return 'fill-slate-950 stroke-slate-800 hover:fill-slate-900';
  }

  /**
   * Classes do rótulo (cifra) dos nós conforme estado
   */
  getNodeLabelClass(node: NoteNode): string {
    if (node.isRoot || this.isInPath(node.id)) {
      return 'fill-white';
    }
    if (this.isNeighbor(node.id)) {
      return 'fill-violet-100';
    }
    return 'fill-slate-300';
  }
}
