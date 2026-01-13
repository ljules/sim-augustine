import { Injectable } from '@angular/core';
import { CircuitProfile } from '../../domain/types';

const KEY = 'circuitProfile';

@Injectable({ providedIn: 'root' })
export class CircuitStoreService {
  private circuit: CircuitProfile | null = null;

  setCircuit(c: CircuitProfile) {
    this.circuit = c;
    localStorage.setItem(KEY, JSON.stringify(c));
  }

  getCircuit(): CircuitProfile | null {
    if (this.circuit) return this.circuit;
    const raw = localStorage.getItem(KEY);
    this.circuit = raw ? JSON.parse(raw) : null;
    return this.circuit;
  }

  clear() {
    this.circuit = null;
    localStorage.removeItem(KEY);
  }
}
