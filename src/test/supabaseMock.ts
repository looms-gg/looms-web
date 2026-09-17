import { vi, type MockInstance } from "vitest"
import { supabase } from "../lib/supabase"

export type QueryOperation = "select" | "insert" | "update" | "delete" | "upsert"

export interface QueryFilter {
  method: string
  args: unknown[]
}

export interface RecordedQuery {
  table: string
  operation: QueryOperation
  payload?: unknown
  filters: QueryFilter[]
  ordering?: { column: string; options?: unknown }
  limitCount?: number
  isSingle?: boolean
  isMaybeSingle?: boolean
}

export interface MockQueryResult<T = unknown> {
  data: T | null
  error: { message: string; code?: string } | null
  count?: number | null
}

export type QueryHandler<T = unknown> =
  | MockQueryResult<T>
  | Promise<MockQueryResult<T>>
  | ((query: RecordedQuery) => MockQueryResult<T> | Promise<MockQueryResult<T>>)

function isMutation(operation: QueryOperation): boolean {
  return operation !== "select"
}

export class QueryBuilderStub<T = unknown> implements PromiseLike<MockQueryResult<T>> {
  readonly query: RecordedQuery
  private readonly handler: QueryHandler<T>

  constructor(table: string, handler: QueryHandler<T>) {
    this.query = {
      table,
      operation: "select",
      filters: [],
    }
    this.handler = handler
  }

  select(columns?: string, options?: Record<string, unknown>): this {
    // A select chained onto a mutation (insert(...).select().single()) is a
    // PostgREST returning-rows suffix, not a new query: keep the mutation as
    // the recorded operation so payload/filters stay attributable.
    if (!isMutation(this.query.operation)) {
      this.query.operation = "select"
      this.query.payload = { columns, options }
    }
    return this
  }

  insert(values: unknown, options?: Record<string, unknown>): this {
    this.query.operation = "insert"
    this.query.payload = { values, options }
    return this
  }

  update(values: unknown, options?: Record<string, unknown>): this {
    this.query.operation = "update"
    this.query.payload = { values, options }
    return this
  }

  delete(options?: Record<string, unknown>): this {
    this.query.operation = "delete"
    this.query.payload = { options }
    return this
  }

  upsert(values: unknown, options?: Record<string, unknown>): this {
    this.query.operation = "upsert"
    this.query.payload = { values, options }
    return this
  }

  eq(column: string, value: unknown): this {
    this.query.filters.push({ method: "eq", args: [column, value] })
    return this
  }

  neq(column: string, value: unknown): this {
    this.query.filters.push({ method: "neq", args: [column, value] })
    return this
  }

  gt(column: string, value: unknown): this {
    this.query.filters.push({ method: "gt", args: [column, value] })
    return this
  }

  gte(column: string, value: unknown): this {
    this.query.filters.push({ method: "gte", args: [column, value] })
    return this
  }

  lt(column: string, value: unknown): this {
    this.query.filters.push({ method: "lt", args: [column, value] })
    return this
  }

  lte(column: string, value: unknown): this {
    this.query.filters.push({ method: "lte", args: [column, value] })
    return this
  }

  like(column: string, pattern: string): this {
    this.query.filters.push({ method: "like", args: [column, pattern] })
    return this
  }

  ilike(column: string, pattern: string): this {
    this.query.filters.push({ method: "ilike", args: [column, pattern] })
    return this
  }

  is(column: string, value: unknown): this {
    this.query.filters.push({ method: "is", args: [column, value] })
    return this
  }

  in(column: string, values: unknown[]): this {
    this.query.filters.push({ method: "in", args: [column, values] })
    return this
  }

  contains(column: string, value: unknown): this {
    this.query.filters.push({ method: "contains", args: [column, value] })
    return this
  }

  containedBy(column: string, value: unknown): this {
    this.query.filters.push({ method: "containedBy", args: [column, value] })
    return this
  }

  order(column: string, options?: unknown): this {
    this.query.ordering = { column, options }
    return this
  }

  limit(count: number): this {
    this.query.limitCount = count
    return this
  }

  range(_from: number, _to: number): this {
    return this
  }

  abortSignal(_signal: AbortSignal): this {
    return this
  }

  single(): this {
    this.query.isSingle = true
    return this
  }

  maybeSingle(): this {
    this.query.isMaybeSingle = true
    return this
  }

