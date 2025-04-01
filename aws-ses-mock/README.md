# Configurazione aws-ses-mock

Il `notification-service` ha come dipendenza esterna il servizio per poter inviare le mail `aws-ses`. In alcuni casi (es. soak-test) può essere utile avere un mock per non andare ad impattare sui costi o rischiare di essere rilevati come spam.

Per fare ciò è stato scelto di usare il progetto [aws-ses-v2-local](https://github.com/domdomegg/aws-ses-v2-local), per permettere di simulare l'invio delle mail e slegarsi dalla dipendenza esterna di aws.


## Setup

Per poter utilizzare il mock in uno degli ambienti (dev/uat) è necessario avviare un pod nel cluster partendo dalla configurazione `aws-ses-mock.yaml`.

### Avvio pod sul cluster

```
$ kubectl apply -n ecommerce -f aws-ses-mock.yaml
```

### Modificare puntamento notification-service
Per poter puntare correttamente al mock è necessario modificare la `ConfigMap` del pod `notification-service` aggiornando la variabile `AWS_SES_ENDPOINT` nel modo seguente:

```
$ AWS_SES_ENDPOINT: http://aws-ses-mock.ecommerce.svc.cluster.local:8005
```

## Verifica funzionamento mock
Una volta che il pod si è riavviato è possibile consultare il portare messo a disposizione da `aws-ses-v2-local` per visualizzare tutte le mail che il servizio ha tentato di inviare. Per fare ciò è necessario aprire il browser puntando all'url:

```
$ http://<indirizzo-ip-mock>:8005
```