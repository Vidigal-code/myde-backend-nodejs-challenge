import { Provider } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import { AppConfigService } from '@/config/app-config.service';

/** Token de injeção do SQSClient. */
export const SQS_CLIENT = Symbol('SQS_CLIENT');

/** Cria o SQSClient apontando para o LocalStack (ou AWS real) conforme o endpoint configurado. */
export function createSqsClient(config: AppConfigService): SQSClient {
  const aws = config.aws;
  return new SQSClient({
    region: aws.region,
    endpoint: aws.endpoint,
    credentials: {
      accessKeyId: aws.accessKeyId,
      secretAccessKey: aws.secretAccessKey,
    },
  });
}

export const sqsClientProvider: Provider = {
  provide: SQS_CLIENT,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => createSqsClient(config),
};
