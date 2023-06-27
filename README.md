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
      .then(console.log)

  await cache.post.count({ where: { id: { gt: 100 } } })

  await cache.post.purge({ orderBy: { id: "desc" }, take: 10 }) // query exact match
  await cache.post.purge({ path: ['where', 'visible'], not: Prisma.DbNull }) // query JsonFilter match 
  await cache.post.purge({ hours: 3 }) // all model cache, older than 3 hours
  await cache.post.purge({ seconds: 60 }) // all model cache, older than 1 minute
  await cache.post.purge({ seconds: 10 }, "findMany") // purge findMany method cache, older than 10 seconds 
  await cache.post.purge({ orderBy: { id: "desc" }, take: 10 }, "findMany") // query cache for method
  await cache.post.purge("findMany") // all model cache for method
  await cache.post.purge() // all model cache data
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

# More Examples: 

```
  // Purge by JsonFilter is good, when you have dynamic query param cache
  const currentUser = 1; // getCurrentUser()
  const userPosts = await cache.post.findMany({
    where: {
      author: currentUser
    }
  })
  // will purge all cache by query route match, ignoring currentUser difference
  await cache.post.purge({ path: ['where', 'author'], not: Prisma.DbNull })

  /* You can use findUnique as materialised view */
  // const materialisedView = await cache.post.findUnique({
  //   include: {
  //     comments: true,
  //     author: true,
  //     links: true,
  //     metadata: true,
  //     ...
  //   }
  // })

  /** If you have complex query and you want to make key more readable,
   *  you can export query as separate object, and tag it explicit  */
  // Named key concept 
  const cacheKey = { select: { title: true } } as const
  const posts = await cache.post.findMany(cacheKey)
  // purge with key
  await cache.post.purge(cacheKey)

  // Typed key concept 
  type cacheKey = { select: {} }
  const postsCatalogView: cacheKey = { select: { title: true } }
  const data = await cache.post.findMany(postsCatalogView)
  // purge with key
  await cache.post.purge(postsCatalogView)

  // Tip: if you have same query params in model, you should purge cache apart
  await cache.post.count({ where: { id: { gt: 100 } } })
  await cache.post.findMany({ where: { id: { gt: 100 } } })
  await cache.post.purge({ where: { id: { gt: 100 } } }) // will purge both caches, because query params are match
  await cache.post.purge({ where: { id: { gt: 100 } } }, 'count') // will purge cache only for count mehtod

  // query without caching
  // ex: const prisma = new PrismaClient()
  // const originalPosts = await prisma.post.findMany({ orderBy: { id: "desc" }, take: 10 })
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