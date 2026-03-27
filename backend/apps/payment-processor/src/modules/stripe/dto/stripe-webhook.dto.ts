export class StripeWebhookDto {
  type?: string;
  data?: {
    object?: {
      id?: string;
      metadata?: Record<string, string>;
    };
  };
}
