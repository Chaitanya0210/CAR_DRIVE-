import { Controller, Post, Body, Get } from '@nestjs/common';
import { AdvisorService, AdvisorChatDto } from './advisor.service';

@Controller('advisor')
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  @Post('chat')
  async chat(@Body() dto: AdvisorChatDto) {
    return this.advisorService.chat(dto);
  }

  @Post('extract-intent')
  async extractIntent(@Body('query') query: string) {
    return this.advisorService.extractIntent(query);
  }

  @Post('parse-quote')
  async parseQuote(@Body('text') text: string) {
    return this.advisorService.parseQuote(text);
  }

  @Post('classify-review')
  async classifyReview(@Body('text') text: string) {
    return this.advisorService.classifyReview(text);
  }

  @Get('health')
  health() {
    return { status: 'ok', module: 'advisor-proxy' };
  }
}
