---
title: 'Web GIS App Part 1 - Back-end'
description: ''
pubDate: 'Nov 01 2021'
heroImage: '/future_town.png'
---

## Prerequisite

1. django
2. Docker

## Setup

### Components definition

Create a file `requirements.txt`

```
Django>=3.0,<4.0
psycopg2-binary>=2.8
djangorestframework~=3.12
```

Create a `Dockerfile`

```Dockerfile
FROM debian:buster

ENV PYTHONUNBUFFERED=1

RUN apt-get update --fix-missing && apt-get install -y \
    nano \
    sed  \
    curl \
    git \
    wget \
    gnupg2 \
    python3-pip \
    python3-dev \
    software-properties-common

RUN python3 -m pip install --upgrade pip

WORKDIR /code
COPY requirements.txt /code/

RUN apt-get update --fix-missing && apt-get install -y \
    binutils \
    libproj-dev  \
    libmagic1  \
    postgresql-client  \
    gdal-bin

RUN pip3 install -r requirements.txt

COPY . /code/
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.7 2
```

## 1. You have Postgres on your machine

Create a DB `webgis_db`, and add extension `postgis`

```sh
$ createdb  webgis_db
$ psql webgis_db
> CREATE EXTENSION postgis;
```

Create a file `docker-compose.yml`

```yml
version: "3.9"

volumes:
  webgis_pgdata:
    external: true

services:
  webgis_web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/code
    ports:
      - "8000:8000"
    networks:
      - travellist

networks:
  travellist:
    driver: bridge
```

### Configuration local postgresql

Edit files `postgresql.conf` and `pg_hba.conf` for the service to accept connection via docker.

```sh
$ sudo nano /etc/postgresql/<POSTGRESQL VERSION>/main/posgresql.conf
```

Replace line `listen_addresses` with :

```
listen_addresses = '*'
```

Edit file `pg_hba.conf` :

```sh
$ sudo nano /etc/postgresql/<POSTGRESQL VERSION>/main/pg_hba.conf
```

Then add this line at the end :

```sh
host    all             all             0.0.0.0/0            md5
```

## 2. You don't have postgres on your machine

Create a file `Dockerfile_DB`

```Dockerfile
FROM postgres:12

ENV POSTGIS_MAJOR 3

RUN apt-get update --fix-missing \
    && apt-get install wget -y \
    && apt-get install postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR -y \
    && apt-get install postgis -y
```

Create a file `docker-compose.yml`

```yml
version: "3.9"

volumes:
  webgis_pgdata:
    external: true

services:
  webgis_db:
    build:
      context: .
      dockerfile: Dockerfile_DB
    volumes:
      - webgis_pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=webgis_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      # Add extensions you need to be enabled by default in the DB. Default are the three specified below
      # - POSTGRES_MULTIPLE_EXTENSIONS=postgis,hstore,postgis_topology
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5432"]
      interval: 30s
      timeout: 10s
      retries: 5
    ports:
      - "5434:5432"

  webgis_web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/code
    ports:
      - "8000:8000"
    depends_on:
      - webgis_db
```

### Create a new projet

```sh
$ sudo docker-compose run webgis_web django-admin startproject webgis .
```

Give your user permission (for linux)

```sh
$  sudo chown -R $USER:$USER .
```

Create a Django app `house`

```sh
$ docker-compose exec webgis_web python manage.py startapp house
```

### Configuration of `settings.py`

The settings for the web GIS project are in the file `webgis/settings.py`. Modify the database connection settings to match your configuration:

```py
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'postgres',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'webgis_db',  # docker
        # 'HOST': 'host.docker.internal',  # windows
        # 'HOST': '<IP ADDRESS>',  # linux
        'PORT': 5432,
    }
}
```

Additionally, modify the `INSTALLED_APPS` setting to include `django.contrib.admin`, `django.contrib.gis`, and `webgis` (the application you just created):

```py
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'rest_framework',
    'house',
]
```

## I want to import data from a shapefile

The `Shape` folder contains a set of data files together forming what is called an `ESRI Shapefile`, one of the most commonly used geospatial data formats. The dataset includes files with the following extensions:

- `.shp`: contains the vector data of geometric objects.
- `.shx`: spatial index file of geometric objects stored in the files.
- `.dbf`: database file containing non-geometric attribute data (e.g., fields of integers or text).
- `.prj`: contains spatial reference information for the geographic data stored in the shapefile.


### Using ogrinfo to examine spatial data

The GDAL utility `ogrinfo` allows you to examine the metadata of shapefiles or other vector data sources:

```sh
$ ogrinfo house/data/House.shp
```

`ogrinfo` informs us that the shapefile has one layer and that it contains polygon data. To learn more, we specify the layer name and use the `-so` option to display only the summary of important information:

```sh
$ ogrinfo -so house/data/House.shp House
```

