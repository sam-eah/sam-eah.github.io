---
title: 'Web GIS App Part 2 - Front-end'
description: ''
pubDate: 'Nov 02 2021'
heroImage: '/future_town.png'
---

## Setup

```sh
$ ng new frontend
```

## OpenLayers

```sh
$ npm install --save ol @types/ol
```

Add in `angular.json`:

```json
"styles": [
    "src/styles.scss",
    "node_modules/ol/ol.css"
],
```

Add in `app.component.html`:

```html
<div id="ol-map" class="map-container"></div>
```

Add in `app.component.scss`:

```scss
:host {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.map-container {
  flex-grow: 1;
}
```

Add in `app.component.ts`:

```ts
import { Component, OnInit } from "@angular/core";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  map: Map = new Map({}); // Create empty map

  ngOnInit(): void {
    this.map = new Map({
      // Center map
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
      // Adds OSM layer background
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target: "ol-map",
    });
  }
}
```

## Connection with Django

Edit imports in `app.module.ts`:

```ts
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

imports: [
  BrowserModule,
  AppRoutingModule,
  BrowserAnimationsModule,
  HttpClientModule
],
```

Edit `environment.ts`:

```ts
export const environment = {
  production: false,
  backendUrl: "http://localhost:8000",
  downloadUrl: "http://localhost:8000",
  frontendUrl: "http://localhost:4200",
};
```

Créer un modèle `House` dans `data/models/house.ts`

```ts
export interface House {
  PHOTO: string;
  NAME: string;
  ADDRESS: string;
  SURFACE: string;
  POINT: {
    type: "Point";
    coordinates: [number, number];
  };
}
```

Créer un service `house.service.ts` :

```sh
$ ng g s data/service/house
```

```ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment as env } from "src/environments/environment";
import { House } from "../models/house";

@Injectable({
  providedIn: "root",
})
export class HouseService {
  constructor(private http: HttpClient) {}

  getAllHouses() {
    return this.http.get<House[]>(
      `${env.backendUrl}/api/house/list-create`
    );
  }
}
```

Edit `app.component.ts`:

```ts
import { Component, OnInit } from "@angular/core";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { BehaviorSubject, EMPTY, ReplaySubject, Subject } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";
import { House } from "./data/models/house";
import { HouseService } from "./data/service/house.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  onFetchHousesInstance: () => void;

  map: Map = new Map({});

  constructor(public houseService: HouseService) {
    const onFetchHouses: Subject<void> = new Subject<void>();
    this.onFetchHousesInstance = () => {
      onFetchHouses.next();
      onFetchHouses.complete();
    };

    onFetchHouses
      .pipe(
        switchMap(() => {
          return this.houseService.getAllHouses().pipe(
            catchError((error) => {
              console.error(error);
              return EMPTY;
            }),
            tap((houses: House[]) => {
              console.log(houses);
            })
          );
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.onFetchHousesInstance();
    this.initMap();
  }

  initMap() {
    this.map = new Map({
      view: new View({
        center: [0, 0], 
        zoom: 1, 
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target: "ol-map",
    });
  }
}
```

## Showing the points

First, let's add those 2 lines to compilerOptions of `tsconfig.json`:

```json
    "strictPropertyInitialization": false,
    "strictNullChecks": false,
```

Edit `app.component.ts`:

