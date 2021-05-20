import prisma from '../../prisma'
import { User } from '../../typedefs'

interface Args {
  minecraftId: string
}

export default async function userByMinecraftId(
  {} = {},
  args: Args
): Promise<User | null> {
  return await prisma.user.findUnique({
    select: {
      id: true,
      minecraftId: true,
      role: true,
    },
    where: {
      minecraftId: args.minecraftId,
    },
  })
}
