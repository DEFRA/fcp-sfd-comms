#!/bin/bash
aws --endpoint-url=http://localhost:4566 --region eu-west-2 sns create-topic --name fcp-sfd-comms-topic
aws --endpoint-url=http://localhost:4566 --region eu-west-2 sqs create-queue --queue-name fcp-sfd-comms-dlq
aws --endpoint-url=http://localhost:4566 --region eu-west-2 sqs create-queue --queue-name fcp-sfd-comms-queue --attributes "{\"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"arn:aws:sqs:eu-west-2:000000000000:fcp-sfd-comms-dlq\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}"
aws --endpoint-url=http://localhost:4566 --region eu-west-2 sns subscribe --topic-arn arn:aws:sns:eu-west-2:000000000000:fcp-sfd-comms-topic --protocol sqs --notification-endpoint arn:aws:sqs:eu-west-2:000000000000:fcp-sfd-comms-queue