```ts
import { Component, OnInit } from "@angular/core";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { EMPTY, Subject } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";
import { House } from "./data/models/house";
import { HouseService } from "./data/service/house.service";
import { Feature } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Point from "ol/geom/Point";
import { Circle, Fill, Style } from "ol/style";
import { fromLonLat } from "ol/proj";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  onFetchHousesInstance: () => void;

  map: Map = new Map({});
  vectorSource: VectorSource<any> = new VectorSource();
  vectorLayer: VectorLayer<any> = new VectorLayer();

  constructor(public houseService: HouseService) {
    const onFetchHouses: Subject<void> = new Subject<void>();
    this.onFetchHousesInstance = () => {
      onFetchHouses.next();
      onFetchHouses.complete();
    };

    onFetchHouses
      .pipe(
        switchMap(() => {
          return this.houseService.getAllHouses().pipe(
            catchError((error) => {
              console.error(error);
              return EMPTY;
            }),
            tap((houses: House[]) => {
              console.log(houses);
              this.loadHousesOnMap(houses);
            })
          );
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    // useGeographic();
    this.onFetchHousesInstance();
    this.initMap();
  }

  initMap() {
    this.map = new Map({
      view: new View({
        center: [0, 0], 
        zoom: 1, 
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target: "ol-map",
    });
  }

  loadHousesOnMap(houses: House[]): void {
    // Clear all from layer
    while (
      this.map
        .getLayers()
        .getArray()
        .filter((layer) => layer.get("name") === "houses").length > 0
    ) {
      this.map.removeLayer(
        this.map
          .getLayers()
          .getArray()
          .filter((layer) => layer.get("name") === "houses")[0]
      );
    }

    this.vectorSource = new VectorSource({
      features: [],
    });

    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: "red" }),
        }),
      }),
    });

    this.vectorLayer.set("name", "houses");
    this.vectorLayer.setZIndex(100);

    const features: Array<Feature<any>> = houses
      .filter((house) => !!house.POINT)
      ?.map((house) => {
        const feature = new Feature(
          new Point(fromLonLat(house.POINT.coordinates))
        );
        feature.setProperties(house);
        return feature;
      });

    this.map.addLayer(this.vectorLayer);

    this.vectorSource.addFeatures(features);

    this.map.getView().fit(this.vectorSource.getExtent(), {
      maxZoom: 17,
      duration: 1000,
    });
  }
}
```

## Showing Overlays

Edit `app.component.ts`:

```ts
import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { EMPTY, Subject } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";
import { House } from "./data/models/house";
import { HouseService } from "./data/service/house.service";
import { Feature, Overlay } from "ol";
import OverlayPositioning from "ol/OverlayPositioning";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Point from "ol/geom/Point";
import { FeatureLike } from "ol/Feature";
import { Circle, Fill, Style } from "ol/style";
import { fromLonLat } from "ol/proj";
import { Pixel } from "ol/pixel";
import { environment as env } from "src/environments/environment";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  onFetchHousesInstance: () => void;

  map: Map = new Map({}); 
  vectorSource: VectorSource<any> = new VectorSource();
  vectorLayer: VectorLayer<any> = new VectorLayer();

  downloadUrl = env.downloadUrl;
  overlay: Overlay = new Overlay({
    positioning: OverlayPositioning.BOTTOM_CENTER,
    offset: [0, -10],
    autoPan: false,
    stopEvent: false,
  });
  hoveredHouse: House | null = null;
  @ViewChild("ol_map") mapElelement: ElementRef<HTMLElement>;
  @ViewChild("overlay") overlayElement: ElementRef<HTMLElement>;
  @ViewChild("overlay") set popup(popupEl: ElementRef<HTMLElement>) {
    this.overlay.setElement(popupEl.nativeElement);
    this.map.addOverlay(this.overlay);
  }

  constructor(public houseService: HouseService) {
    const onFetchHouses: Subject<void> = new Subject<void>();
    this.onFetchHousesInstance = () => {
      onFetchHouses.next();
      onFetchHouses.complete();
    };

    onFetchHouses
      .pipe(
        switchMap(() => {
          return this.houseService.getAllHouses().pipe(
            catchError((error) => {
              console.error(error);
              return EMPTY;
            }),
            tap((houses: House[]) => {
              console.log(houses);
              this.loadHousesOnMap(houses);
            })
          );
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    // useGeographic();
    this.onFetchHousesInstance();
    this.initMap();
    this.initMapClickListener();
  }

  initMapClickListener() {
    this.map.on("pointermove", (e) => {
      const pixel: Pixel = e.pixel;
      const feature = this.map.forEachFeatureAtPixel(
        pixel,
        (feature) => feature,
        { hitTolerance: 5 }
      ) as FeatureLike;

      const layer = this.map.forEachLayerAtPixel(pixel, (layer) => layer, {
        hitTolerance: 5,
      });

      this.hoveredHouse = null;
      this.map.getTargetElement().style.cursor = feature ? "pointer" : "";

      if (
        layer?.get("name") === "houses" &&
        feature &&
        layer instanceof VectorLayer
      ) {
        const house = feature.getProperties() as House;

        this.openOverlay(house);
      }
    });
  }

  initMap() {
    this.map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target: "ol-map",
    });
  }

  loadHousesOnMap(houses: House[]): void {
    // Clear all from layer
    while (
      this.map
        .getLayers()
        .getArray()
        .filter((layer) => layer.get("name") === "houses").length > 0
    ) {
      this.map.removeLayer(
        this.map
          .getLayers()
          .getArray()
          .filter((layer) => layer.get("name") === "houses")[0]
      );
    }

    this.vectorSource = new VectorSource({
      features: [],
    });

    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: "red" }),
        }),
      }),
    });

    this.vectorLayer.set("name", "houses");
    this.vectorLayer.setZIndex(100);

    const features: Feature<any>[] = houses
      .filter((house) => !!house.POINT)
      ?.map((house) => {
        const feature = new Feature(
          new Point(fromLonLat(house.POINT.coordinates))
        );
        feature.setProperties(house);
        return feature;
      });

    this.map.addLayer(this.vectorLayer);

    this.vectorSource.addFeatures(features);

    this.map.getView().fit(this.vectorSource.getExtent(), {
      maxZoom: 17,
      duration: 1000,
    });
  }

  /**
   * Open the overlay of a project
   * @param project ProjectDeliver
   */
  openOverlay(house: House) {
    this.overlay.setPosition(fromLonLat(house.POINT.coordinates));

    this.overlayElement.nativeElement.style.display = "block";
    this.overlay.setElement(this.overlayElement.nativeElement);
    this.hoveredHouse = house;
  }
}
```

