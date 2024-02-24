import type {
  AnyRootConfig,
  BuildProcedure,
  MaybePromise,
  MiddlewareFunction,
  ProcedureBuilder,
  ProcedureParams,
  RootConfig,
  Simplify,
} from "@trpc/server";
import { Parser, inferParser } from "@trpc/server/dist/core/parser";
import { ZodTypeAny, z, type ZodObject, type ZodSchema } from "zod";
import { PRPCPusher } from "./PRPCPusher";
import { PRPCRouteBuilder } from "./PRPCRouteBuilder";
import {
  CreateProcedureReturnInput,
  InferTRPCProcedureParams,
  OverwriteIfDefined,
  PRPCContext,
} from "./types";

export class PRPCPublicRouteTRPC<
  TProcedure extends ProcedureBuilder<any>,
  TTransformer extends any
> {
  public _defs: {
    procedure: ReturnType<typeof PublicProcedure<TProcedure, TTransformer>>;
    builder: PRPCRouteBuilder<any, any, any>;
  };
  private procedure: TProcedure;
  private builder: PRPCRouteBuilder<any, any, any>;
  private pusher: PRPCPusher<false>;
  private input: ZodObject<any> | null = null;
  private middleware: MiddlewareFunction<any, any> | null = null;

  constructor(
    builder: PRPCRouteBuilder<any, any, any>,
    procedure: TProcedure,
    pusher: PRPCPusher<false>
  ) {
    // @ts-ignore
    this._defs = {
      builder: builder,
    };
    this.builder = builder;
    this.procedure = procedure;
    this.pusher = pusher;
  }

  use<TMiddleware extends MiddlewareFunction<any, any>>(
    middleware: TMiddleware
  ) {
    this.middleware = middleware;
    return this;
  }

  data<TInput extends ZodObject<any>>(input: TInput) {
    // @ts-ignore
    this.input = input;
    // @ts-ignore
    const update = this.procedure.input(input);

    return {
      trigger: this.trigger as any as typeof update.mutation,
    };
  }

  get trigger() {
    if (this.input) {
      // @ts-ignore
      let p = this.procedure.input(this.input).use(({ ctx, next, input }) => {
        return next({
          ctx: {
            ...(ctx as object),
            pusher: this.pusher.setInput((input as any).prpc as any),
          },
        });
      });
      this.input = null;
      if (this.middleware) {
        p = p.use(this.middleware);
        this.middleware = null;
      }
      return p.mutation;
    } else {
      let p = this.procedure.use(({ ctx, next, input }) => {
        return next({
          ctx: {
            ...(ctx as object),
            pusher: this.pusher.setInput((input as any).prpc as any),
          },
        });
      });
      if (this.middleware) {
        p = p.use(this.middleware);
        this.middleware = null;
      }
      return p.mutation;
    }
  }
}

export class PRPCPresenceRouteTRPC<
  TProcedure extends ProcedureBuilder<any>,
  TUser extends ZodObject<any>,
  TTransformer extends any
