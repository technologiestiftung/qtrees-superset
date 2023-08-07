![](https://img.shields.io/badge/Built%20with%20%E2%9D%A4%EF%B8%8F-at%20Technologiestiftung%20Berlin-blue)

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

# QTrees (Custom) Superset

This is a custom [Superset](https://github.com/apache/superset) for the [Baumblick Expert Dashboard](https://dashboard.qtrees.ai/login/). The customizations is currently only Matomo tracking and can be found in [tail_js_custom_extra.html](/tail_js_custom_extra.html) which gets included into the docker image and a hacky command to increase the row limit which is currently hardcoded.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)

## Usage

We currently run this image on our own portainer instance using this docker-compose.yml with docker swarm on a single node. The image is also available on [Docker Hub](https://hub.docker.com/r/technologiestiftung/qtrees-superset).

```yaml
#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
x-superset-deploy: &superset-deploy
  mode: replicated
  replicas: 1
  placement:
    constraints: [node.role == manager]

x-superset-environment: &superset-environment
  COMPOSE_PROJECT_NAME: "${COMPOSE_PROJECT_NAME}"
  # database configurations (do not modify)
  DATABASE_DB: "${DATABASE_DB}"
  DATABASE_HOST: "${DATABASE_HOST}"
  DATABASE_PASSWORD: "${DATABASE_PASSWORD}"
  DATABASE_USER: "${DATABASE_USER}"
  # database engine specific environment variables
  # change the below if you prefer another database engine
  DATABASE_PORT: "${DATABASE_PORT}"
  DATABASE_DIALECT: "${DATABASE_DIALECT}"
  POSTGRES_DB: "${POSTGRES_DB}"
  POSTGRES_USER: "${POSTGRES_USER}"
  POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
  #MYSQL_DATABASE: "${#MYSQL_DATABASE}"
  #MYSQL_USER: "${#MYSQL_USER}"
  #MYSQL_PASSWORD: "${#MYSQL_PASSWORD}"
  #MYSQL_RANDOM_ROOT_PASSWORD: "${#MYSQL_RANDOM_ROOT_PASSWORD}"
  # Add the mapped in /app/pythonpath_docker which allows devs to override stuff
  PYTHONPATH: "${PYTHONPATH}"
  REDIS_HOST: "${REDIS_HOST}"
  REDIS_PORT: "${REDIS_PORT}"
  FLASK_ENV: "${FLASK_ENV}"
  SUPERSET_ENV: "${SUPERSET_ENV}"
  SUPERSET_LOAD_EXAMPLES: "${SUPERSET_LOAD_EXAMPLES}"
  SUPERSET_SECRET_KEY: "${SUPERSET_SECRET_KEY}"
  CYPRESS_CONFIG: "${CYPRESS_CONFIG}"
  SUPERSET_PORT: "${SUPERSET_PORT}"
  MAPBOX_API_KEY: "${MAPBOX_API_KEY}"

version: "3.9"
services:
  redis:
    deploy: *superset-deploy
    image: redis:7
    # restart: unless-stopped
    volumes:
      - redis:/data
  db:
    deploy: *superset-deploy
    environment: *superset-environment
    image: postgres:14
    # restart: unless-stopped
    volumes:
      - db_home:/var/lib/postgresql/data

  superset:
    deploy: *superset-deploy
    environment: *superset-environment
    # DONT USE MAIN OR LATESTS IN PRODUCTION
    image: technologiestiftung/qtrees-superset:main
    command: ["/app/docker/docker-bootstrap.sh", "app-gunicorn"]
    user: "root"
    ports:
      - published: 8088
        target: 8088
        mode: host
    depends_on:
      - db
      - redis
    volumes:
      - superset_docker:/app/docker
      - superset_home:/app/superset_home

  superset-init:
    deploy: *superset-deploy
    image: apache/superset:2.1.0
    command: ["/app/docker/docker-init.sh"]
    environment: *superset-environment
    depends_on:
      - db
      - redis
    user: "root"
    volumes:
      - superset_docker:/app/docker
      - superset_home:/app/superset_home
    healthcheck:
      disable: true

  superset-worker:
    deploy: *superset-deploy
    image: apache/superset:2.1.0
    command: ["/app/docker/docker-bootstrap.sh", "worker"]
    environment: *superset-environment
    depends_on:
      - db
      - redis
    user: "root"
    volumes:
      - superset_docker:/app/docker
      - superset_home:/app/superset_home
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "celery -A superset.tasks.celery_app:app inspect ping -d celery@$$HOSTNAME",
        ]

  superset-worker-beat:
    deploy: *superset-deploy
    image: apache/superset:2.1.0
    command: ["/app/docker/docker-bootstrap.sh", "beat"]
    environment: *superset-environment
    depends_on:
      - db
      - redis
    user: "root"
    volumes:
      - superset_docker:/app/docker
      - superset_home:/app/superset_home
    healthcheck:
      disable: true

volumes:
  superset_home:
    driver: local
  superset_docker:
    driver: local
  db_home:
    driver: local
  redis:
    driver: local
```

These are the example env variables.

```bash

COMPOSE_PROJECT_NAME=superset
DATABASE_DB=superset
DATABASE_HOST=db
DATABASE_PASSWORD=superset
DATABASE_USER=superset
# database engine specific environment variables
# change the below if you prefer another database engine
DATABASE_PORT=5432
DATABASE_DIALECT=postgresql
POSTGRES_DB=superset
POSTGRES_USER=superset
POSTGRES_PASSWORD=superset
#MYSQL_DATABASE=superset
#MYSQL_USER=superset
#MYSQL_PASSWORD=superset
#MYSQL_RANDOM_ROOT_PASSWORD=yes
# Add the mapped in /app/pythonpath_docker which allows devs to override stuff
PYTHONPATH=/app/pythonpath:/app/docker/pythonpath_dev
REDIS_HOST=redis
REDIS_PORT=6379
FLASK_ENV=production
SUPERSET_ENV=production
SUPERSET_LOAD_EXAMPLES=no
SUPERSET_SECRET_KEY=TEST_NON_DEV_SECRET
CYPRESS_CONFIG=false
SUPERSET_PORT=8088
MAPBOX_API_KEY=''
```

## Development

Work on the Dockerfile and use it on your own docker-compose file.

Build the image:

```bash
docker build -t qtrees-superset .
```

Run superset with docker-compose:

```bash
docker compose up
```

## Release

Use conventional commits to create a new release.
The github action [docker-publish.yml](.github/workflows/docker-publish.yml) will build and push on the image to Docker Hub on:

- push to `main` branch
- tags with the prefix `v` and semver format
- Pull requests to `main` branch are only build but not pushed to Docker Hub

## Contributing

Before you create a pull request, write an issue so we can discuss your changes.

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/julizet"><img src="https://avatars.githubusercontent.com/u/52455010?v=4?s=64" width="64px;" alt="Julia Zet"/><br /><sub><b>Julia Zet</b></sub></a><br /><a href="https://github.com/technologiestiftung/qtrees-superset/commits?author=julizet" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://fabianmoronzirfas.me"><img src="https://avatars.githubusercontent.com/u/315106?v=4?s=64" width="64px;" alt="Fabian Morón Zirfas"/><br /><sub><b>Fabian Morón Zirfas</b></sub></a><br /><a href="https://github.com/technologiestiftung/qtrees-superset/commits?author=ff6347" title="Code">💻</a> <a href="#infra-ff6347" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#ideas-ff6347" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/technologiestiftung/qtrees-superset/commits?author=ff6347" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Content Licensing

Texts and content available as [CC BY](https://creativecommons.org/licenses/by/3.0/de/).

Illustrations by {MARIA_MUSTERFRAU}, all rights reserved.

## Credits

<table>
  <tr>
    <td>
      Made by <a href="https://citylab-berlin.org/de/start/">
        <br />
        <br />
        <img width="200" src="https://citylab-berlin.org/wp-content/uploads/2021/05/citylab-logo.svg" />
      </a>
    </td>
    <td>
      A project by <a href="https://www.technologiestiftung-berlin.de/">
        <br />
        <br />
        <img width="150" src="https://citylab-berlin.org/wp-content/uploads/2021/05/tsb.svg" />
      </a>
    </td>
    <td>
      Supported by <a href="https://www.berlin.de/rbmskzl/">
        <br />
        <br />
        <img width="80" src="https://citylab-berlin.org/wp-content/uploads/2021/12/B_RBmin_Skzl_Logo_DE_V_PT_RGB-300x200.png" />
      </a>
    </td>
  </tr>
</table>

## Related Projects

<!-- release: version to docker hub-->
