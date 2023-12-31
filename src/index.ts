import { Prisma } from '@prisma/client'
import { Args, DefaultArgs, DynamicClientExtensionThis, DynamicQueryExtensionCb } from '@prisma/client/runtime'

type range = { hours: number } | { seconds: number }

export const supportedMethod = ['findMany', 'groupBy', 'count', 'aggregate', 'findUnique', 'findFirst'] as const
export type supportedMethod = typeof supportedMethod[number]

const isRange = (args: {}): args is range => ("hours" in args) || "seconds" in args
const isFilter = (args: {}): args is Prisma.JsonFilter => "path" in args
const isMethod = (method: unknown): method is supportedMethod => supportedMethod.includes(method as supportedMethod)
const delayHours = (purgeDate: Date, hours: number): Date => (purgeDate.setTime(purgeDate.getTime() - (hours * 60 * 60 * 1000)), purgeDate)
const delaySeconds = (purgeDate: Date, seconds: number): Date => (purgeDate.setTime(purgeDate.getTime() - (seconds * 1000)), purgeDate)

type CacheProps = {
  args: {} 
  result: Prisma.JsonArray | Prisma.JsonObject | number | null | {} // for {} Need to find how to infer Prisma AggregateOutputType
  operation: supportedMethod
  model: Prisma.ModelName
}

type client = DynamicClientExtensionThis<Prisma.TypeMap<Args & DefaultArgs>, Prisma.TypeMapCb, DefaultArgs>

const createCache = async (client: client, { model, args, operation, result }: CacheProps) => (await client.cache.upsert({
  where: { model_operation_key: { model, operation, key: args as unknown as Prisma.JsonObject } },
  create: { model, operation, key: args as unknown as Prisma.JsonObject, value: (result as Prisma.JsonObject) || undefined },
  update: { value: (result as Prisma.JsonObject) || undefined, updated: new Date() }
}), result)

const getCache = async (client: client, { model, args, operation }: Omit<CacheProps, "result">) => client.cache.findUnique({ where: { model_operation_key: { model, operation, key: args as unknown as Prisma.JsonObject } } })

export const caching = () =>
  Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'prisma-extension-caching',
      model: {
        $allModels: {
          async purge<T, A>(this: T, args?: Prisma.Args<T, supportedMethod> | Prisma.JsonFilter | range | supportedMethod, operation?: supportedMethod) {
            const ctx = Prisma.getExtensionContext(this)
            const model = ctx.name

            if (!args)
              return client.cache.deleteMany({ where: { model, operation } })
            else if (isMethod(args))
              return client.cache.deleteMany({ where: { model, operation: args } })
            else if (isFilter(args))
              return client.cache.deleteMany({ where: { model, key: args, operation } })
            else if (isRange(args))
              return client.cache.deleteMany({
                where: {
                  operation,
                  created: {
                    lt: ("hours" in args) ?
                      delayHours(new Date(), args.hours)
                      :
                      delaySeconds(new Date(), args.seconds)
                  }
                }
              })
            else if (model && args)
              return client.cache.deleteMany({ where: { model, operation, key: { equals: args } } })
          },
        },
      },
      query: {
        $allModels:
          Object.fromEntries(
            supportedMethod.map((method) =>
              [
                method,
                (async ({ model, operation, args, query }: CacheProps & { query: (args: {}) => CacheProps['result'] }) => {
                  const cache = await getCache(client, { model, operation, args })
                  if (cache) return cache.value

                  const result = await query(args)
                  return result && createCache(client, { model, args, operation, result })
                }) as DynamicQueryExtensionCb<Prisma.TypeMap<Args & DefaultArgs>, "model", "cache", supportedMethod>
              ])
          )
      },
    })
  })