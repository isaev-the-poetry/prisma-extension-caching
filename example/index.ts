import { PrismaClient, Prisma } from "@prisma/client";
import { caching } from "../dist"

// You can use multiple clients. 
// ex: const prisma = new PrismaClient()
const cache = new PrismaClient().$extends(caching())
// Caching is enabled always. 

async function main() {

  // First time: query will retrive data, and save it in local prisma.cache model
  // Next time: data will be fetched from cache. No more database calls untill purge.
  // Query arguments will be used as flexible caching key.
  const recentPosts = await cache.post.findMany({ orderBy: { id: "desc" }, take: 10 })
    .then(console.log)

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

  // You controll purging manually.
  // Ex:
  await cache.post.purge({ orderBy: { id: "desc" }, take: 10 }) // query exact match
  await cache.post.purge({ path: ['where', 'visible'], not: Prisma.DbNull }) // query JsonFilter match 
  await cache.post.purge({ hours: 3 }) // all model cache, older than 3 hours
  await cache.post.purge({ seconds: 60 }) // all model cache, older than 1 minute
  await cache.post.purge({ orderBy: { id: "desc" }, take: 10 }, "findMany") // query cache for method
  await cache.post.purge("findMany") // all model cache for method
  await cache.post.purge() // all model cache data

  await cache.post.count({ where: { id: { gt: 100 } } })
  await cache.post.purge({ where: { id: { gt: 100 } } }, 'count') // purge for specific method

  // purge by time
  await cache.post.purge({ seconds: 10 }, "findMany") // purge findMany method cache, older than 10 seconds
  await cache.post.purge({ hours: 1 }, "count") // purge findMany method cache, older than 1 hour


  // Purge by JsonFilter is good, when you have dynamic query param cache
  const currentUser = 1; // getCurrentUser()
  const userPosts = await cache.post.findMany({
    where: {
      author: currentUser
    }
  })
  // will purge all cache by query route match, ignoring currentUser difference
  await cache.post.purge({ path: ['where', 'author'], not: Prisma.DbNull })


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
}

main()
