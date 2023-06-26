process.env.PORT="3030"
process.env.CLIENT_PAYMENT_MANAGER='{"TEMPLATE_IDS":["success","ko"]}'
process.env.CLIENT_ECOMMERCE='{"TEMPLATE_IDS":["success","ko"]}'
process.env.CLIENT_ECOMMERCE_TEST='{"TEMPLATE_IDS":["success","ko","poc-1","poc-2"]}'
process.env.STORAGE_TRANSIENT_CONNECTION_STRING="AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
process.env.STORAGE_DEADLETTER_CONNECTION_STRING="AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
process.env.RETRY_QUEUE_NAME="retry-queue"
process.env.ERROR_QUEUE_NAME="error-queue"
process.env.INITIAL_RETRY_TIMEOUT_SECONDS="120"
process.env.MAX_RETRY_ATTEMPTS="3"
process.env.AI_SAMPLING_PERCENTAGE="30"
process.env.AI_ENABLED=false
process.env.AWS_SES_ACCESS_KEY_ID="test-access-key"
process.env.AWS_SES_REGION="test-region"
process.env.AWS_SES_SECRET_ACCESS_KEY="test-secret-key"
process.env.PAGOPA_MAIL_LOGO_URI="https://dev.checkout.pagopa.it/assets/logos/pagopa-logo.svg"
process.env.ECOMMERCE_NOTIFICATIONS_SENDER="test@test.it"