Add to `app.component.html`:

```html
<div #overlay>
  <div class="overlay" *ngIf="hoveredHouse">
    <div class="photo">
      <img [src]="downloadUrl + hoveredHouse.PHOTO" height="200" />
    </div>
    <div class="properties">
      <table>
        <tr>
          <td class="name">Support :</td>
          <td class="values">{{ hoveredHouse.NAME }}</td>
        </tr>
        <tr>
          <td class="name">Adresse :</td>
          <td class="values">{{ hoveredHouse.ADDRESS }}</td>
        </tr>
        <tr>
          <td class="name">Surface :</td>
          <td class="values">{{ hoveredHouse.SURFACE }}</td>
        </tr>
      </table>
    </div>
  </div>
</div>
```

Add to `app.component.scss`:

```scss
.overlay {
  width: 400px;
  padding: 5px 15px 5px 5px;
  border-radius: 12px;
  background-color: white;
}

td {
  height: 25px;
  border-bottom: 1px solid #c4c4c4;
}
.values {
  text-align: right;
  width: 300px;
}
table {
  padding: 10px;
}
.name {
  width: 100px;
}
.column {
  float: left;
  width: 50%;
}
.photo {
  text-align: center;
  padding: 5px;
}
```

## GGIS Server

### WMS


The WMS 1.1.1 and 1.3.0 standards implemented in QGIS Server provide an HTTP interface for requesting map or legend images generated from a QGIS project. A typical WMS request defines the QGIS project to use, the layers to render, and the image format to generate.

Firstly, we will integrate our QGIS project as a TileLayer in OpenLayers.

Edit `app.component.ts`:

