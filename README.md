# Prisma Client Extension :: Prisma Native Caching 

This extension adds the ability to cache complex queries using client-side prisms.
The prism model is used as storage, so you can use any database that prisma support.

This extension uses modern databases json query features. 
Query arguments will be used as json caching key.
You can use Prisma.JsonFilter in purge function to get maximum flexibility.

## Get started

Installation: 
Add this model to your prisma schema.

```
model cache {
  model String
  operation String
  key   Json
  value Json

  created DateTime @default(now())
  updated DateTime @default(now())

  @@id([model, operation, key])
}
```

Create caching client:
```
import { caching } from "prisma-extension-caching" 
export const cache = new PrismaClient().$extends(caching())
```

That's all. Now you can use it as standart client:

```
  // Query arguments will be used as flexible caching key.
  const cachedPosts = await cache.post.findMany({ orderBy: { id: "desc" }, take: 10 })  
 
  await cache.post.purge({ orderBy: { id: "desc" }, take: 10 }) // model query exact match
  await cache.post.purge({ path: ['where', 'visible'], not: Prisma.DbNull }) // model query JsonFilter match 
  await cache.post.purge({ hours: 3 }) // model any cache older than 3 hours
  await cache.post.purge() // any model cache
```

# The example app:

```
cd example
npm install
npx prisma db push
```

Test the extension in the example app:
```
npm run dev
```

# Supported methods
Currently supported only findMany method.
Any other method will produce standart database query without caching.

I'm open to evolve mode functionality.
So i'am going to add same support for groupBy and count methods later.

