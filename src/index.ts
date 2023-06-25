import { Prisma } from '@prisma/client'

export type range = { hours: number }

const isRange = (args: {}): args is range => "hours" in args
const isFilter = (args: {}): args is Prisma.JsonFilter => "path" in args
const delayHours = (purgeDate: Date, hours: number): Date => (purgeDate.setTime(purgeDate.getTime() - (hours * 60 * 60 * 1000)), purgeDate)

export const caching = () =>
  Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'prisma-extension-caching',
      model: {
        $allModels: {
          async purge<T, A>(this: T, args?: Prisma.Args<T, 'findMany'> | Prisma.JsonFilter | range) {
            const ctx = Prisma.getExtensionContext(this)
            const model = ctx.name
            const operation = 'findMany'

            if (!args)
              return client.cache.deleteMany({ where: { model, operation } })
            else if (isFilter(args))
              return client.cache.deleteMany({ where: { model, operation, key: args } })
            else if (isRange(args))
              return client.cache.deleteMany({ where: { created: { lt: delayHours(new Date(), args.hours) } } })
            else if (model)
              return client.cache.deleteMany({ where: { model, operation, key: { equals: args } } })
          },
        },
      },
      query: {
        $allModels: {
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
        },
      },
    })
  })