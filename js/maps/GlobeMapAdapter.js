import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

export class GlobeMapAdapter {
  constructor(board, groundY = 0) {
    this.board = board;
    this.groundY = groundY;
    this.radius = 11.5;
    this.latMin = THREE.MathUtils.degToRad(-60);
    this.latMax = THREE.MathUtils.degToRad(60);
    this.center = new THREE.Vector3(0, this.groundY - this.radius - 0.1, board.h * board.tile * 0.5 - board.tile * 0.5);
    this.pickSphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius + 0.35, 28, 18),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.pickSphere.position.copy(this.center);
  }

  _toLatLon(x, z) {
    const u = this.board.w <= 1 ? 0 : x / (this.board.w - 1);
    const v = this.board.h <= 1 ? 0 : z / (this.board.h - 1);
    const lon = -Math.PI + u * Math.PI * 2;
    const lat = this.latMin + v * (this.latMax - this.latMin);
    return { lat, lon };
  }

  _surfaceFromLatLon(lat, lon, radius = this.radius) {
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    return new THREE.Vector3(x, y, z).multiplyScalar(radius).add(this.center);
  }

  cellToWorld(x, z) {
    const { lat, lon } = this._toLatLon(x, z);
    return this._surfaceFromLatLon(lat, lon);
  }

  worldToCell(worldPos) {
    const dir = worldPos.clone().sub(this.center).normalize();
    const lat = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    const lon = Math.atan2(dir.x, dir.z);
    const u = (lon + Math.PI) / (Math.PI * 2);
    const v = (lat - this.latMin) / (this.latMax - this.latMin);
    const x = Math.round(THREE.MathUtils.clamp(u, 0, 1) * (this.board.w - 1));
    const z = Math.round(THREE.MathUtils.clamp(v, 0, 1) * (this.board.h - 1));
    if (x < 0 || z < 0 || x >= this.board.w || z >= this.board.h) return null;
    return { x, z };
  }

  getSurfaceNormalAtCell(x, z) {
    return this.cellToWorld(x, z).sub(this.center).normalize();
  }

  getSurfaceNormalAtWorld(worldPos) {
    return worldPos.clone().sub(this.center).normalize();
  }

  getPickIntersection(ray) {
    const hits = new THREE.Raycaster(ray.origin, ray.direction).intersectObject(this.pickSphere);
    if (!hits.length) return null;
    const point = hits[0].point;
    return { point, normal: this.getSurfaceNormalAtWorld(point) };
  }

  buildTerrainMesh(theme, createTerrainTexture) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 50, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.97,
        metalness: 0.01,
        map: createTerrainTexture(theme)
      })
    );
    mesh.position.copy(this.center);
    mesh.receiveShadow = true;
    return mesh;
  }

  buildPathMesh(pathCells, width = this.board.tile * 0.86) {
    const centers = pathCells.map(([x, z]) => this.cellToWorld(x, z));
    const half = width * 0.5;
    const left = [];
    const right = [];
    for (let i = 0; i < centers.length; i++) {
      const prev = centers[Math.max(0, i - 1)];
      const next = centers[Math.min(centers.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const normal = this.getSurfaceNormalAtWorld(centers[i]);
      const side = new THREE.Vector3().crossVectors(tangent, normal).normalize().multiplyScalar(half);
      left.push(centers[i].clone().add(side).sub(this.center).normalize().multiplyScalar(this.radius + 0.05).add(this.center));
      right.push(centers[i].clone().sub(side).sub(this.center).normalize().multiplyScalar(this.radius + 0.05).add(this.center));
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
    const up = new THREE.Vector3(0, 1, 0);
    for (const [x, z] of nonPathCells) {
      const p = this.cellToWorld(x, z);
      const n = this.getSurfaceNormalAtCell(x, z);
      const pad = new THREE.Mesh(padGeo);
      const ring = new THREE.Mesh(topGeo);
      const q = new THREE.Quaternion().setFromUnitVectors(up, n);
      pad.quaternion.copy(q);
      ring.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(up, -Math.PI / 2));
      pad.position.copy(p).addScaledVector(n, 0.038);
      ring.position.copy(p).addScaledVector(n, 0.072);
      pads.push({ key: `${x},${z}`, pad, ring });
    }
    return pads;
  }

  samplePath(path, progress) {
    if (!path?.length) return null;
    if (path.length === 1) {
      const position = this.cellToWorld(path[0][0], path[0][1]);
      const normal = this.getSurfaceNormalAtWorld(position);
      return { position, normal, tangent: new THREE.Vector3(1, 0, 0).projectOnPlane(normal).normalize() };
    }
    const clamped = Math.min(1, Math.max(0, progress));
    const scaled = clamped * (path.length - 1);
    const idx = Math.min(path.length - 2, Math.floor(scaled));
    const frac = scaled - idx;
    const aDir = this.cellToWorld(path[idx][0], path[idx][1]).sub(this.center).normalize();
    const bDir = this.cellToWorld(path[idx + 1][0], path[idx + 1][1]).sub(this.center).normalize();
    const dir = aDir.clone().lerp(bDir, frac).normalize();
    const position = dir.clone().multiplyScalar(this.radius).add(this.center);
    const normal = dir.clone();
    const nextPos = bDir.clone().multiplyScalar(this.radius).add(this.center);
    const tangent = nextPos.sub(position).projectOnPlane(normal).normalize();
    return { position, tangent, normal };
  }

  dispose() {
    this.pickSphere.geometry.dispose();
    this.pickSphere.material.dispose();
  }
}
