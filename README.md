# fcp-sfd-comms
![Publish](https://github.com/defra/fcp-sfd-comms/actions/workflows/publish.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-sfd-comms&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-sfd-comms) 
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-sfd-comms&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-sfd-comms)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-sfd-comms&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-sfd-comms)

Communications service for the Single Front Door.

This service is part of the [Single Front Door (SFD) service](https://github.com/DEFRA/fcp-sfd-core).

## Architecture overview

### Receiving and processing messages
Blue - happy path.  
Orange - retrieving status update (via cron job).  
Red - handling retries.
```mermaid
graph
    subgraph "Consumers"
        IAHW[Improving Animal Health and Welfare]
        FUTURE[Future consumers]
    end
    
    subgraph "Single Front Door (SFD) comms"
        PARSE[Parse message]
        VALIDATION[Validate message against schema]
        IDEMPOTENCY_CHECK[Check message is idempotent]
        SNS[SNS topic]
        UPDATE[Retrieve status update]
        RETRY[Handle retries for failed message delivery]
    end

    subgraph "GOV.UK Notify API"
        NOTIFY[Request delivery]
        STATUS[Current message status]
    end

    subgraph "Farming Data Model (FDM)"
        SQS[SQS queue]
    end

    subgraph "Data Storage"
        MONGO[(MongoDB)]
    end


    subgraph "RECIPIENT"
        DELIVERY[Recipient's inbox]
    end
    
    IAHW -->|Send message| PARSE
    FUTURE -->|Send message| PARSE
    PARSE -->|Validate| VALIDATION
    VALIDATION --> IDEMPOTENCY_CHECK
    IDEMPOTENCY_CHECK -->|Build and publish message| SNS
    IDEMPOTENCY_CHECK -->|Store message| MONGO
    SNS -->|Subscriber receives message| SQS
    SNS -->|Send request to Notify| NOTIFY
    NOTIFY -->|Deliver message| DELIVERY
    IDEMPOTENCY_CHECK --> UPDATE
    UPDATE <-.->|Retrieve and return status update| STATUS
    UPDATE -->|Store status update| MONGO
    UPDATE -->|Re-build and publish|SNS
    SNS --> SQS
    UPDATE --> RETRY
    RETRY -->|Re-build and publish retry| SNS
    SNS --> NOTIFY
    NOTIFY --> DELIVERY

    linkStyle 0 stroke:#aadee3
    linkStyle 1 stroke:#aadee3
    linkStyle 2 stroke:#aadee3
    linkStyle 3 stroke:#aadee3
    linkStyle 4 stroke:#aadee3
    linkStyle 5 stroke:#aadee3
    linkStyle 6 stroke:#aadee3
    linkStyle 7 stroke:#aadee3
    linkStyle 8 stroke:#aadee3
    linkStyle 9 stroke:#e6c19c
    linkStyle 10 stroke:#e6c19c
    linkStyle 11 stroke:#e6c19c
    linkStyle 12 stroke:#e6c19c
    linkStyle 13 stroke:#e6c19c
    linkStyle 14 stroke:#db9393
    linkStyle 15 stroke:#db9393
    linkStyle 16 stroke:#db9393
    linkStyle 17 stroke:#db9393

    style MONGO fill:#e8f5e8,color:#0E0E0E
    style SNS fill:#e1f5fe,color:#0E0E0E
    style SQS fill:#e1f5fe,color:#0E0E0E
```

### Cron jobs
```mermaid
graph
    subgraph "GOV.UK Notify API"
        NOTIFY_STATUS[Check latest status update]
    end

    subgraph "Single Front Door (SFD) comms"
        CRON[Trigger cron job every 30 seconds]
        CHECK_DB[Check 'pending' messages in storage]
        UPDATE_DB[Retrieve status update]
        RETRY[Handle retries for failed deliveries]
        SNS[SNS topic]
    end

    subgraph "Data Storage"
        MONGO[(MongoDB)]
    end

    subgraph "Farming Data Model (FDM)"
        SQS[SQS queue]
    end

    CRON --> CHECK_DB
    CHECK_DB --> NOTIFY_STATUS
    NOTIFY_STATUS --> UPDATE_DB
    UPDATE_DB -->|Store status update| MONGO
    UPDATE_DB -->|Re-build and publish message| SNS
    UPDATE_DB --> RETRY
    RETRY -->|Re-build and publish message| SNS
    SNS -->|Subscriber consumes message| SQS

    style MONGO fill:#e8f5e8,color:#0E0E0E
    style SNS fill:#e1f5fe,color:#0E0E0E
    style SQS fill:#e1f5fe,color:#0E0E0E
```

## Event processing pipeline

### Processing flow
```mermaid
sequenceDiagram
    participant CONSUMER as Consumer
    participant SFD as Single Front Door
    participant VALIDATOR as Scheme validation
    participant IDEMPOTENCY_CHECKER as Idempotency checker
    participant MONGO as MongoDB
    participant SNS as SNS topic
    participant FDM as Farming Data Model (FDM)
    participant NOTIFY as GOV.UK Notify API
    participant RECIPIENT as Recipient inbox

    CONSUMER->>SFD: Parse message
    SFD->>VALIDATOR: Validate against schema
    VALIDATOR->>IDEMPOTENCY_CHECKER: Ensure idempotency
    IDEMPOTENCY_CHECKER->>MONGO: Store message
    IDEMPOTENCY_CHECKER->>SNS: Build and publish message
    SNS->>FDM: Pass message to FDM SQS subscriber
    SNS->>NOTIFY: Send request to Notify
    NOTIFY->>RECIPIENT: Deliver message

    SFD->>NOTIFY: Retrieve status update
    NOTIFY-->>SFD: Return status update
    SFD->>SNS: Re-build and publish message
    SNS->>FDM: Pass updated message to FDM SQS subscriber
    SFD->>MONGO: Store status update

    SFD-->>SFD: Handle retries for failed deliveries
    SFD->>SNS: Re-build and publish message on retry
    SFD->>MONGO: Store retried message
    SNS->>FDM: Subscriber consumes updated request
    SNS->>NOTIFY: Send retry request to Notify
    NOTIFY->>RECIPIENT: Deliver message on retry
```

## Prerequisites
- Docker
- Docker Compose
- Node.js (v22 LTS)

## Environment variables
| Name | Default value | Required | Description |
|-|-|-|-|
| AWS_REGION | eu-west-2 | No | AWS region to access resources in. |
| AWS_DEFAULT_REGION | eu-west-2 | No | Default AWS region to access resources in. |
| AWS_ACCESS_KEY_ID | test | No | AWS Access Key ID. |
| AWS_SECRET_ACCESS_KEY | test | No | AWS Secret Access Key. |
| NOTIFY_API_KEY | n/a - sensitive | Yes | Notify API key to perform API requests to GOV.UK Notify. Generate a test API key for local development and testing on the [GOV.UK Notify portal](https://www.notifications.service.gov.uk/). |
| MONGO_URI | mongodb://mongo:27017/ | No | MongoDB connection string. |
| SQS_ENDPOINT | http://localstack:4566 | No | SQS endpoint. |
| SNS_ENDPOINT | http://localstack:4566 | No | SNS endpoint. |
| COMMS_REQUEST_QUEUE_URL | http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request | No | SQS queue URL to send comms requests. |
| COMMS_REQUEST_DEAD_LETTER_QUEUE_URL | http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_sfd_comms_request-deadletter | No | Comms Request SQS dead letter queue. |
| COMM_EVENTS_TOPIC_ARN | arn:aws:sns:eu-west-2:000000000000:fcp_sfd_comm_events | No | SNS topic ARN to publish comm events to. |
| FDM_QUEUE_URL | http://sqs.eu-west-2.127.0.0.1:4566/000000000000/fcp_fdm_events | No | SQS queue that is subscribed to the events SNS topic. |

## Running the application

We recommend using the [fcp-sfd-core](https://github.com/DEFRA/fcp-sfd-core) repository for local development. You can however run this service independently by following the instructions below.

#### Build container image

The service runs inside of a Docker container and the container image can be built using Docker Compose:
```
docker compose build
```

#### Start the container

Once built, the container is also started via Docker Compose: 

```
docker compose up -d
```

## Tests

### Test structure

The tests have been structured into subfolders of `./test` as per the
[Microservice test approach and repository structure](https://eaflood.atlassian.net/wiki/spaces/FPS/pages/1845396477/Microservice+test+approach+and+repository+structure).

### Running tests

An `npm` script is provided to run automated tests in a container. This will rebuild images before running tests via Docker Compose:

```
npm run docker:test
```

A watch script is also available which will run the test container, watch all test files for any changes, and re-run the tests in real time. This script is specifically designed to enable test driven development (TDD):

```
npm run docker:test:watch
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of His Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
