---
title: 'Simple Web GIS app'
description: ''
pubDate: 'Sep 30 2021'
heroImage: '/future_town.png'
---

How to build a basic GIS app, with a Django backend and an angular frontend, using a Postgres DB with PostGIS extension and Openlayers.

## 1. Django

`house/models.py`

```py
from django.contrib.gis.db import models

class House(models.Model):
  name = models.Charfield()
  geometry = models.MultiPointField(srid=4326)
```

`house/views.py`

```py
from rest_framework.generics import ListCreateAPIView
from House.models import House
from House.serializers import HouseSerializer

class HouseView(ListCreateAPIView):
  queryset = House.objects.all()
  serializer_class = HouseSerializer
```

`house/urls.py`

```py
from django.urls import include, path
from .views import HouseView

urlpatterns = [
  path("create", HouseView.as_view()),
]
```

`house/serializers.py`

```py
from .models import House
from rest_framework import serializers

class HouseSerializer(serializers.ModelSerializer):
  class Meta:
    model = House
    fields = "__all_
```

You should already be able to add geomtries via curl or postman (or any other tool)

## 2. Angular

Start with an angular application.

Then install openlayers

`npm i --save ol @types/ol`

Add ol styles in `angular.json`

```json
"styles": [
  "src/styles.scss",
  "node_modules/ol/ol.css"
]
```

`app.component.html`

```html
<div id="ol-map"></div>
```

`app.component.scss`

```scss
:host {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#ol-map {
  flex-grow: 1;
}
```

`app.component.ts`

```ts
import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  map: Map = new Map({});

  ngOnInit(): void {
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
      target: 'ol-map',
    });
  }
}
```
