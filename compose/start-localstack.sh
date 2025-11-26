#!/bin/bash
echo "creating localstack resources"
echo "----------"
aws --endpoint-url=http://localhost:4567 sqs create-queue --queue-name fcp_sfd_comms_request-deadletter
aws --endpoint-url=http://localhost:4567 sqs create-queue --queue-name fcp_sfd_comms_request --attributes "{\"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"arn:aws:sqs:eu-west-2:000000000000:fcp_sfd_comms_request-deadletter\\\",\\\"maxReceiveCount\\\":\\\"10\\\"}\"}"

aws --endpoint-url=http://localhost:4567 sns create-topic --name fcp_sfd_comm_events

aws --endpoint-url=http://localhost:4567 sqs create-queue --queue-name fcp_fdm_events-deadletter
aws --endpoint-url=http://localhost:4567 sqs create-queue --queue-name fcp_fdm_events --attributes "{\"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"arn:aws:sqs:eu-west-2:000000000000:fcp_fdm_events-deadletter\\\",\\\"maxReceiveCount\\\":\\\"10\\\"}\"}"

aws --endpoint-url=http://localhost:4567 sqs set-queue-attributes --queue-url http://localhost:4566/000000000000/fcp_fdm_events --attributes "{\"Policy\":\"{\\\"Statement\\\":[{\\\"Effect\\\":\\\"Allow\\\",\\\"Principal\\\":{\\\"Service\\\":\\\"sns.amazonaws.com\\\"},\\\"Action\\\":\\\"sqs:SendMessage\\\",\\\"Resource\\\":\\\"arn:aws:sqs:eu-west-2:000000000000:fcp_fdm_events\\\",\\\"Condition\\\":{\\\"ArnEquals\\\":{\\\"aws:SourceArn\\\":\\\"arn:aws:sns:eu-west-2:000000000000:fcp_sfd_comm_events\\\"}}}]}\"}"

aws --endpoint-url=http://localhost:4567 sns subscribe --topic-arn arn:aws:sns:eu-west-2:000000000000:fcp_sfd_comm_events --protocol sqs --notification-endpoint arn:aws:sqs:eu-west-2:000000000000:fcp_fdm_events