> {
  public _defs: {
    procedure: TProcedure;
    builder: PRPCRouteBuilder<any, any, ZodObject<any>>;
  };
  private pusher: PRPCPusher<true, TUser>;
  private procedure: TProcedure;
  private input: Parser | null = null;
  private middleware: MiddlewareFunction<any, any> | null = null;
  constructor(
    builder: PRPCRouteBuilder<any, any, ZodObject<any>>,
    procedure: TProcedure,
    pusher: PRPCPusher<true, TUser>
  ) {
    // @ts-ignore
    this._defs = {
      builder: builder,
    };
    this.procedure = procedure;
    this.pusher = pusher;
  }

  use<
    $Params extends ProcedureParams,
    TParams extends ProcedureParams<
      AnyRootConfig,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown
    > = InferTRPCProcedureParams<TProcedure>
  >(
    middleware: MiddlewareFunction<TParams, $Params>
  ): Omit<
    PRPCPresenceRouteTRPC<
      CreateProcedureReturnInput<$Params, $Params>,
      TUser,
      TTransformer
    >,
    "_defs"
  > {
    this.middleware = middleware;
    // @ts-ignore
    return this;
  }

  data<
    $Parser extends Parser,
    TParams extends ProcedureParams<
      AnyRootConfig,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown
    > = InferTRPCProcedureParams<TProcedure>
  >(
    schema: $Parser
  ): Omit<
    PRPCPresenceRouteTRPC<
      ProcedureBuilder<{
        _config: TParams["_config"];
        _meta: TParams["_meta"];
        _ctx_out: TParams["_ctx_out"];
        _input_in: OverwriteIfDefined<
          TParams["_input_in"],
          inferParser<$Parser>["in"]
        >;
        _input_out: OverwriteIfDefined<
          TParams["_input_out"],
          inferParser<$Parser>["out"]
        >;

        _output_in: TParams["_output_in"];
        _output_out: TParams["_output_out"];
      }>,
      TUser,
      TTransformer
    >,
    "_defs"
  > {
    this.input = schema;
    // @ts-ignore
    return this;
  }

  exec<
    $Output,
    TParams extends ProcedureParams<
      AnyRootConfig,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown
    > = InferTRPCProcedureParams<TProcedure>
  >(
    resolver: (
      opts: Simplify<{
        // ctx: TParams["_ctx_out"] & {
        //   pusher: PRPCPusher<true, TUser>;
        // };
        input: TParams["_input_in"] & ReturnType<typeof PRPCInput<TUser>>;
      }>
    ) => MaybePromise<$Output>
  ) {}

  trigger<$Output>(
    resolver: (
      opts: Simplify<{
        ctx: Simplify<
          InferTRPCProcedureParams<TProcedure>["_ctx_out"] & {
            pusher: PRPCPusher<true, TUser>;
          }
        >;
        input: Simplify<
          InferTRPCProcedureParams<TProcedure>["_input_in"] &
            ReturnType<typeof PRPCInput<TUser>>
        >;
      }>
    ) => MaybePromise<$Output>
  ): BuildProcedure<"mutation", InferTRPCProcedureParams<TProcedure>, $Output> {
    if (this.input as any) {
      let p = (this.procedure as any)
        .input(this.input)
        .use(({ ctx, next, input }: any) => {
          return next({
            ctx: {
              ...(ctx as object),
              pusher: this.pusher.setInput((input as any).prpc as any),
            },
          });
        });
      this.input = null;
      if (this.middleware as any) {
        p = p.use(this.middleware);
        this.middleware = null;
      }
      return p.mutation as any;
    } else {
      let p = (this.procedure as any).use(({ ctx, next, input }: any) => {
        return next({
          ctx: {
            ...(ctx as object),
            pusher: this.pusher.setInput((input as any).prpc as any),
          },
        });
      });
      if (this.middleware) {
        p = p.use(this.middleware as any);
        this.middleware = null;
      }
      return p.mutation as any;
    }
  }
}

export function PublicProcedure<
  TProcedure extends ProcedureBuilder<any>,
  TTransformer
>(
  procedure: ProcedureBuilder<
    ProcedureParams<
      RootConfig<{
        ctx: any;
        meta: any;
        errorShape: any;
        transformer: TTransformer;
      }>,
      PRPCContext<TProcedure, false, any>,
      any,
      any
    >
  >
) {
  return procedure.input(
    z.object({
      prpc: z.object({
        channel_type: z.string().optional(),
        channel_id: z.string().optional(),
        channel_name: z.string().optional(),
        channel_event: z.string(),
        socket_id: z.string().optional(),
      }),
    })
  );
}

export function PresenceProcedure<
  TProcedure extends ProcedureBuilder<any>,
  TUser extends ZodObject<any> | ZodSchema,
  TTransformer
>(
  procedure: ProcedureBuilder<
    ProcedureParams<
      RootConfig<{
        ctx: any;
        meta: any;
        errorShape: any;
        transformer: TTransformer;
      }>,
      PRPCContext<TProcedure, true, TUser>,
      any,
      any
    >
  >,
  user: TUser
) {
  return procedure.input(
    z.object({
      prpc: z.object({
        channel_type: z.string().optional(),
        channel_id: z.string().optional(),
        channel_name: z.string().optional(),
        channel_event: z.string(),
        socket_id: z.string().optional(),
        members: z.object({}).catchall(user),
        me: z.object({
          id: z.string(),
          info: user,
        }),
      }),
    })
  );
}

const PRPCInput = <T extends ZodTypeAny>(user: T) =>
  z.object({
    prpc: z.object({
      channel_type: z.string().optional(),
      channel_id: z.string().optional(),
      channel_name: z.string().optional(),
      channel_event: z.string(),
      socket_id: z.string().optional(),
      members: z.object({}).catchall(user),
      me: z.object({
        id: z.string(),
        info: user,
      }),
    }),
  });
