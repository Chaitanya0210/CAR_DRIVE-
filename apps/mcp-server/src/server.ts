import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  AuthContext,
  UserRole,
  AuthScope,
  authenticateToken,
  assertAuthorized,
  UnauthorizedError,
} from './auth/tokens.js';
import { rateLimiter } from './security/rate-limiter.js';
import { costBudgetManager } from './security/cost-budget.js';
import { idempotencyStore } from './security/idempotency.js';
import { deepScanObject } from './security/injection-detector.js';
import { auditLogger } from './security/audit-logger.js';
import { ConfirmationTokenError } from './security/confirmation.js';

// Buyer Tools
import { searchGroupsSchema, handleSearchGroups } from './tools/buyer/search-groups.js';
import { getGroupSchema, handleGetGroup } from './tools/buyer/get-group.js';
import { createGroupSchema, handleCreateGroup } from './tools/buyer/create-group.js';
import { joinGroupSchema, handleJoinGroup } from './tools/buyer/join-group.js';
import { getQuotesSchema, handleGetQuotes } from './tools/buyer/get-quotes.js';
import { compareQuotesSchema, handleCompareQuotes } from './tools/buyer/compare-quotes.js';
import {
  calculateOnRoadPriceSchema,
  handleCalculateOnRoadPrice,
} from './tools/buyer/calculate-price.js';
import {
  searchOfferedVehiclesSchema,
  handleSearchOfferedVehicles,
} from './tools/buyer/search-vehicles.js';
import { trackBookingSchema, handleTrackBooking } from './tools/buyer/track-booking.js';

// Seller Tools
import { listOpenRfqsSchema, handleListOpenRfqs } from './tools/seller/list-rfqs.js';
import {
  getRfqDemandInsightsSchema,
  handleGetRfqDemandInsights,
} from './tools/seller/get-rfq-demand.js';
import { draftQuoteSchema, handleDraftQuote } from './tools/seller/draft-quote.js';
import { submitQuoteSchema, handleSubmitQuote } from './tools/seller/submit-quote.js';
import { listMyListingsSchema, handleListMyListings } from './tools/seller/list-listings.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  role: UserRole;
  requiredScope?: AuthScope;
  isWriteTool?: boolean;
  zodSchema: z.ZodObject<any>;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (params: any, auth: AuthContext) => Promise<any>;
}

export interface GroupDriveMcpServerOptions {
  authToken?: string;
  defaultRole?: UserRole;
  enforceStrictInjectionBlock?: boolean;
}

export class GroupDriveMcpServer {
  public readonly server: Server;
  private readonly defaultAuth?: AuthContext;
  private tools = new Map<string, McpToolDefinition>();
  private enforceStrictInjection: boolean;

  constructor(options: GroupDriveMcpServerOptions = {}) {
    this.server = new Server(
      {
        name: 'groupdrive-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    if (options.authToken) {
      this.defaultAuth = authenticateToken(options.authToken);
    } else if (options.defaultRole === 'BUYER') {
      this.defaultAuth = authenticateToken('demo-buyer-token');
    } else if (options.defaultRole === 'SELLER') {
      this.defaultAuth = authenticateToken('demo-seller-token');
    } else if (options.defaultRole === 'ADMIN') {
      this.defaultAuth = authenticateToken('demo-admin-token');
    }

    this.enforceStrictInjection = options.enforceStrictInjectionBlock ?? false;

    this.registerAllTools();
    this.setupRequestHandlers();
  }

  private registerAllTools(): void {
    // -------------------------------------------------------------
    // BUYER TOOLS (9 tools)
    // -------------------------------------------------------------
    this.registerTool({
      name: 'search_groups',
      description:
        'Search active taluka/district buyer groups by brand, model, zone, status, or minimum quorum.',
      role: 'BUYER',
      requiredScope: 'buyer:read',
      zodSchema: searchGroupsSchema,
      inputSchema: {
        type: 'object',
        properties: {
          brand: {
            type: 'string',
            description: 'Filter by vehicle brand (e.g. Mahindra, Tata, Maruti Suzuki)',
          },
          model: { type: 'string', description: 'Filter by model (e.g. Scorpio-N, Nexon, Brezza)' },
          zone_id: {
            type: 'string',
            description: 'Filter by delivery zone ID (e.g. zone-baramati)',
          },
          status: {
            type: 'string',
            enum: [
              'OPEN',
              'THRESHOLD_MET',
              'RFQ_OPEN',
              'QUOTES_CLOSED',
              'VOTING',
              'WINNER_SELECTED',
              'BOOKING',
              'COMPLETED',
            ],
            description: 'Filter by group status',
          },
          min_members: {
            type: 'integer',
            minimum: 1,
            description: 'Minimum number of registered buyers',
          },
        },
      },
      handler: handleSearchGroups,
    });

    this.registerTool({
      name: 'get_group',
      description:
        'Get complete group cohort details, quorum progress, member variant preferences, and deadline countdown.',
      role: 'BUYER',
      requiredScope: 'buyer:read',
      zodSchema: getGroupSchema,
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Unique ID of the buyer group' },
        },
        required: ['group_id'],
      },
      handler: handleGetGroup,
    });

