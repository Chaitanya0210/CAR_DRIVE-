import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService, WebhookEventPayload } from './payments.service';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: WebhookEventPayload,
    @Headers('x-groupdrive-signature') signature?: string,
  ) {
    if (!payload.gatewayTransactionRef || !payload.amountPaise) {
      throw new BadRequestException(
        'Invalid webhook payload: missing transaction reference or amount',
      );
    }

    return this.paymentsService.handlePaymentWebhook({
      ...payload,
      signature,
    });
  }
}