This detailed summary of information tells us the number of objects in the layer, the geographic extent of the data, the spatial reference system ("SRS WKT"), and the type of information for each attribute field.


## Geographical model

Let's now create a `GeoDjango` model to represent the data:

```py
from django.contrib.gis.db import models

# Create your models here.

class House(models.Model):
    PHOTO = models.CharField(max_length=255, blank=True, null=True)
    NAME = models.CharField(max_length=255, blank=True, null=True)
    ADDRESS = models.CharField(max_length=255, blank=True, null=True)
    SURFACE = models.FloatField(blank=True, null=True)
    POINT = models.PointField(srid=4326) # This field will hold geocraphical data
```

Note that the `models` module is imported from `django.contrib.gis.db`.

The default spatial reference system for geometric fields is WGS84 (which implies an SRID value of 4326); in other words, the coordinates of the field are longitude/latitude pairs in degrees. To use a different coordinate system, set the SRID of the geometric field with the `srid` parameter. Use an integer representing the EPSG code of the coordinate system.


### Serializer

Edit `serializers.py`

```py
from .models import House
from rest_framework import serializers


class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = "__all__"
```

### View

Edit `views.py`

```py
from django.shortcuts import render
from rest_framework.generics import ListCreateAPIView

from house.models import House
from house.serializers import HouseSerializer

# Create your views here.


class HouseView(ListCreateAPIView):
    queryset = House.objects.all()
    serializer_class = HouseSerializer
```

### Route

Edit `house/urls.py`

```py
from django.urls import include, path
from .views import HouseView

urlpatterns = [
    path("list-create", HouseView.as_view()),
]
```

Edit `webgis/urls.py`

```py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/house/', include("house.urls")),
]
```

## Migrations

```sh
$ docker-compose exec webgis_web python manage.py makemigrations
$ docker-compose exec webgis_web python manage.py migrate
```

## Test the application

### Adding a row to the table via http post request

Let's add this entity via postman or curl:

- Method: POST
- url:
  - docker: `http://0.0.0.0:8000/api/house/list-create`
  - linux: `http://localhost:8000/api/house/list-create`
- body: raw (JSON)

```json
{
  "PHOTO": "Photo_0006",
  "NAME": "TEST",
  "ADDRESS": "Avenue du Generale de Gaule",
  "SURFACE": 6.765,
  "POINT": "Point (-1.7123697 48.0418445)"
}
```

### Visualize data in pgAdmin

Open `pgAdmin` to verify that the row was correctly added in the table.
You can also use postman or curl with a get request.

## Import data in PostGIS base with GeoDjango

Create folders `datasource` and `management/commands` in `house` folder.

Copy all your shape files in `datasource`.

Create a file `static/photo` at root and paste all the pictures there.

Create a file `importData.py` in `commands`:

```py
from django.core.management.base import BaseCommand, CommandError
from django.contrib.gis.gdal import DataSource
import os
from django.contrib.gis.utils import LayerMapping
from house.models import House


class Command(BaseCommand):
    help = 'Import specified data'

    def add_arguments(self, parser):
        # Positional arguments
        parser.add_argument('datasources', nargs='+', type=str)

        # Named (optional) arguments
        parser.add_argument(
            '--rebuild',
            action='store_true',  # false by default
            help='Delete previous reccords in Table',
        )

    def handle(self, *args, **options):
        if House.objects.first() is not None and not options['rebuild']:
            self.stdout.write(
                self.style.ERROR(
                    "Data already exist in House table. Please use --rebuild option to overwrite existing data."
                )
            )
            return

        House.objects.all().delete()
        for datasource in options['datasources']:
            shp = os.path.normpath(os.path.join(os.path.dirname(
                __file__), '../../datasource', datasource))

            ds = DataSource(shp)
            self.stdout.write(ds.name)
            self.stdout.write(self.style.SUCCESS(
                'Found "%s"' % datasource))

            self.stdout.write(str(ds.layer_count))  # Only one layer
            layer = ds[0]                           #
            self.stdout.write(str(layer.geom_type))  # Point
            # ['PHOTO', 'NAME', 'ADDRESS', 'SURFACE']
            self.stdout.write(str(layer.fields))

            mapping = {
                'PHOTO': 'PHOTO',
                'NAME': 'NAME',
                'ADDRESS': 'ADDRESS',
                'SURFACE': 'SURFACE',
                'POINT': 'POINT', # For geometry fields use OGC name.
            }  # The mapping is a dictionary

            lm = LayerMapping(House, ds, mapping)
            # Save the layermap, imports the data.
            lm.save(verbose=True, strict=True)
            self.stdout.write(self.style.SUCCESS(
                "Data correctly inserted."))
```

Add this function to `House` class:

```py
def __str__(self):
    return f'{{ Id: {self.pk}, Name: {self.NAME} }}'
```

