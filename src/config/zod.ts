import { z } from "zod";

const toolPolicySchema = z.object({
  allowlist: z.array(z.string()).optional(),
  schemas: z.record(z.unknown()).optional()
});

const promptInjectionSchema = z.object({
  enabled: z.boolean(),
  patterns: z.array(z.string()).optional()
});

const redactionSchema = z.object({
  enabled: z.boolean(),
  patterns: z.array(z.string()).optional()
});

export const policySchema = z.object({
  maxInputChars: z.number().int().min(1),
  normalizeUnicode: z.boolean(),
  promptInjection: promptInjectionSchema,
  redaction: redactionSchema,
  tools: toolPolicySchema
});

const workloadMatchSchema = z
  .object({
    header: z
      .object({
        name: z.string(),
        value: z.string()
      })
      .optional(),
    pathPrefix: z.string().optional(),
    model: z.string().optional()
  })
  .default({});

export const workloadSchema = z
  .object({
    name: z.string().min(1),
    match: workloadMatchSchema,
    policy: policySchema.partial()
  })
  .superRefine((value, ctx) => {
    const match = value.match ?? {};
    if (!match.header && !match.pathPrefix && !match.model) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["match"],
        message: "workload.match must specify header, pathPrefix, or model"
      });
    }
  });

export const appConfigSchema = z.object({
  server: z.object({
    host: z.string(),
    port: z.number().int().min(1),
    bodyLimit: z.number().int().min(1024),
    requestTimeoutMs: z.number().int().min(100)
  }),
  logging: z.object({
    level: z.string()
  }),
  policies: z.object({
    default: policySchema,
    workloads: z.array(workloadSchema)
  }),
  adapters: z.object({
    openai: z
      .object({
        enabled: z.boolean(),
        baseUrl: z.string(),
        apiKey: z.string().optional(),
        organization: z.string().optional(),
        project: z.string().optional(),
        timeoutMs: z.number().int().min(100)
      })
      .optional(),
    mcp: z
      .object({
        enabled: z.boolean(),
        baseUrl: z.string(),
        headers: z.record(z.string()).optional(),
        timeoutMs: z.number().int().min(100)
      })
      .optional()
  }),
  snapshots: z.object({
    dir: z.string()
  })
});

export type AppConfigInput = z.infer<typeof appConfigSchema>;
