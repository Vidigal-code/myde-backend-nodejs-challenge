import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AppConfigService } from '@/config/app-config.service';
import { LlmProvider, LlmRequest, LlmResult } from './llm.types';
import { DONT_KNOW_REPLY } from './prompt.builder';
import { OrderStatusClient } from './order-status/order-status.client';
import { ORDER_STATUS_TOOL, executeOrderStatusTool } from './tools/order-status.tool';

const MAX_TOOL_ROUNDS = 2;

/** Provider real usando a OpenAI Chat Completions com function calling (get_order_status). */
@Injectable()
export class OpenAiLlmProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiLlmProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    private readonly config: AppConfigService,
    private readonly orderClient: OrderStatusClient,
  ) {
    this.client = new OpenAI({ apiKey: this.config.openAi.apiKey });
    this.model = this.config.openAi.model;
  }

  async generate(request: LlmRequest): Promise<LlmResult> {
    const messages = this.buildMessages(request);

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: [ORDER_STATUS_TOOL],
        temperature: 0.2,
      });

      const choice = completion.choices[0].message;
      const toolCalls = choice.tool_calls ?? [];

      if (toolCalls.length === 0) {
        return { text: choice.content ?? DONT_KNOW_REPLY, usedFallback: false };
      }

      messages.push(choice);
      for (const call of toolCalls) {
        const output = await this.runTool(call);
        messages.push({ role: 'tool', tool_call_id: call.id, content: output });
      }
    }

    this.logger.warn('limite de rounds de tool atingido; retornando fallback de "não sei"');
    return { text: DONT_KNOW_REPLY, usedFallback: false };
  }

  private buildMessages(request: LlmRequest): ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: request.systemPrompt },
      ...request.history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: request.userMessage },
    ];
  }

  private async runTool(call: {
    function: { name: string; arguments: string };
  }): Promise<string> {
    if (call.function.name === 'get_order_status') {
      return executeOrderStatusTool(call.function.arguments, this.orderClient);
    }
    return JSON.stringify({ error: `função desconhecida: ${call.function.name}` });
  }
}