    this.registerTool({
      name: 'create_group',
      description:
        'Initiate a new local buyer cohort. Two-step confirmation: call first without token to preview deposit & quorum rules, then confirm with confirmation_token.',
      role: 'BUYER',
      requiredScope: 'buyer:write',
      isWriteTool: true,
      zodSchema: createGroupSchema,
      inputSchema: {
        type: 'object',
        properties: {
          brand: { type: 'string', description: 'Automobile brand' },
          model: { type: 'string', description: 'Automobile model' },
          variant: { type: 'string', description: 'Lead vehicle variant' },
          zone_id: { type: 'string', description: 'Delivery taluka/district zone ID' },
          target_size: {
            type: 'integer',
            minimum: 3,
            maximum: 50,
            description: 'Target buyer quorum',
          },
          deadline_days: {
            type: 'integer',
            minimum: 1,
            maximum: 30,
            description: 'Cohort duration days',
          },
          color_preference: { type: 'string', description: 'Preferred color' },
          confirmation_token: { type: 'string', description: 'Step 2 confirmation token' },
          idempotency_key: {
            type: 'string',
            description: 'Unique request key to avoid duplicates',
          },
        },
        required: ['brand', 'model', 'variant', 'zone_id', 'target_size', 'deadline_days'],
      },
      handler: handleCreateGroup,
    });