```ts
import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { House } from "./data/models/house";
import { Overlay } from "ol";
import OverlayPositioning from "ol/OverlayPositioning";
import { environment as env } from "src/environments/environment";
import TileWMS from "ol/source/TileWMS";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  map: Map = new Map({});
  wmsSource = new TileWMS({
    url: "http://localhost:8080/ows/?map=./qgis/House_V01/House.qgz",
    params: { LAYERS: "House", STYLES: "" },
    serverType: "qgis",
    crossOrigin: "anonymous",
  });

  downloadUrl = env.downloadUrl;
  overlay: Overlay = new Overlay({
    positioning: OverlayPositioning.BOTTOM_CENTER,
    offset: [0, -10],
    autoPan: false,
    stopEvent: false,
  });
  hoveredHouse: House | null = null;
  @ViewChild("ol_map") mapElelement: ElementRef<HTMLElement>;
  @ViewChild("overlay") overlayElement: ElementRef<HTMLElement>;
  @ViewChild("overlay") set popup(popupEl: ElementRef<HTMLElement>) {
    this.overlay.setElement(popupEl.nativeElement);
    this.map.addOverlay(this.overlay);
  }

  constructor() {}

  ngOnInit(): void {
    this.initMap();
    this.initMapClickListener();
  }

  initMapClickListener() {
    this.map.on("pointermove", (evt) => {
      if (evt.dragging) {
        return;
      }
      const pixel = this.map.getEventPixel(evt.originalEvent);
      const hit = this.map.forEachLayerAtPixel(
        pixel,
        (layer) => layer.getClassName() == "imageLayerHouse"
      );
      this.map.getTargetElement().style.cursor = hit ? "pointer" : "";

      if (hit) {
        const viewResolution = /** @type {number} */ this.map
          .getView()
          .getResolution();
        const url = this.wmsSource.getFeatureInfoUrl(
          evt.coordinate,
          viewResolution,
          "EPSG:3857",
          {
            INFO_FORMAT: "application/json",
            FI_POINT_TOLERANCE: 5,
          }
        );
        if (url) {
          fetch(url)
            .then((response) => {
              return response.json();
            })
            .then((result: any) => {
              console.log(result);
              const features = result.features;
              if (features.length) {
                const house = features[0].properties as House;

                this.openOverlay(house, evt.coordinate);
              }
            });
        }
      } else {
        this.hoveredHouse = null;
      }
    });
  }

  initMap() {
    this.map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new TileLayer({
          source: this.wmsSource,
          className: "imageLayerHouse",
        }),
      ],
      target: "ol-map",
    });
  }

  /**
   * Open the overlay of a project
   * @param project ProjectDeliver
   */
  openOverlay(house: House, coordinates: any) {
    console.log(coordinates);
    this.overlay.setPosition(coordinates);

    this.overlayElement.nativeElement.style.display = "block";
    this.overlay.setElement(this.overlayElement.nativeElement);
    this.hoveredHouse = house;
  }
}
```

Edit `app.component.html`:

```html
<img
  [src]="downloadUrl + '/media/photo/' + hoveredHouse.PHOTO + '.bmp'"
  height="200"
/>
```

### WFS

The WFS 1.0.0 and 1.1.0 standards implemented in QGIS Server provide an HTTP interface for querying geographic entities from a QGIS project. A typical WFS request defines the QGIS project to use and the layer to query.

For WFS, the entities are of the same type as the entities added manually on OpenLayers. They are vectors and not images like those from WMS.

Edit `app.componenet.ts`:

```ts
import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { House } from "./data/models/house";
import { Overlay } from "ol";
import OverlayPositioning from "ol/OverlayPositioning";
import { environment as env } from "src/environments/environment";
import GeoJSON from "ol/format/GeoJSON";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { Style, Circle, Fill } from "ol/style";
import { Pixel } from "ol/pixel";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  map: Map = new Map({});

  vectorSource = new VectorSource({
    format: new GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }),
    url:
      "http://localhost:8080/ows/?map=./qgis/House_V01/House.qgz&service=WFS&" +
      "version=1.1.0&request=GetFeature&typename=House&" +
      "outputFormat=application/json",
  });

  downloadUrl = env.downloadUrl;
  overlay: Overlay = new Overlay({
    positioning: OverlayPositioning.BOTTOM_CENTER,
    offset: [0, -10],
    autoPan: false,
    stopEvent: false,
  });
  hoveredHouse: House | null = null;
  @ViewChild("ol_map") mapElelement: ElementRef<HTMLElement>;
  @ViewChild("overlay") overlayElement: ElementRef<HTMLElement>;
  @ViewChild("overlay") set popup(popupEl: ElementRef<HTMLElement>) {
    this.overlay.setElement(popupEl.nativeElement);
    this.map.addOverlay(this.overlay);
  }

  constructor() {}

  ngOnInit(): void {
    this.initMap();
    this.initMapClickListener();
  }

  initMapClickListener() {
    this.map.on("pointermove", (e) => {
      const pixel: Pixel = e.pixel;
      const feature = this.map.forEachFeatureAtPixel(
        pixel,
        (feature) => feature,
        { hitTolerance: 5 }
      );

      if (feature) {
        this.map.getTargetElement().style.cursor = "pointer";
        const house = feature.getProperties() as House;
        this.openOverlay(house, e.coordinate);
      } else {
        this.map.getTargetElement().style.cursor = "";
        this.hoveredHouse = null;
      }
    });
  }

  initMap() {
    this.map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          className: "imageLayerHouse",
          source: this.vectorSource,
          style: new Style({
            image: new Circle({
              radius: 5,
              fill: new Fill({ color: "red" }),
            }),
          }),
        }),
      ],
      target: "ol-map",
    });
  }

  /**
   * Open the overlay of a project
   * @param project ProjectDeliver
   */
  openOverlay(house: House, coordinates: any) {
    this.overlay.setPosition(coordinates);
    this.overlayElement.nativeElement.style.display = "block";
    this.overlay.setElement(this.overlayElement.nativeElement);
    this.hoveredHouse = house;
  }
}
```

