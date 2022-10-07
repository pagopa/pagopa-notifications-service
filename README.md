# pagoPA notifications service

This project implements the APIs to enable user receipts for _ecommerce platform_.

## Architecture overview

![Alt text](arch-notifications-service.png "Arch")


### Setup


Install the dependencies:

```
$ yarn install
```

Create a file `.env` in your cloned repo, with the contents similar to `.env.example`


### Starting the API runtime

```
$ yarn start
```

The server should reload automatically when the code changes.

This microservice use https://github.com/pagopa/aks-microservice-chart-blueprint to release it in k8s.

## How to upgrade helm microservice chart release

Follow this steps if you need to upgrade the microservice-chart release.

### step 1) update dependencies microservice-chart version

```yaml
apiVersion: v2
name: microservice-ms
description: microservice-ms
type: application
version: 1.0.0
appVersion: 1.0.0
dependencies:
  - name: microservice-chart
    version: 1.21.0 
    repository: 'https://pagopa.github.io/aks-microservice-chart-blueprint'
```

### step2) update helm dependency to set Chart.lock

```sh
helm dependency update helm/
```
