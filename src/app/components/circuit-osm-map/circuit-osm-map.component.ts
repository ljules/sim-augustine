import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';

import * as L from 'leaflet';

export type LatLng = { lat: number; lng: number };

@Component({
  selector: 'app-circuit-osm-map',
  standalone: true,
  imports: [],
  templateUrl: './circuit-osm-map.component.html',
  styleUrl: './circuit-osm-map.component.css'
})


export class CircuitOsmMapComponent implements AfterViewInit, OnChanges {
  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  @Input() center: LatLng = { lat: 0, lng: 0 };
  @Input() zoom = 16;
  @Input() track: LatLng[] | null = null;

  private map!: L.Map;
  private marker!: L.Marker;
  private polyline: L.Polyline | null = null;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [this.center.lat, this.center.lng],
      zoom: this.zoom,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.marker = L.marker([this.center.lat, this.center.lng]).addTo(this.map);

    this.applyDataToMap(true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // La carte n'existe pas encore au premier passage (avant ngAfterViewInit)
    if (!this.map) return;

    // Quand center/track changent après import → on met à jour
    if (changes['center'] || changes['track']) {
      this.applyDataToMap(false);
    }
  }

  private applyDataToMap(isFirstRender: boolean): void {
    // 1) marker + center
    if (Number.isFinite(this.center.lat) && Number.isFinite(this.center.lng)) {
      this.marker.setLatLng([this.center.lat, this.center.lng]);
      if (isFirstRender && (!this.track || this.track.length < 2)) {
        this.map.setView([this.center.lat, this.center.lng], this.zoom);
      }
    }

    // 2) polyline + fitBounds
    if (this.track && this.track.length > 1) {
      const latlngs: L.LatLngExpression[] = this.track.map(p => [p.lat, p.lng]);

      if (!this.polyline) {
        this.polyline = L.polyline(latlngs, { weight: 4 }).addTo(this.map);
      } else {
        this.polyline.setLatLngs(latlngs);
      }

      // Important : forcer Leaflet à recalculer sa taille si le conteneur vient d'apparaître
      // (souvent le cas après *ngIf)
      setTimeout(() => {
        this.map.invalidateSize();
        this.map.fitBounds(this.polyline!.getBounds(), { padding: [16, 16] });
      }, 0);
    } else if (!isFirstRender) {
      // Si on n'a plus de track, on revient sur le centre
      this.map.setView([this.center.lat, this.center.lng], this.zoom);
    }
  }
}