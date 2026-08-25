import { describe, it, expect } from 'vitest';
import { calculateLayout, calculateViewBox, calculateFillingSpacing } from './tonnetz-layout';
import { buildTonnetzGraph } from './tonnetz-coordinate-builder';
import { TONNETZ_PRESETS } from '../models/tonnetz-coordinate.model';

describe('Tonnetz Layout (Isométrico)', () => {
  describe('calculateLayout', () => {
    it('deve adicionar coordenadas visuais a todos os nós', () => {
      const graph = buildTonnetzGraph(6, 10, 0, TONNETZ_PRESETS['classic']);
      const renderable = calculateLayout(graph);

      expect(renderable.nodes.length).toBe(graph.nodes.length);

      renderable.nodes.forEach(node => {
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(isFinite(node.x)).toBe(true);
        expect(isFinite(node.y)).toBe(true);
      });
    });

    it('deve adicionar oitava aos nós', () => {
      const graph = buildTonnetzGraph(4, 4, 0);
      const renderable = calculateLayout(graph, { nodeSpacing: 100, baseOctave: 5 });

      renderable.nodes.forEach(node => {
        expect(node.octave).toBe(5);
      });
    });

    it('deve preservar todas as propriedades musicais', () => {
      const graph = buildTonnetzGraph(3, 3, 0);
      const renderable = calculateLayout(graph);

      renderable.nodes.forEach((renderNode, index) => {
        const originalNode = graph.nodes[index];
        expect(renderNode.id).toBe(originalNode.id);
        expect(renderNode.pitchClass).toBe(originalNode.pitchClass);
        expect(renderNode.row).toBe(originalNode.row);
        expect(renderNode.col).toBe(originalNode.col);
        expect(renderNode.isRoot).toBe(originalNode.isRoot);
      });
    });

    it('deve preservar todas as arestas', () => {
      const graph = buildTonnetzGraph(4, 4, 0);
      const renderable = calculateLayout(graph);

      expect(renderable.edges.length).toBe(graph.edges.length);

      renderable.edges.forEach((edge, index) => {
        const originalEdge = graph.edges[index];
        expect(edge.from).toBe(originalEdge.from);
        expect(edge.to).toBe(originalEdge.to);
        expect(edge.type).toBe(originalEdge.type);
        expect(edge.interval).toBe(originalEdge.interval);
      });
    });

    it('coords diferentes devem resultar em posições diferentes', () => {
      const graph = buildTonnetzGraph(4, 4, 0);
      const renderable = calculateLayout(graph);

      const coordinates = new Set<string>();

      renderable.nodes.forEach(node => {
        const key = `${node.x.toFixed(2)},${node.y.toFixed(2)}`;
        expect(coordinates.has(key)).toBe(false);
        coordinates.add(key);
      });
    });

    it('deve respeitar nodeSpacing na configuração', () => {
      const graph = buildTonnetzGraph(4, 4, 0);

      const layout1 = calculateLayout(graph, { nodeSpacing: 50, baseOctave: 4 });
      const layout2 = calculateLayout(graph, { nodeSpacing: 200, baseOctave: 4 });

      const range1 = getCoordinateRange(layout1.nodes);
      const range2 = getCoordinateRange(layout2.nodes);

      expect(range2.xRange).toBeGreaterThan(range1.xRange);
      expect(range2.yRange).toBeGreaterThan(range1.yRange);
    });

    it('malha deve ser centralizada (média ≈ origem)', () => {
      const graph = buildTonnetzGraph(6, 10, 0);
      const renderable = calculateLayout(graph);

      const avgX = renderable.nodes.reduce((sum, n) => sum + n.x, 0) / renderable.nodes.length;
      const avgY = renderable.nodes.reduce((sum, n) => sum + n.y, 0) / renderable.nodes.length;

      expect(Math.abs(avgX)).toBeLessThan(1);
      expect(Math.abs(avgY)).toBeLessThan(1);
    });

    it('ângulo entre eixos deve ser 60° (distâncias entre nós vizinhos)', () => {
      const graph = buildTonnetzGraph(3, 3, 0, TONNETZ_PRESETS['classic']);
      const renderable = calculateLayout(graph, { nodeSpacing: 100, baseOctave: 4 });

      // Encontrar um nó com ao menos 2 vizinhos
      const nodeMap = new Map(renderable.nodes.map(n => [n.id, n]));
      const aNode = renderable.nodes.find(n => n.row === 1 && n.col === 1);
      if (!aNode) return;

      // Distância para o nó à direita (horizontal)
      const rightId = `node_r${aNode.row}_c${aNode.col + 1}`;
      const right = nodeMap.get(rightId);

      // Distância para o nó descendo (diagonal)
      const downId = `node_r${aNode.row + 1}_c${aNode.col}`;
      const down = nodeMap.get(downId);

      if (right && down) {
        const distRight = Math.hypot(right.x - aNode.x, right.y - aNode.y);
        const distDown = Math.hypot(down.x - aNode.x, down.y - aNode.y);

        // Mesma distância (lattice regular)
        expect(distRight).toBeCloseTo(distDown, 0);

        // Ângulo ≈ 60°
        const dotProduct = (right.x - aNode.x) * (down.x - aNode.x) + (right.y - aNode.y) * (down.y - aNode.y);
        const cosAngle = dotProduct / (distRight * distDown);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        expect(angle).toBeCloseTo(60, 0);
      }
    });
  });

  describe('calculateFillingSpacing', () => {
    it('deve retornar espaçamento positivo', () => {
      const spacing = calculateFillingSpacing(6, 10, 800, 600);
      expect(spacing).toBeGreaterThan(0);
    });

    it('maior viewport deve resultar em maior espaçamento', () => {
      const s1 = calculateFillingSpacing(4, 4, 400, 300);
      const s2 = calculateFillingSpacing(4, 4, 800, 600);
      expect(s2).toBeGreaterThan(s1);
    });

    it('mais colunas deve resultar em menor espaçamento (maior densidade)', () => {
      const s1 = calculateFillingSpacing(4, 4, 800, 600);
      const s2 = calculateFillingSpacing(4, 10, 800, 600);
      expect(s2).toBeLessThan(s1);
    });
  });

  describe('calculateViewBox', () => {
    it('deve retornar string no formato correto', () => {
      const graph = buildTonnetzGraph(4, 4, 0);
      const renderable = calculateLayout(graph);
      const viewBox = calculateViewBox(renderable.nodes);

      const parts = viewBox.split(' ');
      expect(parts.length).toBe(4);

      parts.forEach(part => {
        expect(isNaN(Number(part))).toBe(false);
      });
    });

    it('deve incluir padding', () => {
      const graph = buildTonnetzGraph(4, 4, 0);
      const renderable = calculateLayout(graph);

      const viewBox1 = calculateViewBox(renderable.nodes, 50);
      const viewBox2 = calculateViewBox(renderable.nodes, 100);

      const [, , width1, height1] = viewBox1.split(' ').map(Number);
      const [, , width2, height2] = viewBox2.split(' ').map(Number);

      expect(width2).toBeGreaterThan(width1);
      expect(height2).toBeGreaterThan(height1);
    });

    it('deve retornar viewBox padrão para array vazio', () => {
      expect(calculateViewBox([])).toBe('0 0 100 100');
    });

    it('deve conter todos os nós dentro do viewBox', () => {
      const graph = buildTonnetzGraph(6, 10, 0);
      const renderable = calculateLayout(graph);
      const viewBox = calculateViewBox(renderable.nodes, 50);

      const [minX, minY, width, height] = viewBox.split(' ').map(Number);
      const maxX = minX + width;
      const maxY = minY + height;

      renderable.nodes.forEach(node => {
        expect(node.x).toBeGreaterThanOrEqual(minX);
        expect(node.x).toBeLessThanOrEqual(maxX);
        expect(node.y).toBeGreaterThanOrEqual(minY);
        expect(node.y).toBeLessThanOrEqual(maxY);
      });
    });
  });
});

function getCoordinateRange(nodes: { x: number; y: number }[]) {
  const xValues = nodes.map(n => n.x);
  const yValues = nodes.map(n => n.y);

  return {
    xRange: Math.max(...xValues) - Math.min(...xValues),
    yRange: Math.max(...yValues) - Math.min(...yValues),
  };
}