## MapLibre

Install maplibre

```sh
npm install ngx-maplibre-gl maplibre-gl @types/geojson
```

Add this line in `angular.json` to load css of `maplibre-gl`:

```json
"styles": [
        ...
        "./node_modules/maplibre-gl/dist/maplibre-gl.css"
      ],
```

Add this line in the file `polyfill.ts`:

```ts
(window as any).global = window;
```

Import `NgxMapboxGLModule`:

```ts
...
import { NgxMapLibreGLModule } from 'ngx-maplibre-gl';

@NgModule({
  imports: [
    ...
    NgxMapLibreGLModule
  ]
})
export class AppModule {}
```

## Show the map

Edit `app.component.html`:

```html
<mgl-map
  [style]="
    'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  "
  [zoom]="[9]"
  [center]="[-74.5, 40]"
></mgl-map>
```

Edit `app.component.ts`:

```ts
import { Component } from "@angular/core";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {}
```

Edit `app.component.scss`:

```scss
:host {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

mgl-map {
  height: 100%;
  width: 100%;
}
```

## Add controls

Edit `app.component.html`:

```html
<mgl-map
  [style]="
    'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  "
  [zoom]="[5]"
  [center]="[0, 47]"
>
  <mgl-control mglNavigation></mgl-control>
</mgl-map>
```

## Show markers

Edit `app.component.ts`:

```ts
import { Component, OnInit } from "@angular/core";
import { EMPTY, Subject } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";
import { House } from "./data/models/house";
import { HouseService } from "./data/service/house.service";
import { environment as env } from "src/environments/environment";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  onFetchHousesInstance: () => void;
  houses: House[];
  downloadUrl = env.downloadUrl;

  constructor(public houseService: HouseService) {
    const onFetchHouses: Subject<void> = new Subject<void>();
    this.onFetchHousesInstance = () => {
      onFetchHouses.next();
      onFetchHouses.complete();
    };

    onFetchHouses
      .pipe(
        switchMap(() => {
          return this.houseService.getAllHouses().pipe(
            catchError((error) => {
              console.error(error);
              return EMPTY;
            }),
            tap((houses: House[]) => {
              console.log(houses);
              this.houses = houses;
            })
          );
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.onFetchHousesInstance();
  }
}
```

Edit `app.component.ts`:

```html
<mgl-map
  [style]="
    'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  "
  [zoom]="[5]"
  [center]="[0, 47]"
>
  <mgl-marker
    *ngFor="let house of houses"
    [lngLat]="house.POINT.coordinates"
  >
  </mgl-marker>
  <mgl-control mglNavigation></mgl-control>
</mgl-map>
```

## Show popups

Edit `app.component.html`:

