# aws-ses-mock configuration

The `notification-service` has `aws-ses` as an external dependency in order to send emails. In some cases (e.g. soak-test) it may be useful to have a mock for making sure that a large number of requests not impacting costs or risk being detected as spam.

To do this, the [aws-ses-v2-local](https://github.com/domdomegg/aws-ses-v2-local) project is chosen to be used, that allow us to simulate emails sending without using aws external dependency.

## Setup

In order to use the mock in one of the environments (dev/uat), it is necessary to start a pod on the cluster with the `aws-ses-mock.yaml` configuration.

### Starting pod on the cluster

```
$ kubectl apply -n ecommerce -f aws-ses-mock.yaml
```

### Modify notification-service pointing.

In order to properly point to the mock, it is necessary to modify the `ConfigMap` of the `notification-service` pod by updating the `AWS_SES_ENDPOINT` variable as follows:

```
$ AWS_SES_ENDPOINT: http://aws-ses-mock.ecommerce.svc.cluster.local:8005
```

## Verify mock working

Once `notification-service` pod has restarted, the configuration is ready. Now it is possible to open the webapp made available by `aws-ses-v2-local` to view all the mails that the service has attempted to send, ad the following url:

```
$ http://<ip-mock-address>:8005
```