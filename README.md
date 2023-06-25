# Prisma Client Extension :: Prisma Native Caching 

This extension adds the ability to cache complex queries using client-side prisms.
The prism model is used as storage, so you can use any database that prisma support.

This extension uses modern databases json query features. 
Query arguments will be used as json caching key.
You can use Prisma.JsonFilter in purge function to get maximum flexibility.

# Usage:
```
  // Query arguments will be used as flexible caching key.
  const cachedPosts = await cache.post.findMany({ orderBy: { id: "desc" }, take: 10 })  
 
  await cache.post.purge({ orderBy: { id: "desc" }, take: 10 }) // model query exact match
  await cache.post.purge({ path: ['where', 'visible'], not: Prisma.DbNull }) // model query JsonFilter match 
  await cache.post.purge({ hours: 3 }) // all model cache older than 3 hours
  await cache.post.purge() // all model cache
 
  const countPosts = await cache.post.count()
  await cache.post.purge({ hours: 3 }, 'count') // purge for only specific method
```

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

That's all. Now you can use it as second client.


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

```
findMany
groupBy
count
aggregate
findUnique**
```

Any other method will produce standart database query without caching.
Open for MR.

findUnique ** if original query return null, result won't be saved in cache.

# FAQ:
  How it work?
    - First time query executed in database, rest will be served from cache until being purged manually, by calling purge() method on model.
  How it works with types?
    - Fully support
  Can i disable cache for specific method/model?
    - No. Use second client instead.
  Why do i need to cache findUnique?
    - It helpfull, when you use include in query. 
      Ex: cache.posts.findUnique({ where: { id: 1 }, include: { comments: { take: 10 } }})