import { CreateSessionProvider, Session } from '../../typedefs'
import axios, { AxiosResponse } from 'axios'
import * as querystring from 'querystring'
import { UserInputError } from 'apollo-server'
import { SessionType } from '@prisma/client'
import prisma from '../../prisma'
import { randomBytes } from 'crypto'
import { promisify } from 'util'

const randomBytesPromisified = promisify(randomBytes)

type Args = {
  provider: CreateSessionProvider
  code?: string
  discordCode?: string
}

interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

interface DiscordUsersMeResponse {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  bot: boolean | undefined
  system: boolean | undefined
  mfa_enabled: boolean | undefined
  locale: string | undefined
  flags: number | undefined
  premium_type: number | undefined
  public_flags: number | undefined
}

export default async function createSession(
  {} = {},
  args: Args
): Promise<Session> {
  const token = (await axios
    .post(
      'https://discord.com/api/oauth2/token',
      querystring.stringify({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: args.code ?? args.discordCode,
        redirect_uri: 'http://localhost',
      })
    )
    .catch(() => {
      throw new UserInputError('Invalid code')
    })) as AxiosResponse<DiscordTokenResponse>

  if (token.data.scope !== 'identify') {
    throw new UserInputError('Invalid code')
  }

  const discordMe = (await axios
    .get('https://discord.com/api/v9/users/@me', {
      headers: {
        Authorization: `${token.data.token_type} ${token.data.access_token}`,
      },
    })
    .catch(() => {
      throw new UserInputError('Invalid code')
    })) as AxiosResponse<DiscordUsersMeResponse>

  const userExists =
    (await prisma.user.count({
      where: {
        discordId: discordMe.data.id,
      },
    })) !== 0

  if (!userExists) {
    throw new UserInputError(
      'This Discord account is not linked to any account'
    )
  }

  return await prisma.session.create({
    data: {
      user: {
        connect: {
          discordId: discordMe.data.id,
        },
      },
      secret: (await randomBytesPromisified(48)).toString('hex'),
      type: SessionType.OVERLAY,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          minecraftId: true,
          role: true,
        },
      },
      secret: true,
      type: true,
    },
  })
}
