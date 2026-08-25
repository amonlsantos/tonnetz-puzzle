import { describe, it, expect } from 'vitest';
import {
  buildTonnetzGraph,
  getEdgeTypeName,
  calculatePitchClass,
  generateNodeId,
  parseNodeId,
} from './tonnetz-coordinate-builder';
import { TONNETZ_PRESETS } from '../models/tonnetz-coordinate.model';

describe('Tonnetz Coordinate Builder (Matriz Isométrica)', () => {
  describe('buildTonnetzGraph', () => {
    it('deve criar grade com dimensões especificadas', () => {
      const graph = buildTonnetzGraph(6, 10, 0, TONNETZ_PRESETS['classic']);

      expect(graph.rows).toBe(6);
      expect(graph.cols).toBe(10);
      expect(graph.nodes.length).toBe(6 * 10);
    });

    it('deve criar grade 1x1', () => {
      const graph = buildTonnetzGraph(1, 1, 0);
      expect(graph.nodes.length).toBe(1);
      expect(graph.edges.length).toBe(0);
    });

    it('deve criar grade com raiz C (0)', () => {
      const graph = buildTonnetzGraph(3, 3, 0);
      const roots = graph.nodes.filter(n => n.isRoot);

      expect(roots.length).toBeGreaterThanOrEqual(1);
      expect(roots.every(n => n.pitchClass === 0)).toBe(true);
      expect(roots.every(n => n.name === 'C')).toBe(true);
    });

    it('deve criar grade com raiz D (2)', () => {
      const graph = buildTonnetzGraph(3, 3, 2);
      const roots = graph.nodes.filter(n => n.isRoot);

      expect(roots.length).toBeGreaterThanOrEqual(1);
      expect(roots.every(n => n.pitchClass === 2)).toBe(true);
      expect(roots.every(n => n.name === 'D')).toBe(true);
    });

    it('deve criar grade com raiz F# (6)', () => {
      const graph = buildTonnetzGraph(3, 3, 6);
      const roots = graph.nodes.filter(n => n.isRoot);

      expect(roots.length).toBeGreaterThanOrEqual(1);
      expect(roots.every(n => n.pitchClass === 6)).toBe(true);
    });

    it('deve normalizar pitch class fora do intervalo [0, 11]', () => {
      const graph1 = buildTonnetzGraph(2, 2, 12);
      expect(graph1.nodes[0].pitchClass).toBe(0);

      const graph2 = buildTonnetzGraph(2, 2, -1);
      expect(graph2.nodes[0].pitchClass).toBe(11);
    });

    it('deve ter múltiplas instâncias da mesma pitch class na grade', () => {
      const graph = buildTonnetzGraph(6, 10, 0);

      // Com 60 nós e 12 pitch classes, a maioria aparece mais de uma vez
      const pitchClassCounts = new Map<number, number>();
      graph.nodes.forEach(n => {
        pitchClassCounts.set(n.pitchClass, (pitchClassCounts.get(n.pitchClass) ?? 0) + 1);
      });

      // A raiz (C=0) deve aparecer mais de uma vez em 6x10
      expect(pitchClassCounts.get(0)!).toBeGreaterThan(1);
    });

    it('IDs dos nós devem ser baseados em coordenada espacial', () => {
      const graph = buildTonnetzGraph(3, 3, 0);

      graph.nodes.forEach(node => {
        expect(node.id).toMatch(/^node_r\d+_c\d+$/);
      });
    });

    it('nós devem ter propriedades row e col', () => {
      const graph = buildTonnetzGraph(3, 3, 0);

      graph.nodes.forEach(node => {
        expect(typeof node.row).toBe('number');
        expect(typeof node.col).toBe('number');
        expect(node.row).toBeGreaterThanOrEqual(0);
        expect(node.col).toBeGreaterThanOrEqual(0);
      });
    });

    it('todos os nós devem ter pitch class entre 0 e 11', () => {
      const graph = buildTonnetzGraph(6, 10, 0);

      graph.nodes.forEach(node => {
        expect(node.pitchClass).toBeGreaterThanOrEqual(0);
        expect(node.pitchClass).toBeLessThan(12);
      });
    });

    it('arestas devem conectar nós existentes', () => {
      const graph = buildTonnetzGraph(6, 10, 0);
      const nodeIds = new Set(graph.nodes.map(n => n.id));

      graph.edges.forEach(edge => {
        expect(nodeIds.has(edge.from)).toBe(true);
        expect(nodeIds.has(edge.to)).toBe(true);
      });
    });

    it('arestas devem ter tipos semânticos válidos', () => {
      const graph = buildTonnetzGraph(6, 10, 0);
      const validTypes = ['perfectFifth', 'majorThird', 'minorThird'];

      graph.edges.forEach(edge => {
        expect(validTypes).toContain(edge.type);
      });
    });

    it('arestas horizontais (perfectFifth) devem ter intervalo 7', () => {
      const graph = buildTonnetzGraph(4, 4, 0, TONNETZ_PRESETS['classic']);
      const horizontalEdges = graph.edges.filter(e => e.type === 'perfectFifth');

      horizontalEdges.forEach(edge => {
        expect(edge.interval).toBe(7);
      });
    });

    it('arestas diagonais subindo (majorThird) devem ter intervalo 4', () => {
      const graph = buildTonnetzGraph(4, 4, 0, TONNETZ_PRESETS['classic']);
      const majorEdges = graph.edges.filter(e => e.type === 'majorThird');

      majorEdges.forEach(edge => {
        expect(edge.interval).toBe(4);
      });
    });

    it('arestas diagonais descendo (minorThird) devem ter intervalo 3', () => {
      const graph = buildTonnetzGraph(4, 4, 0, TONNETZ_PRESETS['classic']);
      const minorEdges = graph.edges.filter(e => e.type === 'minorThird');

      minorEdges.forEach(edge => {
        expect(edge.interval).toBe(3);
      });
    });

    it('não deve ter arestas duplicadas', () => {
      const graph = buildTonnetzGraph(6, 10, 0);
      const edgeKeys = new Set<string>();

      graph.edges.forEach(edge => {
        const key = [edge.from, edge.to].sort().join('|');
        expect(edgeKeys.has(key)).toBe(false);
        edgeKeys.add(key);
      });
    });

    it('deve funcionar com diferentes presets', () => {
      Object.entries(TONNETZ_PRESETS).forEach(([name, intervals]) => {
        const graph = buildTonnetzGraph(3, 3, 0, intervals);

        expect(graph.nodes.length).toBe(9);
        expect(graph.edges.length).toBeGreaterThan(0);
      });
    });

    it('deve lançar erro para intervalos inválidos', () => {
      const invalidIntervals = { interval1: 0, interval2: 4, interval3: 7 };

      expect(() => {
        buildTonnetzGraph(3, 3, 0, invalidIntervals);
      }).toThrow();
    });

    it('deve lançar erro para dimensões inválidas', () => {
      expect(() => buildTonnetzGraph(0, 10, 0)).toThrow();
      expect(() => buildTonnetzGraph(10, 0, 0)).toThrow();
    });
  });

  describe('calculatePitchClass', () => {
    it('raiz no (0,0) deve ser a nota raiz', () => {
      expect(calculatePitchClass(0, 0, 0, TONNETZ_PRESETS['classic'])).toBe(0);
      expect(calculatePitchClass(7, 0, 0, TONNETZ_PRESETS['classic'])).toBe(7);
    });

    it('deslocamento horizontal (col+1) deve ser quinta justa (+7)', () => {
      const root = 0;
      expect(calculatePitchClass(root, 0, 1, TONNETZ_PRESETS['classic'])).toBe(7);
      expect(calculatePitchClass(root, 0, 2, TONNETZ_PRESETS['classic'])).toBe(2);
    });

    it('deslocamento diagonal descendo (row+1) deve ser terça menor (+3)', () => {
      const root = 0;
      expect(calculatePitchClass(root, 1, 0, TONNETZ_PRESETS['classic'])).toBe(3);
      expect(calculatePitchClass(root, 2, 0, TONNETZ_PRESETS['classic'])).toBe(6);
    });

    it('deslocamento diagonal subindo (row-1, col+1) deve ser terça maior (+4)', () => {
      const root = 0;
      // (row-1, col+1): mudanca = -3 + 7 = +4
      // Testar de um ponto: em (1, 0) = Eb, subir-direita = (0, 1) = G
      // A mudanca de (1,0) para (0,1) = 7 - 3 = 4, i.e., de 3 para 7 = +4 ✓
      const pitchA = calculatePitchClass(root, 1, 0, TONNETZ_PRESETS['classic']);
      const pitchB = calculatePitchClass(root, 0, 1, TONNETZ_PRESETS['classic']);
      expect(((pitchB - pitchA) % 12 + 12) % 12).toBe(4);
    });
  });

  describe('generateNodeId / parseNodeId', () => {
    it('deve gerar ID correto para coordenadas', () => {
      expect(generateNodeId(0, 0)).toBe('node_r0_c0');
      expect(generateNodeId(2, 5)).toBe('node_r2_c5');
      expect(generateNodeId(-1, 3)).toBe('node_r-1_c3');
    });

    it('deve fazer parse de ID correto', () => {
      expect(parseNodeId('node_r2_c5')).toEqual({ row: 2, col: 5 });
      expect(parseNodeId('node_r0_c0')).toEqual({ row: 0, col: 0 });
      expect(parseNodeId('node_r-1_c3')).toEqual({ row: -1, col: 3 });
    });

    it('deve retornar null para IDs inválidos', () => {
      expect(parseNodeId('note_C')).toBeNull();
      expect(parseNodeId('invalid')).toBeNull();
      expect(parseNodeId('node_r_c')).toBeNull();
    });

    it('roundtrip generate → parse deve ser consistente', () => {
      for (let r = -5; r <= 5; r++) {
        for (let c = -5; c <= 5; c++) {
          const id = generateNodeId(r, c);
          const parsed = parseNodeId(id);
          expect(parsed).toEqual({ row: r, col: c });
        }
      }
    });
  });

  describe('getEdgeTypeName', () => {
    it('deve retornar nome correto para terça menor', () => {
      expect(getEdgeTypeName('minorThird')).toBe('terça menor');
    });

    it('deve retornar nome correto para terça maior', () => {
      expect(getEdgeTypeName('majorThird')).toBe('terça maior');
    });

    it('deve retornar nome correto para quinta justa', () => {
      expect(getEdgeTypeName('perfectFifth')).toBe('quinta justa');
    });
  });
});
