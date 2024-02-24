import type {
  MiddlewareFunction,
  ProcedureBuilder,
  ProcedureParams,
  RootConfig,
} from "@trpc/server";
import { z, type ZodObject, type ZodSchema } from "zod";
import { PRPCPusher } from "./PRPCPusher";
import { PRPCRouteBuilder } from "./PRPCRouteBuilder";
import {
  InferTRPCProcedureParams,
  OverwriteTRPCProcedureParamsInput,
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
  private procedure: ReturnType<
    typeof PresenceProcedure<TProcedure, TUser, TTransformer>
  >;
  private input: ZodSchema | null = null;
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

  use<TMiddleware extends MiddlewareFunction<any, any>>(
    middleware: TMiddleware
  ) {
    this.middleware = middleware;
    return this;
  }

  data<TInput extends ZodSchema>(
    input: TInput
  ): PRPCPresenceRouteTRPC<
    OverwriteTRPCProcedureParamsInput<
      InferTRPCProcedureParams<
        ReturnType<typeof PresenceProcedure<TProcedure, TUser, TTransformer>>
      >,
      TInput
    >,
    TUser,
    TTransformer
  > {
    this.input = input;
    return this;
  }

  trigger(): ReturnType<
    typeof PresenceProcedure<TProcedure, TUser, TTransformer>
  >["mutation"] {
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
      // @ts-ignore
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
      // @ts-ignore
      return p.mutation;
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