```html
<mgl-map
  [style]="
    'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  "
  [zoom]="[5]"
  [center]="[0, 47]"
>
  <ng-container *ngFor="let house of houses">
    <mgl-marker #myMarker [lngLat]="house.POINT.coordinates"> </mgl-marker>
    <mgl-popup [marker]="myMarker" class="popup">
      <div class="photo">
        <img [src]="downloadUrl + house.PHOTO" height="200" />
      </div>
      <div class="properties">
        <table>
          <tr>
            <td class="name">Support :</td>
            <td class="values">{{ house.NAME }}</td>
          </tr>
          <tr>
            <td class="name">Adresse :</td>
            <td class="values">{{ house.ADDRESS }}</td>
          </tr>
          <tr>
            <td class="name">Surface :</td>
            <td class="values">{{ house.SURFACE }}</td>
          </tr>
        </table>
      </div>
    </mgl-popup>
  </ng-container>
  <mgl-control mglNavigation></mgl-control>
</mgl-map>
```

## Use layers

Edit `house.service.ts`:

```ts
...
  getFeatures() {
    return this.http.get<House[]>(
      `${env.backendUrl}/api/house/features`
    );
  }
```

Edit `app.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { House } from './data/models/house';
import { HouseService } from './data/service/house.service';
import { environment as env } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  onFetchHousesInstance: () => void;
  houses: House[];
  downloadUrl = env.downloadUrl;
  source: any

  constructor(public houseService: HouseService) {
    const onFetchHouses: Subject<void> = new Subject<void>();
    this.onFetchHousesInstance = () => {
      onFetchHouses.next();
      onFetchHouses.complete();
    };

    onFetchHouses
      .pipe(
        switchMap(() => {
          return this.houseService.getFeatures().pipe(
            catchError((error) => {
              console.error(error);
              return EMPTY;
            }),
            tap((features: any) => {
              // this.houses = houses;
              this.source = {
                type: "geojson",
                data: features
              };
              console.log(this.source);
            })
          );
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.onFetchHousesInstance();
  }
}

```

Edit `app.component.html`:

```html
<mgl-map
  [style]="
    'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  "
  [zoom]="[5]"
  [center]="[0, 47]"
>
<mgl-layer
  id="state-borders"
  type="circle"
  [source]="source"
  [paint]="{
    'circle-color': '#11b4da',
    'circle-radius': 8,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff'
    }"
></mgl-layer>
  <mgl-control mglNavigation></mgl-control>
</mgl-map>
```

## Useing clusters 

Edit `app.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { House } from './data/models/house';
import { HouseService } from './data/service/house.service';
import { environment as env } from 'src/environments/environment';
import { Layout, SymbolLayout } from 'maplibre-gl';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  onFetchHousesInstance: () => void;
  houses: House[];
  downloadUrl = env.downloadUrl;
  backendUrl = env.backendUrl;
  source: any
  layout: SymbolLayout = {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  }

  constructor(public houseService: HouseService) {
    const onFetchHouses: Subject<void> = new Subject<void>();
    this.onFetchHousesInstance = () => {
      onFetchHouses.next();
      onFetchHouses.complete();
    };

    onFetchHouses
      .pipe(
        switchMap(() => {
          return this.houseService.getFeatures().pipe(
            catchError((error) => {
              console.error(error);
              return EMPTY;
            }),
            tap((features: any) => {
              this.source = features
              console.log(this.source);
            })
          );
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.onFetchHousesInstance();
  }
}
```

Edit `app.component.html`:

```html
<mgl-map
  [style]="
    'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  "
  [zoom]="[5]"
  [center]="[0, 47]"
>
  <ng-container *ngIf="source">
    <mgl-geojson-source
      id="source"
      [data]="source"
      [cluster]="true"
      [clusterMaxZoom]="14"
      [clusterRadius]="50"
    >
    </mgl-geojson-source>
    <mgl-layer
      id="clusters"
      type="circle"
      source="source"
      [filter]="['has', 'point_count']"
      [paint]="{
        'circle-color': {
          property: 'point_count',
          type: 'interval',
          stops: [
            [0, '#51bbd6'],
            [100, '#f1f075'],
            [750, '#f28cb1']
          ]
        },
        'circle-radius': {
          property: 'point_count',
          type: 'interval',
          stops: [
            [0, 20],
            [100, 30],
            [750, 40]
          ]
        }
      }"
    >
    </mgl-layer>
    <mgl-layer
      id="cluster-count"
      type="symbol"
      source="source"
      [filter]="['has', 'point_count']"
      [layout]="layout"
    >
    </mgl-layer>
    <mgl-layer
      id="unclustered-point"
      type="circle"
      source="source"
      [filter]="['!has', 'point_count']"
      [paint]="{
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }"
    >
    </mgl-layer>
  </ng-container>
  <mgl-control mglNavigation></mgl-control>
</mgl-map>
```

