import { gauss, mulberry32 } from "./rng";

/** Documents, embeddings, retrieval, model, answer. */
const LAYER_SIZES = [7, 9, 6, 5, 3];
const X_SPAN = 5.4;
const Y_SPAN = 3.0;
const Z_SPAN = 0.9;
const NODE_SHARE = 0.38;
const NODE_RADIUS = 0.055;
const EDGES_PER_NODE = 3;

type Node = { x: number; y: number; z: number; layer: number };

/** Layered pipeline graph: nodes are dense bright clusters, edges are line-sampled particles. */
export function networkFormation(count: number): Float32Array {
  const rand = mulberry32(909);
  const out = new Float32Array(count * 3);

  const layers: Node[][] = LAYER_SIZES.map((size, l) => {
    const x = (l / (LAYER_SIZES.length - 1) - 0.5) * X_SPAN;
    return Array.from({ length: size }, (_, k) => {
      const t = size === 1 ? 0.5 : k / (size - 1);
      return {
        x: x + (rand() - 0.5) * 0.12,
        y: (t - 0.5) * Y_SPAN * (0.55 + 0.45 * Math.min(1, size / 7)) + (rand() - 0.5) * 0.14,
        z: (rand() - 0.5) * Z_SPAN,
        layer: l,
      };
    });
  });

  // Edges: each node connects forward to a few nearest-in-y nodes of the next layer.
  const edges: [Node, Node][] = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const a of layers[l]) {
      const next = [...layers[l + 1]].sort((p, q) => Math.abs(p.y - a.y) - Math.abs(q.y - a.y));
      const take = Math.min(next.length, EDGES_PER_NODE + (rand() < 0.4 ? 1 : 0));
      for (let k = 0; k < take; k++) edges.push([a, next[k]]);
    }
    // Make sure every next-layer node is reached.
    for (const b of layers[l + 1]) {
      if (!edges.some((e) => e[1] === b)) {
        const a = layers[l][Math.floor(rand() * layers[l].length)];
        edges.push([a, b]);
      }
    }
  }

  const nodes = layers.flat();
  const nodeCount = Math.floor(count * NODE_SHARE);
  let i = 0;
  for (; i < nodeCount; i++) {
    const n = nodes[i % nodes.length];
    // Output layer nodes read bigger: the answer is the point.
    const r = NODE_RADIUS * (n.layer === layers.length - 1 ? 1.7 : 1) * (0.6 + rand() * 0.8);
    const g = gauss(rand);
    const dir = [gauss(rand), gauss(rand), gauss(rand)];
    const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const rad = Math.abs(g) * r;
    out[i * 3] = n.x + (dir[0] / dl) * rad;
    out[i * 3 + 1] = n.y + (dir[1] / dl) * rad;
    out[i * 3 + 2] = n.z + (dir[2] / dl) * rad;
  }
  for (; i < count; i++) {
    const [a, b] = edges[Math.floor(rand() * edges.length)];
    const t = rand();
    // Slight sag so edges curve like synapses rather than ruler lines.
    const sag = Math.sin(Math.PI * t) * 0.05 * (a.y > b.y ? 1 : -1);
    out[i * 3] = a.x + (b.x - a.x) * t + gauss(rand) * 0.004;
    out[i * 3 + 1] = a.y + (b.y - a.y) * t + sag + gauss(rand) * 0.004;
    out[i * 3 + 2] = a.z + (b.z - a.z) * t + gauss(rand) * 0.004;
  }
  return out;
}
