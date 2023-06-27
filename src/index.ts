import { Prisma } from '@prisma/client'

type range = { hours: number } | { seconds: number }

export const supportedMethod = ['findMany', 'groupBy', 'count', 'aggregate', 'findUnique', 'findFirst'] as const
export type supportedMethod = typeof supportedMethod[number]

const isRange = (args: {}): args is range => ("hours" in args) || "seconds" in args 
const isFilter = (args: {}): args is Prisma.JsonFilter => "path" in args
const isMethod = (method: unknown): method is supportedMethod => supportedMethod.includes(method as supportedMethod)
const delayHours = (purgeDate: Date, hours: number): Date => (purgeDate.setTime(purgeDate.getTime() - (hours * 60 * 60 * 1000)), purgeDate)
const delaySeconds = (purgeDate: Date, seconds: number): Date => (purgeDate.setTime(purgeDate.getTime() - (seconds * 1000)), purgeDate)

export const caching = () =>
  Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'prisma-extension-caching',
      model: {
        $allModels: {
          async purge<T, A>(this: T, args?: Prisma.Args<T, 'findMany'> | Prisma.JsonFilter | range | supportedMethod, operation?: supportedMethod) {
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
        $allModels: {
          /**
           *  I have copy paste some methods to save type inference.
           */
          async findMany({ model, operation, args, query }) {
            const cache = await client.cache.findUnique({ where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } } })
            if (cache)
              return cache.value

            const result = await query(args)
            await client.cache.upsert({
              where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } },
              create: { model, operation, key: args as Prisma.JsonObject, value: result as Prisma.JsonArray },
              update: { value: result as Prisma.JsonArray }
            })
            return result
          },
          async findUnique({ model, operation, args, query }) {
            const cache = await client.cache.findUnique({ where: { model_operation_key: { model, operation, key: args as unknown as Prisma.JsonObject } } })
            if (cache)
              return cache.value

            const result = await query(args)
            result && await client.cache.upsert({
              where: { model_operation_key: { model, operation, key: args as unknown as Prisma.JsonObject } },
              create: { model, operation, key: args as unknown as Prisma.JsonObject, value: result as Prisma.JsonObject },
              update: { value: result || {} as Prisma.JsonObject }
            })
            return result
          },
          async findFirst({ model, operation, args, query }) {
            const cache = await client.cache.findUnique({ where: { model_operation_key: { model, operation, key: args as unknown as Prisma.JsonObject } } })
            if (cache)
              return cache.value

            const result = await query(args)
            result && await client.cache.upsert({
              where: { model_operation_key: { model, operation, key: args as unknown as Prisma.JsonObject } },
              create: { model, operation, key: args as unknown as Prisma.JsonObject, value: result as Prisma.JsonObject },
              update: { value: result || {} as Prisma.JsonObject }
            })
            return result
          }, 
          async groupBy({ model, operation, args, query }) {
            const cache = await client.cache.findUnique({ where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } } })
            if (cache)
              return cache.value

            const result = await query(args)
            await client.cache.upsert({
              where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } },
              create: { model, operation, key: args as Prisma.JsonObject, value: result as Prisma.JsonArray },
              update: { value: result as Prisma.JsonArray }
            })
            return result
          },
          async count({ model, operation, args, query }) {
            const cache = await client.cache.findUnique({ where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } } })
            if (cache)
              return (cache.value as { count: number })?.count

            const result = await query(args)
            await client.cache.upsert({
              where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } },
              create: { model, operation, key: args as Prisma.JsonObject, value: { count: result } as Prisma.JsonObject },
              update: { value: { count: result } as Prisma.JsonObject }
            })
            return result
          },
          async aggregate({ model, operation, args, query }) {
            const cache = await client.cache.findUnique({ where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } } })
            if (cache)
              return cache.value

            const result = await query(args)
            await client.cache.upsert({
              where: { model_operation_key: { model, operation, key: args as Prisma.JsonObject } },
              create: { model, operation, key: args as Prisma.JsonObject, value: result as Prisma.JsonArray },
              update: { value: result as Prisma.JsonArray }
            })
            return result
          },
        },
      },
    })
  })