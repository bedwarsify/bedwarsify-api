import { ReportReason } from '@prisma/client'
import { Context } from '../../main'
import { Report } from '../../typedefs'
import { AuthenticationError, UserInputError } from 'apollo-server'
import hypixel from '../../hypixel'
import { getBedwarsLevelInfo } from '@zikeji/hypixel'
import prisma from '../../prisma'

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
  const reporteeLevel =
    reporteePlayer.stats.Bedwars !== undefined
      ? getBedwarsLevelInfo(reporteePlayer)
      : null

  if ((reporteeLevel?.level ?? 0) > reporterLevel.level / 2) {
    throw new UserInputError(
      'You can only report players who are not more than half your level'
    )
  }

  const weight = Math.floor(
    Math.min(
      reporterLevel.level /
        ((reporteeLevel?.level ?? 0) === 0 ? 1 : reporteeLevel?.level ?? 1),
      reporterLevel.level / 10
    )
  )

  return await prisma.report.create({
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
        },
      },
      reportee: {
        select: {
          id: true,
          minecraftId: true,
        },
      },
    },
  })
}
