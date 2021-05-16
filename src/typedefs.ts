import { ReportReason } from '@prisma/client'
import { gql } from 'apollo-server'

export default gql`
  type User {
    id: ID!
    minecraftId: String
    reportsSummary: ReportsSummary
  }

  enum ReportsSummary {
    NONE
    POTENTIAL_HACKER
    HACKER
    POTENTIAL_SNIPER
    SNIPER
  }

  type Session {
    id: ID!
    user: User!
    secret: String
    type: SessionType!
  }

  enum SessionType {
    OVERLAY
  }

  type Report {
    id: ID!
    reporter: User!
    reportee: User!
    reason: ReportReason!
    weight: Int!
  }

  enum ReportReason {
    HACKER
    SNIPER
  }

  type Query {
    userByMinecraftId(minecraftId: ID!): User
    session: Session
  }

  type Mutation {
    createSessionWithDiscordCode(
      discordCode: String!
      type: SessionType!
    ): Session!
    createReport(reporteeMinecraftId: String!, reason: ReportReason!): Report!
  }
`

export interface User {
  id: string
  minecraftId: string | null
}

export enum ReportsSummary {
  NONE = 'NONE',
  POTENTIAL_HACKER = 'POTENTIAL_HACKER',
  HACKER = 'HACKER',
  POTENTIAL_SNIPER = 'POTENTIAL_SNIPER',
  SNIPER = 'SNIPER',
}

export interface Session {
  id: string
  user: User
  secret: string | null
  type: SessionType | string
}

export enum SessionType {
  OVERLAY = 'OVERLAY',
}

export interface Report {
  id: string
  reporter: User
  reportee: User
  reason: ReportReason
  weight: number
}
