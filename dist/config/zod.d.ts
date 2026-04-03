import { z } from "zod";
export declare const policySchema: z.ZodObject<{
    maxInputChars: z.ZodNumber;
    normalizeUnicode: z.ZodBoolean;
    promptInjection: z.ZodObject<{
        enabled: z.ZodBoolean;
        patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        patterns?: string[] | undefined;
    }, {
        enabled: boolean;
        patterns?: string[] | undefined;
    }>;
    redaction: z.ZodObject<{
        enabled: z.ZodBoolean;
        patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        patterns?: string[] | undefined;
    }, {
        enabled: boolean;
        patterns?: string[] | undefined;
    }>;
    tools: z.ZodObject<{
        allowlist: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        schemas: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        schemas?: Record<string, unknown> | undefined;
        allowlist?: string[] | undefined;
    }, {
        schemas?: Record<string, unknown> | undefined;
        allowlist?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    tools: {
        schemas?: Record<string, unknown> | undefined;
        allowlist?: string[] | undefined;
    };
    maxInputChars: number;
    normalizeUnicode: boolean;
    promptInjection: {
        enabled: boolean;
        patterns?: string[] | undefined;
    };
    redaction: {
        enabled: boolean;
        patterns?: string[] | undefined;
    };
}, {
    tools: {
        schemas?: Record<string, unknown> | undefined;
        allowlist?: string[] | undefined;
    };
    maxInputChars: number;
    normalizeUnicode: boolean;
    promptInjection: {
        enabled: boolean;
        patterns?: string[] | undefined;
    };
    redaction: {
        enabled: boolean;
        patterns?: string[] | undefined;
    };
}>;
export declare const workloadSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    match: z.ZodDefault<z.ZodObject<{
        header: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            value: string;
        }, {
            name: string;
            value: string;
        }>>;
        pathPrefix: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        model?: string | undefined;
        header?: {
            name: string;
            value: string;
        } | undefined;
        pathPrefix?: string | undefined;
    }, {
        model?: string | undefined;
        header?: {
            name: string;
            value: string;
        } | undefined;
        pathPrefix?: string | undefined;
    }>>;
    policy: z.ZodObject<{
        maxInputChars: z.ZodOptional<z.ZodNumber>;
        normalizeUnicode: z.ZodOptional<z.ZodBoolean>;
        promptInjection: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            patterns?: string[] | undefined;
        }, {
            enabled: boolean;
            patterns?: string[] | undefined;
        }>>;
        redaction: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            patterns?: string[] | undefined;
        }, {
            enabled: boolean;
            patterns?: string[] | undefined;
        }>>;
        tools: z.ZodOptional<z.ZodObject<{
            allowlist: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            schemas: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        }, {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        tools?: {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        } | undefined;
        maxInputChars?: number | undefined;
        normalizeUnicode?: boolean | undefined;
        promptInjection?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
        redaction?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
    }, {
        tools?: {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        } | undefined;
        maxInputChars?: number | undefined;
        normalizeUnicode?: boolean | undefined;
        promptInjection?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
        redaction?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    match: {
        model?: string | undefined;
        header?: {
            name: string;
            value: string;
        } | undefined;
        pathPrefix?: string | undefined;
    };
    name: string;
    policy: {
        tools?: {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        } | undefined;
        maxInputChars?: number | undefined;
        normalizeUnicode?: boolean | undefined;
        promptInjection?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
        redaction?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
    };
}, {
    name: string;
    policy: {
        tools?: {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        } | undefined;
        maxInputChars?: number | undefined;
        normalizeUnicode?: boolean | undefined;
        promptInjection?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
        redaction?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
    };
    match?: {
        model?: string | undefined;
        header?: {
            name: string;
            value: string;
        } | undefined;
        pathPrefix?: string | undefined;
    } | undefined;
}>, {
    match: {
        model?: string | undefined;
        header?: {
            name: string;
            value: string;
        } | undefined;
        pathPrefix?: string | undefined;
    };
    name: string;
    policy: {
        tools?: {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        } | undefined;
        maxInputChars?: number | undefined;
        normalizeUnicode?: boolean | undefined;
        promptInjection?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
        redaction?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
    };
}, {
    name: string;
    policy: {
        tools?: {
            schemas?: Record<string, unknown> | undefined;
            allowlist?: string[] | undefined;
        } | undefined;
        maxInputChars?: number | undefined;
        normalizeUnicode?: boolean | undefined;
        promptInjection?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
        redaction?: {
            enabled: boolean;
            patterns?: string[] | undefined;
        } | undefined;
    };
    match?: {
        model?: string | undefined;
        header?: {
            name: string;
            value: string;
        } | undefined;
        pathPrefix?: string | undefined;
    } | undefined;
}>;
export declare const appConfigSchema: z.ZodObject<{
    server: z.ZodObject<{
        host: z.ZodString;
        port: z.ZodNumber;
        bodyLimit: z.ZodNumber;
        requestTimeoutMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        bodyLimit: number;
        host: string;
        port: number;
        requestTimeoutMs: number;
    }, {
        bodyLimit: number;
        host: string;
        port: number;
        requestTimeoutMs: number;
    }>;
    logging: z.ZodObject<{
        level: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        level: string;
    }, {
        level: string;
    }>;
    policies: z.ZodObject<{
        default: z.ZodObject<{
            maxInputChars: z.ZodNumber;
            normalizeUnicode: z.ZodBoolean;
            promptInjection: z.ZodObject<{
                enabled: z.ZodBoolean;
                patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                patterns?: string[] | undefined;
            }, {
                enabled: boolean;
                patterns?: string[] | undefined;
            }>;
            redaction: z.ZodObject<{
                enabled: z.ZodBoolean;
                patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                patterns?: string[] | undefined;
            }, {
                enabled: boolean;
                patterns?: string[] | undefined;
            }>;
            tools: z.ZodObject<{
                allowlist: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                schemas: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strip", z.ZodTypeAny, {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            }, {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            tools: {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            };
            maxInputChars: number;
            normalizeUnicode: boolean;
            promptInjection: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
            redaction: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
        }, {
            tools: {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            };
            maxInputChars: number;
            normalizeUnicode: boolean;
            promptInjection: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
            redaction: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
        }>;
        workloads: z.ZodArray<z.ZodEffects<z.ZodObject<{
            name: z.ZodString;
            match: z.ZodDefault<z.ZodObject<{
                header: z.ZodOptional<z.ZodObject<{
                    name: z.ZodString;
                    value: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                    value: string;
                }, {
                    name: string;
                    value: string;
                }>>;
                pathPrefix: z.ZodOptional<z.ZodString>;
                model: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            }, {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            }>>;
            policy: z.ZodObject<{
                maxInputChars: z.ZodOptional<z.ZodNumber>;
                normalizeUnicode: z.ZodOptional<z.ZodBoolean>;
                promptInjection: z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodBoolean;
                    patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                }, {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                }>>;
                redaction: z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodBoolean;
                    patterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                }, {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                }>>;
                tools: z.ZodOptional<z.ZodObject<{
                    allowlist: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    schemas: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, "strip", z.ZodTypeAny, {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                }, {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            }, {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            match: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            };
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
        }, {
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
            match?: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            } | undefined;
        }>, {
            match: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            };
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
        }, {
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
            match?: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            } | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        workloads: {
            match: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            };
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
        }[];
        default: {
            tools: {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            };
            maxInputChars: number;
            normalizeUnicode: boolean;
            promptInjection: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
            redaction: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
        };
    }, {
        workloads: {
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
            match?: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            } | undefined;
        }[];
        default: {
            tools: {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            };
            maxInputChars: number;
            normalizeUnicode: boolean;
            promptInjection: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
            redaction: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
        };
    }>;
    adapters: z.ZodObject<{
        openai: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            baseUrl: z.ZodString;
            apiKey: z.ZodOptional<z.ZodString>;
            organization: z.ZodOptional<z.ZodString>;
            project: z.ZodOptional<z.ZodString>;
            timeoutMs: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            apiKey?: string | undefined;
            organization?: string | undefined;
            project?: string | undefined;
        }, {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            apiKey?: string | undefined;
            organization?: string | undefined;
            project?: string | undefined;
        }>>;
        mcp: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            baseUrl: z.ZodString;
            headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            timeoutMs: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            headers?: Record<string, string> | undefined;
        }, {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            headers?: Record<string, string> | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        mcp?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            headers?: Record<string, string> | undefined;
        } | undefined;
        openai?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            apiKey?: string | undefined;
            organization?: string | undefined;
            project?: string | undefined;
        } | undefined;
    }, {
        mcp?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            headers?: Record<string, string> | undefined;
        } | undefined;
        openai?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            apiKey?: string | undefined;
            organization?: string | undefined;
            project?: string | undefined;
        } | undefined;
    }>;
    snapshots: z.ZodObject<{
        dir: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        dir: string;
    }, {
        dir: string;
    }>;
}, "strip", z.ZodTypeAny, {
    logging: {
        level: string;
    };
    server: {
        bodyLimit: number;
        host: string;
        port: number;
        requestTimeoutMs: number;
    };
    policies: {
        workloads: {
            match: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            };
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
        }[];
        default: {
            tools: {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            };
            maxInputChars: number;
            normalizeUnicode: boolean;
            promptInjection: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
            redaction: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
        };
    };
    adapters: {
        mcp?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            headers?: Record<string, string> | undefined;
        } | undefined;
        openai?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            apiKey?: string | undefined;
            organization?: string | undefined;
            project?: string | undefined;
        } | undefined;
    };
    snapshots: {
        dir: string;
    };
}, {
    logging: {
        level: string;
    };
    server: {
        bodyLimit: number;
        host: string;
        port: number;
        requestTimeoutMs: number;
    };
    policies: {
        workloads: {
            name: string;
            policy: {
                tools?: {
                    schemas?: Record<string, unknown> | undefined;
                    allowlist?: string[] | undefined;
                } | undefined;
                maxInputChars?: number | undefined;
                normalizeUnicode?: boolean | undefined;
                promptInjection?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
                redaction?: {
                    enabled: boolean;
                    patterns?: string[] | undefined;
                } | undefined;
            };
            match?: {
                model?: string | undefined;
                header?: {
                    name: string;
                    value: string;
                } | undefined;
                pathPrefix?: string | undefined;
            } | undefined;
        }[];
        default: {
            tools: {
                schemas?: Record<string, unknown> | undefined;
                allowlist?: string[] | undefined;
            };
            maxInputChars: number;
            normalizeUnicode: boolean;
            promptInjection: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
            redaction: {
                enabled: boolean;
                patterns?: string[] | undefined;
            };
        };
    };
    adapters: {
        mcp?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            headers?: Record<string, string> | undefined;
        } | undefined;
        openai?: {
            enabled: boolean;
            baseUrl: string;
            timeoutMs: number;
            apiKey?: string | undefined;
            organization?: string | undefined;
            project?: string | undefined;
        } | undefined;
    };
    snapshots: {
        dir: string;
    };
}>;
export type AppConfigInput = z.infer<typeof appConfigSchema>;
