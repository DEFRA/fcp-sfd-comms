# fcp-sfd-comms
![Publish](https://github.com/defra/fcp-sfd-comms/actions/workflows/publish.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-sfd-comms&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-sfd-comms) 
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-sfd-comms&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-sfd-comms)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-sfd-comms&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-sfd-comms)

Communications service for the Single Front Door.

This service is part of the [Single Front Door (SFD) service](https://github.com/DEFRA/fcp-sfd-core).

## Prerequisites
- Docker
- Docker Compose
- Node.js (v22 LTS)

## Setup
| Name                      | Default Value                                          | Required                  | Description                                                                 |
|---------------------------|--------------------------------------------------------|---------------------------|-----------------------------------------------------------------------------|
| AWS_REGION                | eu-west-2                                              | No                        | AWS region to access resources in.                                          |
| AWS_DEFAULT_REGION        | eu-west-2                                              | No                        | Default AWS region to access resources in.                                  |
| AWS_ACCESS_KEY_ID         | test                                                   | No                        | AWS Access Key ID.                                                          |
| AWS_SECRET_ACCESS_KEY     | test                                                   | No                        | AWS Secret Access Key.                                                      |
| NOTIFY_API_KEY            | n/a - sensitive                                        | Yes                       | Notify API key to perform API requests to GOV.UK Notify. Generate a test one for local development and testing on the [GOV.UK Notify portal](https://www.notifications.service.gov.uk/). API keys used in CDP environments are saved as secrets on the CDP portal. |                                           | Yes                       | Boolean to determine whether to use mock Notify server.                     |
| MONGO_URI            | mongodb://mongo:27017/                    | No                        | MongoDB connection string.                                                  |
| SQS_ENDPOINT            | http://localstack:4566                                     | No                        | SQS endpoint to.                                           |
| SNS_ENDPOINT            | http://localstack:4566                                     | No                        | SNS endpoint to.                                           |
| COMMS_REQUEST_QUEUE_URL | http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request | No                        | SQS queue URL to send comm requests.                       |
| COMMS_REQUEST_DEAD_LETTER_QUEUE_URL | http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request-deadletter | No                        | Comms Request SQS dead letter queue.                       |
| COMM_EVENTS_TOPIC_ARN | arn:aws:sns:eu-west-2:000000000000:fcp_sfd_comm_events | No                        | SNS topic ARN to publish comm events to.                                         |

### Configuration

## Running the application

We recommend using the [fcp-sfd-core](https://github.com/DEFRA/fcp-sfd-core) repository for local development. You can howerver run this service independently by following the instructions below.

### Build container image

Container images are built using Docker Compose, with the same images used to run the service with either Docker Compose or Kubernetes.

When using the Docker Compose files in development the local `app` folder will
be mounted on top of the `app` folder within the Docker container, hiding the CSS files that were generated during the Docker build.  For the site to render correctly locally `npm run build` must be run on the host system.


By default, the start script will build (or rebuild) images so there will
rarely be a need to build images manually. However, this can be achieved
through the Docker Compose
[build](https://docs.docker.com/compose/reference/build/) command:
```
# Build container images
docker-compose build
```

### Start

Use Docker Compose to run service locally.

```
docker-compose up --build
```

## Tests

### Test structure

The tests have been structured into subfolders of `./test` as per the
[Microservice test approach and repository structure](https://eaflood.atlassian.net/wiki/spaces/FPS/pages/1845396477/Microservice+test+approach+and+repository+structure)

### Running tests

A convenience npm script is provided to run automated tests in a containerised
environment. This will rebuild images before running tests via docker-compose,
using a combination of `compose.yaml` and `compose.test.yaml`.

To run the tests:
```
npm run docker:test
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
