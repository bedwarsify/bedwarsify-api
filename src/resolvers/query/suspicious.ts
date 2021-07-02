import { Context, redis } from '../../main'

interface Args {
  minecraftId: string
}

export default async function suspicious(
  {} = {},
  args: Args,
  context: Context
): Promise<Boolean | null> {
  if (context.session === null) return null
  return !!(await redis.exists(`${args.minecraftId}:suspicious`))
}