## Showing a popup

Edit `app.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { House } from './data/models/house';
import { HouseService } from './data/service/house.service';
import { environment as env } from 'src/environments/environment';
import { MapLayerMouseEvent, SymbolLayout } from 'maplibre-gl';
import { Feature, Point } from 'geojson';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  onFetchHousesInstance: () => void;
  houses: House[];
  downloadUrl = env.downloadUrl;
  backendUrl = env.backendUrl;
  source: any;
  selectedPoint: Feature<Point, { [name: string]: any }> | null;
  house: House;
  layout: SymbolLayout = {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12,
  };
  cursorStyle: string;

  constructor(public houseService: HouseService) {
    const onFetchHouses: Subject<void> = new Subject<void>();
    this.onFetchHousesInstance = () => {
      onFetchHouses.next();
      onFetchHouses.complete();
    };

    onFetchHouses
      .pipe(
        switchMap(() => {
          return this.houseService.getFeatures().pipe(
            catchError((error) => {
              console.error(error);
              return EMPTY;
            }),
            tap((features: any) => {
              this.source = features;
              console.log(this.source);
            })
          );
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.onFetchHousesInstance();
  }

  onClick(evt: MapLayerMouseEvent) {
    this.selectedPoint = evt.features![0] as Feature<Point, { [name: string]: any }> | null;
    this.house = evt.features![0].properties as House;
  }
}
```

Edit `app.component.html`:

```html
<mgl-map
  [style]="
    'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
  "
  [zoom]="[5]"
  [center]="[0, 47]"
  [cursorStyle]="cursorStyle"
>
  <ng-container *ngIf="source">
    <mgl-geojson-source
      id="source"
      [data]="source"
      [cluster]="true"
      [clusterMaxZoom]="14"
      [clusterRadius]="50"
    >
    </mgl-geojson-source>
    <mgl-layer
      id="clusters"
      type="circle"
      source="source"
      [filter]="['has', 'point_count']"
      [paint]="{
        'circle-color': {
          property: 'point_count',
          type: 'interval',
          stops: [
            [0, '#51bbd6'],
            [100, '#f1f075'],
            [750, '#f28cb1']
          ]
        },
        'circle-radius': {
          property: 'point_count',
          type: 'interval',
          stops: [
            [0, 20],
            [100, 30],
            [750, 40]
          ]
        }
      }"
    >
    </mgl-layer>
    <mgl-layer
      id="cluster-count"
      type="symbol"
      source="source"
      [filter]="['has', 'point_count']"
      [layout]="layout"
    >
    </mgl-layer>
    <mgl-layer
      id="unclustered-point"
      type="circle"
      source="source"
      (layerClick)="onClick($event)"
      (layerMouseEnter)="cursorStyle = 'pointer'"
      (layerMouseLeave)="cursorStyle = ''"
      [filter]="['!has', 'point_count']"
      [paint]="{
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }"
    >
    </mgl-layer>
  </ng-container>
  <mgl-popup *ngIf="selectedPoint" [feature]="selectedPoint">
    <div class="photo">
      <img
        [src]="downloadUrl + '/media/photo/' + house.PHOTO + '.bmp'"
        height="200"
      />
    </div>
    <div class="properties">
      <table>
        <tr>
          <td class="name">Support :</td>
          <td class="values">{{ house.NAME }}</td>
        </tr>
        <tr>
          <td class="name">Adresse :</td>
          <td class="values">{{ house.ADDRESS }}</td>
        </tr>
        <tr>
          <td class="name">Surface :</td>
          <td class="values">{{ house.SURFACE }}</td>
        </tr>
      </table>
    </div>
  </mgl-popup>
  <mgl-control mglNavigation></mgl-control>
</mgl-map>
```
