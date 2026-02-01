import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CircuitProfile } from '../../domain/types';

@Component({
  selector: 'app-circuit-ribbon3d',
  standalone: true,
  imports: [],
  templateUrl: './circuit-ribbon3d.component.html',
  styleUrl: './circuit-ribbon3d.component.css'
})



export class CircuitRibbon3DComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('cv', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  /** Le circuit complet */
  @Input() circuit: CircuitProfile | null = null;

  /** Largeur du ruban en mètres (dans le repère UTM) */
  @Input() ribbonWidthMeters = 4;

  /** Exagération verticale (1 = réel, 2 = 2x plus "montagnes russes") */
  @Input() verticalExaggeration = 2;

  /** Position d’un marqueur (0..1) si tu veux l’utiliser en page simulation */
  @Input() progress01: number | null = null;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;

  private ribbonMesh: THREE.Mesh | null = null;
  private carMesh: THREE.Mesh | null = null;

  private animationId: number | null = null;

  // Pour positionner le marqueur sur le ruban
  private centerline: THREE.Vector3[] = [];
  private cumulativeLen: number[] = [];
  private totalLen = 0;

  // Grille & sol :
  private grid!: THREE.GridHelper;
  private ground!: THREE.Mesh;



  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // fond transparent -> s'intègre bien dans une card Bootstrap
    });

    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(0x9fd8ff); // sky blue


    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10_000);
    this.camera.position.set(0, 80, 100);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;

    // Un peu de lumière pour donner du relief au ruban
    const amb = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(120, 180, 90);
    this.scene.add(dir);

    // Une grille + axes (facultatif mais très CAO)
    //this.grid = new THREE.GridHelper(600, 20);  
    //this.scene.add(this.grid);

    //const axes = new THREE.AxesHelper(50);
    //this.scene.add(axes);

    // Sol vert
    // Sol (plan)
    const groundGeom = new THREE.PlaneGeometry(700, 400);
    const groundMat = new THREE.MeshStandardMaterial({
    color: 0x99FF99,        // vert herbe
    roughness: 1,
    metalness: 0,
    });

    this.ground = new THREE.Mesh(groundGeom, groundMat);

    // Orientation : Plane est XY par défaut, on le met en XZ
    this.ground.rotation.x = -Math.PI / 2;

    // Un peu sous le circuit (si besoin) : y=0 c'est bien si ton ruban est à y>=0
    this.ground.position.set(0, 0, 0);

    this.scene.add(this.ground);
 


    // Build initial if circuit already set
    if (this.circuit) this.rebuild();

    this.handleResize(); // init size
    window.addEventListener('resize', this.handleResize);

    this.renderLoop();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si le circuit change, on reconstruit
    if (changes['circuit'] || changes['ribbonWidthMeters'] || changes['verticalExaggeration']) {
      if (this.scene) this.rebuild();
    }

    // Si la position animée change (page simulation)
    if (changes['progress01']) {
      if (this.scene) this.updateCarPosition();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
    if (this.animationId) cancelAnimationFrame(this.animationId);

    this.controls?.dispose();
    this.renderer?.dispose();

    // cleanup meshes
    this.disposeMesh(this.ribbonMesh);
    this.disposeMesh(this.carMesh);
  }

  // ----------------------------
  // Core
  // ----------------------------

  private rebuild(): void {
    // Nettoyage
    this.disposeMesh(this.ribbonMesh);
    this.ribbonMesh = null;

    if (!this.circuit || this.circuit.utmX.length < 2) return;

    // 1) Construire la centerline en repère local
    const c = this.circuit;
    const n = Math.min(c.utmX.length, c.utmY.length, c.z.length);

    // Origine locale = premier point (évite des grosses valeurs UTM)
    const x0 = c.utmX[0];
    const z0 = c.utmY[0];

    this.centerline = [];
    for (let i = 0; i < n; i++) {
        const x = c.utmX[i] - x0;
    
        // min altitude → le point le plus bas est à y=0
        let zMin = Number.POSITIVE_INFINITY;
        for (let i = 0; i < n; i++) {
        const zi = c.z[i];
        if (Number.isFinite(zi) && zi < zMin) zMin = zi;
        }
        if (!Number.isFinite(zMin)) zMin = 0;

        const y = (c.z[i] - zMin) * this.verticalExaggeration;

        const z = -(c.utmY[i] - z0);
        this.centerline.push(new THREE.Vector3(x, y, z));
    }

    // 2) Construire le ruban (2 vertices par point : gauche/droite)
    const halfW = this.ribbonWidthMeters / 2;

    // Up global (vertical)
    const up = new THREE.Vector3(0, 1, 0);

    const leftPts: THREE.Vector3[] = [];
    const rightPts: THREE.Vector3[] = [];

    for (let i = 0; i < this.centerline.length; i++) {
      const p = this.centerline[i];

      // tangent (approx)
      const pPrev = this.centerline[Math.max(0, i - 1)];
      const pNext = this.centerline[Math.min(this.centerline.length - 1, i + 1)];
      const tangent = pNext.clone().sub(pPrev).normalize();

      // normal latérale = up x tangent (direction gauche/droite)
      // (si tangent est quasi vertical, fallback)
      let side = up.clone().cross(tangent);
      if (side.lengthSq() < 1e-8) side = new THREE.Vector3(1, 0, 0);
      side.normalize();

      leftPts.push(p.clone().add(side.clone().multiplyScalar(halfW)));
      rightPts.push(p.clone().add(side.clone().multiplyScalar(-halfW)));
    }

    // Triangle strip : (L0,R0,L1,R1,...)
    const positions: number[] = [];
    for (let i = 0; i < leftPts.length; i++) {
      const L = leftPts[i];
      const R = rightPts[i];
      positions.push(L.x, L.y, L.z);
      positions.push(R.x, R.y, R.z);
    }

    // Indices : 2 triangles par segment
    const indices: number[] = [];
    // vertex count = 2*n
    for (let i = 0; i < this.centerline.length - 1; i++) {
      const a = 2 * i;       // Li
      const b = 2 * i + 1;   // Ri
      const c1 = 2 * (i + 1);     // L(i+1)
      const d = 2 * (i + 1) + 1;  // R(i+1)

      // Deux triangles (a,b,c1) et (b,d,c1)
      indices.push(a, b, c1);
      indices.push(b, d, c1);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,     // gris asphalt
    metalness: 0.05,
    roughness: 0.9,      // mat
    side: THREE.DoubleSide,
    });


    this.ribbonMesh = new THREE.Mesh(geom, mat);
    this.scene.add(this.ribbonMesh);

    // 3) Préparer longueurs cumulées pour placer le marqueur
    this.buildCumulativeLengths();

    // 4) Marqueur (créé 1 fois)
    if (!this.carMesh) {
      const carGeom = new THREE.SphereGeometry(1.2, 16, 16);
      const carMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      this.carMesh = new THREE.Mesh(carGeom, carMat);
      this.scene.add(this.carMesh);
    }

    // 5) Fit camera + target
    this.fitCameraToRibbon();
    


    // 6) Position marker si progress fourni
    this.updateCarPosition();
  }

  private buildCumulativeLengths(): void {
    this.cumulativeLen = [0];
    this.totalLen = 0;

    for (let i = 1; i < this.centerline.length; i++) {
      this.totalLen += this.centerline[i].distanceTo(this.centerline[i - 1]);
      this.cumulativeLen.push(this.totalLen);
    }
  }

  private updateCarPosition(): void {
    if (!this.carMesh) return;
    if (!this.centerline.length) return;

    const p = this.progress01;
    if (p == null || !Number.isFinite(p)) {
      // si pas d’animation demandée : placer au départ
      this.carMesh.position.copy(this.centerline[0]);
      return;
    }

    const t = Math.min(1, Math.max(0, p));
    const targetLen = t * this.totalLen;

    // trouver le segment correspondant (recherche linéaire simple, ok pour n~quelques milliers)
    let i = 1;
    while (i < this.cumulativeLen.length && this.cumulativeLen[i] < targetLen) i++;

    if (i >= this.cumulativeLen.length) {
      this.carMesh.position.copy(this.centerline[this.centerline.length - 1]);
      return;
    }

    const l0 = this.cumulativeLen[i - 1];
    const l1 = this.cumulativeLen[i];
    const alpha = (targetLen - l0) / Math.max(1e-9, (l1 - l0));

    const p0 = this.centerline[i - 1];
    const p1 = this.centerline[i];
    this.carMesh.position.copy(p0.clone().lerp(p1, alpha));
  }

  private fitCameraToRibbon(): void {
    if (!this.ribbonMesh) return;

    const box = new THREE.Box3().setFromObject(this.ribbonMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 🎯 recentrer la grille sous le circuit
    if (this.grid) {
        this.grid.position.set(center.x, 0, center.z);
    }
    if (this.ground) {
        this.ground.position.set(center.x, 0, center.z);
    }


    // target orbit
    this.controls.target.copy(center);

    // position camera : recule selon la taille du ruban
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 0.6;

    this.camera.position.set(center.x + dist, center.y + dist * 0.7, center.z + dist);
    this.camera.near = 0.1;
    this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private renderLoop = (): void => {
    this.animationId = requestAnimationFrame(this.renderLoop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize = (): void => {
    if (!this.renderer || !this.camera) return;

    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (w <= 0 || h <= 0) return;

    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private disposeMesh(mesh: THREE.Mesh | null): void {
    if (!mesh) return;
    this.scene?.remove(mesh);

    const g = mesh.geometry as THREE.BufferGeometry;
    g?.dispose();

    const m = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(m)) m.forEach(mm => mm.dispose());
    else m?.dispose();
  }
}