    this.registerTool({
      name: 'join_group',
      description:
        'Commit to joining an existing buyer group. Two-step confirmation: call first to preview deposit terms, then confirm with confirmation_token.',
      role: 'BUYER',
      requiredScope: 'buyer:write',
      isWriteTool: true,
      zodSchema: joinGroupSchema,
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Buyer group ID' },
          variant: { type: 'string', description: 'Selected variant' },
          color_preference: { type: 'string', description: 'Exterior color' },
          delivery_zone_id: { type: 'string', description: 'Buyer delivery zone' },
          confirmation_token: { type: 'string', description: 'Step 2 confirmation token' },
          idempotency_key: { type: 'string', description: 'Unique request key' },
        },
        required: ['group_id', 'variant', 'color_preference', 'delivery_zone_id'],
      },
      handler: handleJoinGroup,
    });

    this.registerTool({
      name: 'get_quotes',
      description:
        'Fetch received dealer quotes for a group RFQ (quotes remain sealed while bidding window is open).',
      role: 'BUYER',
      requiredScope: 'buyer:read',
      zodSchema: getQuotesSchema,
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Buyer group ID' },
        },
        required: ['group_id'],
      },
      handler: handleGetQuotes,
    });

    this.registerTool({
      name: 'compare_quotes',
      description:
        'Compare unmasked dealer quotes side-by-side using the pure landed-cost engine (ex-showroom, discounts, RTO, insurance, logistics, net savings).',
      role: 'BUYER',
      requiredScope: 'buyer:read',
      zodSchema: compareQuotesSchema,
      inputSchema: {
        type: 'object',
        properties: {
          group_id: { type: 'string', description: 'Buyer group ID' },
          buyer_state: {
            type: 'string',
            description: 'State for tax calculation (default Maharashtra)',
          },
          selected_quote_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific quote IDs to compare',
          },
        },
        required: ['group_id'],
      },
      handler: handleCompareQuotes,
    });

    this.registerTool({
      name: 'calculate_on_road_price',
      description:
        'Calculate exact on-road price line items (RTO road tax, insurance, GST, cess, logistics) for any model and state.',
      role: 'BUYER',
      requiredScope: 'buyer:read',
      zodSchema: calculateOnRoadPriceSchema,
      inputSchema: {
        type: 'object',
        properties: {
          ex_showroom_paise: {
            type: 'integer',
            minimum: 10000000,
            description: 'Ex-showroom price in paise',
          },
          state_code: { type: 'string', description: 'State code (e.g. MH, MP)' },
          fuel_type: {
            type: 'string',
            enum: ['PETROL', 'DIESEL', 'CNG', 'EV'],
            description: 'Fuel type',
          },
          engine_cc: { type: 'integer', description: 'Engine CC' },
          is_ev: { type: 'boolean', description: 'Electric vehicle' },
          logistics_paise: { type: 'integer', description: 'Logistics fee in paise' },
        },
        required: ['ex_showroom_paise'],
      },
      handler: handleCalculateOnRoadPrice,
    });

    this.registerTool({
      name: 'search_offered_vehicles',
      description:
        'Search dealership stock clearance, aged inventory, and demo vehicles with verified warranty and deal score.',
      role: 'BUYER',
      requiredScope: 'buyer:read',
      zodSchema: searchOfferedVehiclesSchema,
      inputSchema: {
        type: 'object',
        properties: {
          brand: { type: 'string', description: 'Brand filter' },
          fuel: {
            type: 'string',
            enum: ['PETROL', 'DIESEL', 'CNG', 'EV'],
            description: 'Fuel filter',
          },
          body_type: { type: 'string', description: 'Body type filter' },
          zone_id: { type: 'string', description: 'Location zone' },
          budget_max_paise: { type: 'integer', description: 'Maximum budget in paise' },
          category: {
            type: 'string',
            enum: ['STOCK_CLEARANCE', 'DEMO_TEST_DRIVE', 'PREVIOUS_YEAR', 'FESTIVAL_OFFER'],
            description: 'Clearance category',
          },
          sort_by: {
            type: 'string',
            enum: ['discount', 'price', 'deal_score'],
            description: 'Sort order',
          },
        },
      },
      handler: handleSearchOfferedVehicles,
    });

    this.registerTool({
      name: 'track_booking',
      description:
        'Track order booking, held escrow payment status, GPS carrier transit milestones, and PDI checklist.',
      role: 'BUYER',
      requiredScope: 'buyer:read',
      zodSchema: trackBookingSchema,
      inputSchema: {
        type: 'object',
        properties: {
          booking_id: { type: 'string', description: 'Order booking ID (e.g. bkg-demo-101)' },
        },
        required: ['booking_id'],
      },
      handler: handleTrackBooking,
    });

    // -------------------------------------------------------------
    // SELLER TOOLS (5 tools)
    // -------------------------------------------------------------
    this.registerTool({
      name: 'list_open_rfqs',
      description:
        'List open reverse auction RFQs matching dealer authorized brands and serviceable territory zones.',
      role: 'SELLER',
      requiredScope: 'seller:read',
      zodSchema: listOpenRfqsSchema,
      inputSchema: {
        type: 'object',
        properties: {
          brand: { type: 'string', description: 'Filter by vehicle brand' },
          zone_id: { type: 'string', description: 'Filter by delivery zone' },
        },
      },
      handler: handleListOpenRfqs,
    });

    this.registerTool({
      name: 'get_rfq_demand_insights',
      description:
        'Get aggregate buyer demand analytics for an RFQ (cohort size, variant distribution, color mix, winning discount benchmarks).',
      role: 'SELLER',
      requiredScope: 'seller:read',
      zodSchema: getRfqDemandInsightsSchema,
      inputSchema: {
        type: 'object',
        properties: {
          rfq_id: { type: 'string', description: 'Open RFQ ID' },
        },
        required: ['rfq_id'],
      },
      handler: handleGetRfqDemandInsights,
    });

    this.registerTool({
      name: 'draft_quote',
      description:
        'Draft a competitive sealed quote for an open RFQ. Computes platform commission (1% + GST) and net dealer payout without submitting.',
      role: 'SELLER',
      requiredScope: 'seller:write',
      zodSchema: draftQuoteSchema,
      inputSchema: {
        type: 'object',
        properties: {
          rfq_id: { type: 'string', description: 'Target RFQ ID' },
          ex_showroom_discount_paise: {
            type: 'integer',
            minimum: 1000000,
            description: 'Discount per vehicle in paise',
          },
          logistics_cost_paise: {
            type: 'integer',
            minimum: 0,
            description: 'Logistics cost per vehicle in paise',
          },
          free_accessories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Free accessories offered',
          },
          delivery_timeline_days: {
            type: 'integer',
            minimum: 1,
            maximum: 60,
            description: 'Delivery timeline in days',
          },
          validity_hours: {
            type: 'integer',
            minimum: 24,
            maximum: 168,
            description: 'Quote validity period in hours',
          },
          notes: { type: 'string', description: 'Internal pricing notes' },
        },
        required: ['rfq_id', 'ex_showroom_discount_paise'],
      },
      handler: handleDraftQuote,
    });

    this.registerTool({
      name: 'submit_quote',
      description:
        'Officially seal and submit a drafted quote into the reverse auction. Two-step confirmation: preview binding terms first, then confirm with confirmation_token.',
      role: 'SELLER',
      requiredScope: 'seller:write',
      isWriteTool: true,
      zodSchema: submitQuoteSchema,
      inputSchema: {
        type: 'object',
        properties: {
          draft_quote_id: {
            type: 'string',
            description: 'The draft quote ID to officially submit',
          },
          confirmation_token: { type: 'string', description: 'Step 2 confirmation token' },
          idempotency_key: { type: 'string', description: 'Unique request key' },
        },
        required: ['draft_quote_id'],
      },
      handler: handleSubmitQuote,
    });

    this.registerTool({
      name: 'list_my_listings',
      description:
        'List dealership active clearance, demo, and stock listings with units remaining and moderation status.',
      role: 'SELLER',
      requiredScope: 'seller:read',
      zodSchema: listMyListingsSchema,
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ACTIVE', 'SOLD', 'PENDING_MODERATION'],
            description: 'Listing status',
          },
        },
      },
      handler: handleListMyListings,
    });
  }

  public registerTool(tool: McpToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): McpToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Resolves authentication context from request metadata or server session default.
   */
  private resolveAuth(meta?: Record<string, unknown>): AuthContext {
    const rawToken = (meta?.authorization || meta?.token) as string | undefined;
    if (rawToken) {
      return authenticateToken(rawToken);
    }
    if (this.defaultAuth) {
      return this.defaultAuth;
    }
    throw new UnauthorizedError(
      'No authentication token provided in request metadata or server session.',
    );
  }

  private setupRequestHandlers(): void {
    // -------------------------------------------------------------
    // Handler 1: tools/list (With Strict Role & Scope Isolation)
    // -------------------------------------------------------------
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      let auth: AuthContext | null = null;
      try {
        auth = this.resolveAuth(request.params?._meta as Record<string, unknown> | undefined);
      } catch {
        // If unauthenticated, return empty tools list
        return { tools: [] };
      }

      // Filter tools strictly by the caller's role
      const availableTools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }> = [];

      for (const tool of this.tools.values()) {
        if (auth.role === 'ADMIN') {
          // Admin sees all tools
          availableTools.push({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema as Record<string, unknown>,
          });
        } else if (auth.role === tool.role) {
          // Check scope if required
          if (!tool.requiredScope || auth.scopes.includes(tool.requiredScope)) {
            availableTools.push({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema as Record<string, unknown>,
            });
          }
        }
        // NOTE: Buyer role can NEVER see seller tools.
        // Seller role can NEVER see buyer tools.
      }

      return { tools: availableTools };
    });

    // -------------------------------------------------------------
    // Handler 2: tools/call (With Auth, Rate Limits, Guardrails, 2-Step)
    // -------------------------------------------------------------
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const toolName = request.params.name;
      const meta = request.params._meta as Record<string, unknown> | undefined;

      // 1. Resolve Auth
      let auth: AuthContext;
      try {
        auth = this.resolveAuth(meta);
      } catch (err: any) {
        throw new McpError(ErrorCode.InvalidRequest, `Authentication failed: ${err.message}`);
      }

      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool '${toolName}' not found.`);
      }

      // 2. Strict Role & Authorization Guard
      try {
        assertAuthorized(auth, tool.role, tool.requiredScope);
      } catch (authErr: any) {
        auditLogger.log({
          userId: auth.userId,
          role: auth.role,
          toolName,
          status: 'REJECTED',
          latencyMs: Date.now() - startTime,
          sanitizedArgs: (request.params.arguments || {}) as Record<string, unknown>,
          errorMessage: authErr.message,
        });

        // Return standard MCP Error with forbidden message
        throw new McpError(ErrorCode.InvalidRequest, `Forbidden: ${authErr.message}`);
      }

      // 3. Rate Limiter Guard
      try {
        rateLimiter.checkLimit(auth.userId);
      } catch (rlErr: any) {
        auditLogger.log({
          userId: auth.userId,
          role: auth.role,
          toolName,
          status: 'REJECTED',
          latencyMs: Date.now() - startTime,
          sanitizedArgs: (request.params.arguments || {}) as Record<string, unknown>,
          errorMessage: rlErr.message,
        });
        throw new McpError(ErrorCode.InternalError, rlErr.message);
      }

      // 4. Per-User Cost Budget Guard
      try {
        costBudgetManager.checkBudget(auth.userId, 0.01, auth.costBudgetUsd);
      } catch (cbErr: any) {
        auditLogger.log({
          userId: auth.userId,
          role: auth.role,
          toolName,
          status: 'REJECTED',
          latencyMs: Date.now() - startTime,
          sanitizedArgs: (request.params.arguments || {}) as Record<string, unknown>,
          errorMessage: cbErr.message,
        });
        throw new McpError(ErrorCode.InternalError, cbErr.message);
      }

      const rawArgs = (request.params.arguments || {}) as Record<string, any>;

      // 5. Idempotency Check
      if (rawArgs.idempotency_key) {
        const cached = idempotencyStore.get(auth.userId, rawArgs.idempotency_key);
        if (cached) {
          auditLogger.log({
            userId: auth.userId,
            role: auth.role,
            toolName,
            status: 'SUCCESS',
            latencyMs: Date.now() - startTime,
            sanitizedArgs: rawArgs,
            idempotencyKey: rawArgs.idempotency_key,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { ...(cached as Record<string, unknown>), idempotency_cached: true },
                  null,
                  2,
                ),
              },
            ],
          };
        }
      }

      // 6. Prompt Injection Detection & Input Sanitization
      let cleanArgs: Record<string, any>;
      try {
        cleanArgs = deepScanObject(rawArgs, this.enforceStrictInjection);
      } catch (injErr: any) {
        auditLogger.log({
          userId: auth.userId,
          role: auth.role,
          toolName,
          status: 'REJECTED',
          latencyMs: Date.now() - startTime,
          sanitizedArgs: rawArgs,
          errorMessage: injErr.message,
        });
        throw new McpError(ErrorCode.InvalidParams, injErr.message);
      }

      // 7. Zod Schema Validation
      const parseResult = tool.zodSchema.safeParse(cleanArgs);
      if (!parseResult.success) {
        auditLogger.log({
          userId: auth.userId,
          role: auth.role,
          toolName,
          status: 'FAILED',
          latencyMs: Date.now() - startTime,
          sanitizedArgs: cleanArgs,
          errorMessage: parseResult.error.message,
        });
        throw new McpError(
          ErrorCode.InvalidParams,
          `Schema validation failed: ${parseResult.error.message}`,
        );
      }

      // 8. Tool Handler Execution
      try {
        const result = await tool.handler(parseResult.data, auth);

        // Record cost consumption (~$0.01 per tool invocation)
        costBudgetManager.recordConsumption(auth.userId, 0.01, 150);

        // Check if two-step proposal was generated
        const isProposal = result && result.status === 'CONFIRMATION_REQUIRED';

        // Cache if idempotency key present
        if (rawArgs.idempotency_key) {
          idempotencyStore.set(auth.userId, rawArgs.idempotency_key, toolName, result);
        }

        auditLogger.log({
          userId: auth.userId,
          role: auth.role,
          toolName,
          status: isProposal ? 'CONFIRMATION_REQUIRED' : 'SUCCESS',
          latencyMs: Date.now() - startTime,
          confirmationTokenHash: result?.confirmation_token ? 'token_generated' : undefined,
          idempotencyKey: rawArgs.idempotency_key,
          sanitizedArgs: cleanArgs,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (execErr: any) {
        auditLogger.log({
          userId: auth.userId,
          role: auth.role,
          toolName,
          status: 'FAILED',
          latencyMs: Date.now() - startTime,
          sanitizedArgs: cleanArgs,
          errorMessage: execErr.message,
        });

        if (execErr instanceof ConfirmationTokenError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Confirmation Error (${execErr.code}): ${execErr.message}`,
          );
        }

        throw new McpError(ErrorCode.InternalError, `Execution error: ${execErr.message}`);
      }
    });
  }
}
