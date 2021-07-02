import { ApolloServer } from 'apollo-server'
import typeDefs from './typedefs'
import resolvers from './resolvers'
import prisma from './prisma'
import { Session, User } from '@prisma/client'
import Redis from 'ioredis'

export interface Context {
  session: (Session & { user: User }) | null
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }): Promise<Context> => {
    const token = req.headers.authorization?.split(' ')[1]

    if (token === undefined) {
      return { session: null }
    }

    const session = await prisma.session.findUnique({
      where: {
        id: token.split('.')[0],
      },
      include: {
        user: true,
      },
    })

    if (session?.secret !== token.split('.')[1]) {
      return { session: null }
    }

    return { session }
  },
})

server.listen({ port: process.env.PORT || 8080 }).then(({ url }) => {
  console.log(`Ready at ${url}`)
})

export const redis = new Redis(process.env.REDIS_URL)
