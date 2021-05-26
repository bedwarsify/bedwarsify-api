import { ReportsSummary, User } from '../../typedefs'
import { Context } from '../../main'
import prisma from '../../prisma'
import { ReportReason } from '@prisma/client'

export default async function reportsSummary(
  parent: User,
  {} = {},
  context: Context
): Promise<ReportsSummary | null> {
  if (context.session === null) return null

  const reports = await prisma.report.findMany({
    where: {
      reporteeId: parent.id,
    },
  })

  const totalWeight = reports.reduce(
    (totalWeight, report) => (totalWeight += report.weight),
    0
  )

  const potential =
    (reports.length >= 3 && totalWeight >= 5) || totalWeight >= 10
  const confirmed =
    (reports.length >= 2 && totalWeight >= 50) || totalWeight >= 1000

  const isSniper =
    reports.filter((report) => report.reason === ReportReason.SNIPER).length >=
    reports.length / 2

  return confirmed
    ? isSniper
      ? ReportsSummary.SNIPER
      : ReportsSummary.HACKER
    : potential
    ? isSniper
      ? ReportsSummary.POTENTIAL_SNIPER
      : ReportsSummary.POTENTIAL_HACKER
    : ReportsSummary.NONE
}
