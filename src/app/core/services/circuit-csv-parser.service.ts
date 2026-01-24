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
            Papa.parse<ShellCircuitRow>(cleanText,{
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''), // sécurité BOM

                complete: (results) => {
                    if (results.errors?.length) {
                        reject(new Error(results.errors[0].message));
                        return;
                    }

                    const fields = (results.meta?.fields ?? []).map(f => f.trim());

                    const hasShell =
                        fields.includes('Distance from Lap Line (m)') &&
                        fields.includes('Elevation (m)');

                    const hasSimple =
                        (fields.includes('d (m)') || fields.includes('D (m)') || fields.includes('distance') || fields.includes('s')) &&
                        (fields.includes('z (m)') || fields.includes('Z (m)') || fields.includes('altitude') || fields.includes('z'));

                    // --- Mode 1 : CSV officiel Shell ---
                    if (hasShell) {
                        const rows = (results.data ?? []).filter((r: any) =>
                            r &&
                            Number.isFinite(r['Distance from Lap Line (m)']) &&
                            Number.isFinite(r['Elevation (m)'])
                        );

                        if (rows.length < 2) {
                            reject(new Error('CSV invalide : pas assez de points.'));
                            return;
                        }

                        const s = rows.map((r: any) => Number(r['Distance from Lap Line (m)']));
                        const z = rows.map((r: any) => Number(r['Elevation (m)']));
                        const utmX = rows.map((r: any) => Number(r.UTMX));
                        const utmY = rows.map((r: any) => Number(r.UTMY));
                        const lon = rows.map((r: any) => Number(r.LongX));
                        const lat = rows.map((r: any) => Number(r.LatY));

                        for (let i = 1; i < s.length; i++) {
                            if (!(s[i] > s[i - 1])) {
                                reject(new Error(`CSV invalide : distance non strictement croissante à la ligne ${i + 2}.`));
                                return;
                            }
                        }

                        resolve({ name: circuitName, s, z, utmX, utmY, lon, lat });
                        return;
                    }

                    // --- Mode 2 : CSV simple d,z (ton fichier perso) ---
                    if (hasSimple) {
                        // Essaie plusieurs noms de colonnes possibles
                        const pick = (r: any, names: string[]) => {
                            for (const n of names) if (r[n] != null) return r[n];
                            return undefined;
                        };

                        const dNames = ['d (m)', 'D (m)', 'distance', 's'];
                        const zNames = ['z (m)', 'Z (m)', 'altitude', 'z'];

                        const rows = (results.data ?? []).filter((r: any) =>
                            r &&
                            Number.isFinite(Number(pick(r, dNames))) &&
                            Number.isFinite(Number(pick(r, zNames)))
                        );

                        if (rows.length < 2) {
                            reject(new Error('CSV invalide (simple d,z) : pas assez de points.'));
                            return;
                        }

                        const s = rows.map((r: any) => Number(pick(r, dNames)));
                        const z = rows.map((r: any) => Number(pick(r, zNames)));

                        for (let i = 1; i < s.length; i++) {
                            if (!(s[i] > s[i - 1])) {
                                reject(new Error(`CSV invalide : distance non strictement croissante à la ligne ${i + 2}.`));
                                return;
                            }
                        }

                        // On remplit les autres tableaux (non utilisés dans la simu) avec NaN
                        const utmX = s.map(() => Number.NaN);
                        const utmY = s.map(() => Number.NaN);
                        const lon = s.map(() => Number.NaN);
                        const lat = s.map(() => Number.NaN);

                        resolve({ name: circuitName, s, z, utmX, utmY, lon, lat });
                        return;
                    }

                    reject(new Error(
                        "CSV non reconnu. Attendu soit le format Shell (Distance from Lap Line (m), Elevation (m), ...), " +
                        "soit un format simple (d (m), z (m))."
                    ));
                },


            });
        });
    }
}
