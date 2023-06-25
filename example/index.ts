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
  
  console.log({ recentPosts })

  // You controll purging manually.
  await cache.post.purge({ orderBy: { id: "desc" }, take: 10 }) // model query exact match
  await cache.post.purge({ path: ['where', 'visible'], not: Prisma.DbNull }) // model query JsonFilter match 
  await cache.post.purge({ hours: 3 }) // model any cache older than 3 hours
  await cache.post.purge() // any model cache

  // same purpose without caching
  // ex: const prisma = new PrismaClient()
  // const originalPosts = await prisma.post.findMany({ orderBy: { id: "desc" }, take: 10 })
}

main()