  private async execute(): Promise<MockQueryResult<T>> {
    if (typeof this.handler === "function") {
      return this.handler(this.query)
    }
    return this.handler
  }

  then<TResult1 = MockQueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<MockQueryResult<T> | TResult> {
    return this.execute().catch(onrejected)
  }

  finally(onfinally?: (() => void) | null): Promise<MockQueryResult<T>> {
    return this.execute().finally(onfinally)
  }
}

export interface SupabaseMockController {
  fromSpy: MockInstance
  queries: RecordedQuery[]
  getQueries(table: string, operation?: QueryOperation): RecordedQuery[]
  on(table: string, handler: QueryHandler): void
  on(table: string, operation: QueryOperation, handler: QueryHandler): void
  setDefaultHandler(handler: QueryHandler): void
  reset(): void
}

export interface RecordedRpc {
  fn: string
  args?: unknown
}

export type RpcHandler =
  | MockQueryResult
  | ((call: RecordedRpc) => MockQueryResult | Promise<MockQueryResult>)

export interface RpcMockController {
  rpcSpy: MockInstance
  calls: RecordedRpc[]
  getCalls(fn?: string): RecordedRpc[]
  on(fn: string, handler: RpcHandler): void
  setDefaultHandler(handler: RpcHandler): void
  reset(): void
}

/**
 * Creates and installs a shared Supabase rpc mock that records each call
 * (function name plus args) and dispatches to per-function or default handlers.
 */
export function mockSupabaseRpc(): RpcMockController {
  const calls: RecordedRpc[] = []
  const fnHandlers = new Map<string, RpcHandler>()
  let defaultHandler: RpcHandler = { data: null, error: null }

  const rpcSpy = vi.spyOn(supabase, "rpc").mockImplementation(((fn: string, args?: unknown) => {
    const call: RecordedRpc = { fn, args }
    calls.push(call)
    const handler = fnHandlers.get(fn) ?? defaultHandler
    return typeof handler === "function" ? handler(call) : handler
  }) as never)

  return {
    rpcSpy,
    calls,
    getCalls(fn?: string): RecordedRpc[] {
      return calls.filter((c) => !fn || c.fn === fn)
    },
    on(fn: string, handler: RpcHandler) {
      fnHandlers.set(fn, handler)
    },
    setDefaultHandler(handler: RpcHandler) {
      defaultHandler = handler
    },
    reset() {
      calls.length = 0
      fnHandlers.clear()
      defaultHandler = { data: null, error: null }
    },
  }
}

/**
 * Creates and installs a shared Supabase query builder mock that records operations
 * and decouples tests from method chaining topology.
 */
export function mockSupabaseFrom(): SupabaseMockController {
  const queries: RecordedQuery[] = []
  const tableHandlers = new Map<string, QueryHandler>()
  const tableOpHandlers = new Map<string, QueryHandler>()
  let defaultHandler: QueryHandler = { data: [], error: null, count: 0 }

  const fromSpy = vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    const handler: QueryHandler = (query: RecordedQuery) => {
      const opKey = `${query.table}:${query.operation}`
      if (tableOpHandlers.has(opKey)) {
        const h = tableOpHandlers.get(opKey)!
        return typeof h === "function" ? h(query) : h
      }
      if (tableHandlers.has(query.table)) {
        const h = tableHandlers.get(table)!
        return typeof h === "function" ? h(query) : h
      }
      return typeof defaultHandler === "function" ? defaultHandler(query) : defaultHandler
    }

    const stub = new QueryBuilderStub(table, handler)
    // Record at chain-build time (like the real client dispatches), so
    // fire-and-forget writes are observable without awaiting them.
    queries.push(stub.query)
    return stub as never
  })

  return {
    fromSpy,
    queries,
    getQueries(table: string, operation?: QueryOperation): RecordedQuery[] {
      return queries.filter((q) => q.table === table && (!operation || q.operation === operation))
    },
    on(table: string, ...args: [QueryHandler] | [QueryOperation, QueryHandler]) {
      if (args.length === 1) {
        tableHandlers.set(table, args[0])
      } else {
        const [op, handler] = args
        tableOpHandlers.set(`${table}:${op}`, handler)
      }
    },
    setDefaultHandler(handler: QueryHandler) {
      defaultHandler = handler
    },
    reset() {
      queries.length = 0
      tableHandlers.clear()
      tableOpHandlers.clear()
      defaultHandler = { data: [], error: null, count: 0 }
    },
  }
}

