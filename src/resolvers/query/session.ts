import { Context } from '../../main'
import { Session } from '../../typedefs'

export default async function session(
  {} = {},
  {} = {},
  context: Context
): Promise<Session | null> {
  return context.session !== null
    ? {
        ...context.session,
        secret: null,
      }
    : null
}