Run command:

```sh
$ docker-compose exec webgis_web python manage.py importData House.shp --rebuild
```

```sh
/code/house/datasource/House.shp
Found "House.shp"
1
Point
['PHOTO', 'NAME', 'ELECTRIFIE', 'ADDRESS', 'SURFACE']
Saved: { Id: 1, Name: My house }
Saved: { Id: 2, Name: My friend's house }
Saved: { Id: 3, Name: My brother's house }
...
```


## Preparing connection with client

### CORS

Add to `requirements.txt`

```txt
django-cors-headers~=3.5
djangorestframework-gis~=0.16
```

Edit `settings.py`

```py
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    # 'django.contrib.staticfiles',
    'django.contrib.gis',
    'rest_framework',
    'rest_framework_gis',
    'corsheaders',
    'house',
]
```

```py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

And add:

```py
URL = 'http://localhost:4200'

CORS_ALLOWED_ORIGINS = [URL]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
```

We'll have to rebuild:

```sh
$ docker-compose build
```

## Showing images - management of static files

Add to `settings.py`:

```py
import os

...

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.1/howto/static-files/
# STATIC_URL = '/static/'
# STATIC_ROOT = os.path.join(BASE_DIR, "static")

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, "static")
```

Modifier `serializers.py`

```py
from .models import House
from rest_framework import serializers
from django.conf import settings
import os


class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = "__all__"

    def to_representation(self, instance):
        representation = super(HouseSerializer,
                               self).to_representation(instance)
        if instance.PHOTO:
            name = instance.PHOTO
            representation['PHOTO'] = os.path.join(
                '/media/photo', name) + '.bmp'
        return representation
```

Edit `urls.py`:

```py
from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/house/', include("house.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## GGIS Server

QGIS Server is an open-source implementation of WMS, WFS, OGC API, and WCS and has a Python extension allowing rapid and efficient development and deployment of new functionalities. QGIS Server utilizes QGIS as the backend for GIS layer logic and map rendering. Since QGIS Desktop and QGIS Server use the same visualization libraries, maps published on the web have the same appearance as in the Desktop GIS.

Add this service to `docker-compose.yml`:

```yml
qgis-server:
  image: 3liz/qgis-map-server:3.16
  ports:
    - 8080:8080
  volumes:
    - .:/projects
  environment:
    - QGSRV_SERVER_WORKERS=4
    - QGSRV_LOGGING_LEVEL=WARNING
    - QGSRV_CACHE_ROOTDIR=/projects
    - QGSRV_CACHE_STRICT_CHECK=no
    - QGSRV_CACHE_SIZE=10
    - QGSRV_SERVER_TIMEOUT=90
    - QGSRV_SERVER_CROSS_ORIGIN=yes
```

Re-run commands:

```sh
$ docker-compose build
$ docker-compose up
```

To verify if QGIS Server is working, go to http://localhost:8080/ows/. The page should return following response:

```json
{
  "error": { "message": "HTTP 400: Bad Request (Missing argument MAP)" },
  "httpcode": 400,
  "status": "error"
}
```

Move qgis folder to `static/qgis/`:

Edit project in `QGIS` :

- `Project Properties` → `QGIS Server` → Check `Service capabilities`
- `Project Properties` → `QGIS Server` → `WMS Capabilities` → Check `Add geometry to feature response`
- `Project Properties` → `QGIS Server` → `WFS Capabilities` → Check `House` layer as `Published`
- `Project Properties` → `Data sources` → Check layers as identifiable (`House` et `Google Road`)

Apply modifications then save the project.

We can now show the map in the qgis project at this location: http://localhost:8080/ows/?SERVICE=WMS&VERSION=1.3.0&SRS=EPSG:2154&REQUEST=GetMap&map=./qgis/House_V01/House.qgz&BBOX=349026.04110079980455339,6781554.27317108865827322,349583.8484468546230346,6781891.83515630010515451&WIDTH=1500&HEIGHT=1200&LAYERS=House&FORMAT=image/png

Details for each parameters are explained in official doc: https://docs.qgis.org/3.16/fr/docs/server_manual/services.html

## Features

Edit `views.py`

```py
...
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.serializers import serialize
import json

...
class HouseFeatures(APIView):

    def get(self, request, *args, **kwargs):
        features = serialize('geojson', House.objects.all(),
                             geometry_field='POINT',
                             fields=('PHOTO',
                                     'NAME',
                                     'ADDRESS',
                                     'SURFACE',
                                     ))

        return Response(json.loads(features), status=status.HTTP_200_OK)
```

Edit `urls.py`

```py
from django.urls import include, path
from .views import HouseFeatures, HouseView

urlpatterns = [
    path("list-create", HouseView.as_view()),
    path("features", HouseFeatures.as_view()),
]
```
