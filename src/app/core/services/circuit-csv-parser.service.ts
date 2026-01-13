import { Injectable } from '@angular/core';
import Papa from 'papaparse';
import { CircuitProfile } from '../../domain/types';

type ShellCircuitRow = {
  'Distance from Lap Line (m)': number;
  'Elevation (m)': number;
  UTMX: number;
  UTMY: number;
  LongX: number;
  LatY: number;
};

@Injectable({ providedIn: 'root' })
export class CircuitCsvParserService {

  async parseShellCsv(file: File, circuitName = file.name): Promise<CircuitProfile> {
    const text = await file.text();

    // Important: certains CSV ont un BOM UTF-8 au début (ex: "﻿Distance...")
    const cleanText = text.replace(/^\uFEFF/, '');

    return new Promise<CircuitProfile>((resolve, reject) => {
      Papa.parse<ShellCircuitRow>(cleanText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''), // sécurité BOM
        complete: (results) => {
          if (results.errors?.length) {
            reject(new Error(results.errors[0].message));
            return;
          }

          const rows = (results.data ?? []).filter(r =>
            r &&
            Number.isFinite(r['Distance from Lap Line (m)']) &&
            Number.isFinite(r['Elevation (m)'])
          );

          if (rows.length < 2) {
            reject(new Error('CSV invalide : pas assez de points.'));
            return;
          }

          // mapping + validations de base
          const s = rows.map(r => Number(r['Distance from Lap Line (m)']));
          const z = rows.map(r => Number(r['Elevation (m)']));
          const utmX = rows.map(r => Number(r.UTMX));
          const utmY = rows.map(r => Number(r.UTMY));
          const lon = rows.map(r => Number(r.LongX));
          const lat = rows.map(r => Number(r.LatY));

          // Validation: distance strictement croissante
          for (let i = 1; i < s.length; i++) {
            if (!(s[i] > s[i - 1])) {
              reject(new Error(`CSV invalide : distance non strictement croissante à la ligne ${i + 2}.`));
              return;
            }
          }

          resolve({
            name: circuitName,
            s, z, utmX, utmY, lon, lat
          });
        },
      });
    });
  }
}
