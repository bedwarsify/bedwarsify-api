import { ReportReason, UserRole } from '@prisma/client'
import { Context } from '../../main'
import { Report } from '../../typedefs'
import { AuthenticationError, UserInputError } from 'apollo-server'
import hypixel from '../../hypixel'
import { getBedwarsLevelInfo, getPlayerRank } from '@zikeji/hypixel'
import prisma from '../../prisma'
import axios from 'axios'

interface Args {
  reporteeMinecraftId: string
  reason: ReportReason
}

export default async function createReport(
  {} = {},
  args: Args,
  context: Context
): Promise<Report> {
  if (context.session === null) {
    throw new AuthenticationError('Authentication required')
  }

  if (args.reporteeMinecraftId === context.session.user.minecraftId) {
    throw new UserInputError('You cannot report yourself')
  }

  const reporteeUser = await prisma.user.findUnique({
    where: {
      minecraftId: args.reporteeMinecraftId,
    },
  })

  if (
    reporteeUser !== null &&
    (reporteeUser.role === UserRole.DEVELOPER ||
      reporteeUser.role === UserRole.COMMUNITY_MANAGER)
  ) {
    throw new UserInputError('You cannot report this user')
  }

  if (
    (await prisma.report.count({
      where: {
        reporter: {
          id: context.session.user.id,
        },
        reportee: {
          minecraftId: args.reporteeMinecraftId,
        },
      },
    })) > 0
  ) {
    throw new UserInputError('You have already reported this user')
  }

  const reporterPlayer = await hypixel.player.uuid(
    context.session.user.minecraftId!
  )

  if (reporterPlayer.stats.Bedwars === undefined) {
    throw new UserInputError(
      'You must be at least Bed Wars level 50 to report players'
    )
  }

  const reporterLevel = getBedwarsLevelInfo(reporterPlayer)

  if (reporterLevel.level < 50) {
    throw new UserInputError('You must be at least level 50 to report players')
  }

  const reporterRecentReportsCount = await prisma.report.count({
    where: {
      reporterId: context.session.user.id,
      createdAt: {
        gte: new Date(Date.now() - 15 * 60 * 1000),
      },
    },
  })

  if (reporterRecentReportsCount >= Math.ceil(reporterLevel.level / 100)) {
    throw new UserInputError('You cannot submit any more reports at the moment')
  }

  const reporteePlayer = await hypixel.player.uuid(args.reporteeMinecraftId)
  const reporteeRank = getPlayerRank(reporteePlayer)

  if (reporteeRank.staff || reporteeRank.cleanName === 'YOUTUBER') {
    throw new UserInputError('You cannot report staff or youtubers')
  }

  const reporteeLevel =
    reporteePlayer.stats.Bedwars !== undefined
      ? getBedwarsLevelInfo(reporteePlayer)
      : null

  if ((reporteeLevel?.level ?? 0) > reporterLevel.level / 2) {
    throw new UserInputError(
      'You can only report players who are not more than half your level'
    )
  }

  const weight =
    context.session.user.role === UserRole.DEVELOPER ||
    context.session.user.role === UserRole.COMMUNITY_MANAGER
      ? 1000
      : Math.floor(
          Math.min(
            reporterLevel.level /
              ((reporteeLevel?.level ?? 0) === 0
                ? 1
                : reporteeLevel?.level ?? 1),
            reporterLevel.level / 10
          )
        )

  const report = await prisma.report.create({
    data: {
      reporter: {
        connect: {
          id: context.session.user.id,
        },
      },
      reportee: {
        connectOrCreate: {
          where: {
            minecraftId: args.reporteeMinecraftId,
          },
          create: {
            minecraftId: args.reporteeMinecraftId,
          },
        },
      },
      reason: args.reason,
      weight,
    },
    select: {
      id: true,
      reason: true,
      weight: true,
      reporter: {
        select: {
          id: true,
          minecraftId: true,
          role: true,
        },
      },
      reportee: {
        select: {
          id: true,
          minecraftId: true,
          role: ue,
        },
      },
    },
  })

  if (process.env.REPORTS_DISCORD_WEBHOOK_URL !== undefined) {
    const reporterRank = getPlayerRank(reporterPlayer)

    await axios.post(process.env.REPORTS_DISCORD_WEBHOOK_URL, {
      embeds: [
        {
          title: `[${reporteeLevel?.level ?? 0}|${(
            (reporteePlayer.stats.Bedwars?.final_kills_bedwars ?? 0) /
            (reporteePlayer.stats.Bedwars?.final_deaths_bedwars ?? 1)
          ).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}] ${
            reporteeRank.cleanPrefix !== ''
              ? `${reporteeRank.cleanPrefix} `
              : ''
          }${reporteePlayer.displayname}`,
          timestamp: new Date().toISOString(),
          color: 0xef4444,
          thumbnail: {
            url: `https://crafatar.com/avatars/${reporteePlayer.uuid}?size=8`,
          },
          author: {
            name: `[${reporterLevel?.level ?? 0}|${(
              (reporterPlayer.stats.Bedwars?.final_kills_bedwars ?? 0) /
              (reporterPlayer.stats.Bedwars?.final_deaths_bedwars ?? 1)
            ).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}] ${
              reporterRank.cleanPrefix !== ''
                ? `${reporterRank.cleanPrefix} `
                : ''
            }${reporterPlayer.displayname}`,
            icon_url: `https://crafatar.com/avatars/${reporterPlayer.uuid}?size2`,
          },
          fields: [
            {
              name: 'Reason',
              value: args.reason === ReportReason.SNIPER ? 'Sniper' : 'Hacker',
              inline: ue,
            },
            {
              name: 'Weight',
              value: weight,
              inline: ue,
            },
            {
              name: 'ID',
              value: reporid,
            },
          ],
        },
      ],
    })
  }

  return report
}
