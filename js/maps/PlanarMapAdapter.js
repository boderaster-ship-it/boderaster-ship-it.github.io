import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

export class PlanarMapAdapter {
  constructor(board, groundY = 0) {
    this.board = board;
    this.groundY = groundY;
    this.centerZ = board.h * board.tile * 0.5 - board.tile * 0.5;
    this.pickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(board.w * board.tile, board.h * board.tile),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    this.pickPlane.rotation.x = -Math.PI / 2;
    this.pickPlane.position.set(0, this.groundY + 0.18, this.centerZ);
  }

  cellToWorld(x, z) {
    return new THREE.Vector3((x - this.board.w / 2) * this.board.tile + this.board.tile * 0.5, this.groundY, z * this.board.tile);
  }

  worldToCell(worldPos) {
    const x = Math.floor((worldPos.x + this.board.w * this.board.tile * 0.5) / this.board.tile);
    const z = Math.floor(worldPos.z / this.board.tile);
    if (x < 0 || z < 0 || x >= this.board.w || z >= this.board.h) return null;
    return { x, z };
  }

  getSurfaceNormalAtCell() { return new THREE.Vector3(0, 1, 0); }
  getSurfaceNormalAtWorld() { return new THREE.Vector3(0, 1, 0); }

  getPickIntersection(ray) {
    const hits = new THREE.Raycaster(ray.origin, ray.direction).intersectObject(this.pickPlane);
    if (!hits.length) return null;
    return { point: hits[0].point, normal: new THREE.Vector3(0, 1, 0) };
  }

  buildTerrainMesh(theme, createTerrainTexture) {
    const extra = 14;
    const terrainW = (this.board.w + extra * 2) * this.board.tile;
    const terrainH = (this.board.h + extra * 2) * this.board.tile;
    const segW = this.board.w + extra * 2;
    const segH = this.board.h + extra * 2;
    const geometry = new THREE.PlaneGeometry(terrainW, terrainH, segW, segH);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.97,
      metalness: 0.01,
      map: createTerrainTexture(theme)
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.position.set(0, this.groundY - 0.03, this.centerZ);
    return mesh;
  }

  buildPathMesh(pathCells, width = this.board.tile * 0.86) {
    const centers = pathCells.map(([x, z]) => this.cellToWorld(x, z));
    const left = [];
    const right = [];
    const half = width * 0.5;
    for (let i = 0; i < centers.length; i++) {
      const prev = centers[Math.max(0, i - 1)];
      const next = centers[Math.min(centers.length - 1, i + 1)];
      const dir = next.clone().sub(prev).setY(0).normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(half);
      left.push(centers[i].clone().add(side).setY(this.groundY + 0.082));
      right.push(centers[i].clone().sub(side).setY(this.groundY + 0.082));
    }
    const vertices = [];
    const colors = [];
    const indices = [];
    for (let i = 0; i < centers.length; i++) {
      const t = centers.length <= 1 ? 0 : i / (centers.length - 1);
      const edgeFade = 0.76 + Math.sin(t * Math.PI) * 0.18;
      const centerFade = 0.88 + Math.sin(t * Math.PI * 2) * 0.06;
      vertices.push(left[i].x, left[i].y, left[i].z, right[i].x, right[i].y, right[i].z);
      colors.push(edgeFade, edgeFade, edgeFade, centerFade, centerFade, centerFade);
    }
    for (let i = 0; i < centers.length - 1; i++) {
      const idx = i * 2;
      indices.push(idx, idx + 2, idx + 1, idx + 1, idx + 2, idx + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry);
  }

  buildBuildPads(nonPathCells, boardTile) {
    const pads = [];
    const padGeo = new THREE.CylinderGeometry(boardTile * 0.41, boardTile * 0.44, 0.055, 18);
    const topGeo = new THREE.RingGeometry(boardTile * 0.3, boardTile * 0.41, 24);
    for (const [x, z] of nonPathCells) {
      const p = this.cellToWorld(x, z);
      const pad = new THREE.Mesh(padGeo);
      const ring = new THREE.Mesh(topGeo);
      pad.position.copy(p).setY(p.y + 0.038);
      ring.position.copy(p).setY(p.y + 0.072);
      ring.rotation.x = -Math.PI / 2;
      pads.push({ key: `${x},${z}`, pad, ring });
    }
    return pads;
  }

  samplePath(path, progress) {
    if (!path?.length) return null;
    if (path.length === 1) {
      return { position: this.cellToWorld(path[0][0], path[0][1]), tangent: new THREE.Vector3(0, 0, 1), normal: new THREE.Vector3(0, 1, 0) };
    }
    const clamped = Math.min(1, Math.max(0, progress));
    const scaled = clamped * (path.length - 1);
    const idx = Math.min(path.length - 2, Math.floor(scaled));
    const frac = scaled - idx;
    const a = this.cellToWorld(path[idx][0], path[idx][1]);
    const b = this.cellToWorld(path[idx + 1][0], path[idx + 1][1]);
    const position = a.clone().lerp(b, frac);
    const tangent = b.clone().sub(a).normalize();
    return { position, tangent, normal: new THREE.Vector3(0, 1, 0) };
  }

  dispose() {
    this.pickPlane.geometry.dispose();
    this.pickPlane.material.dispose();
  }
}
