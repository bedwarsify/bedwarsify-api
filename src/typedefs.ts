import { ReportReason } from '@prisma/client'
import { gql } from 'apollo-server'

export default gql`
  type User {
    id: ID!
    minecraftId: String
    role: UserRole!
    reportsSummary: ReportsSummary
    customTagText: String
    customTagColor: Int
  }

  enum UserRole {
    NONE
    NITRO_BOOSTER
    PARTNER
    COMMUNITY_MANAGER
    DEVELOPER
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
    createSession(
      provider: CreateSessionProvider!
      code: String!
      type: SessionType!
    ): Session!
    createSessionWithDiscordCode(
      discordCode: String!
      type: SessionType!
    ): Session!
    createReport(reporteeMinecraftId: String!, reason: ReportReason!): Report!
  }

  enum CreateSessionProvider {
    DISCORD
  }
`

export interface User {
  id: string
  minecraftId: string | null
  role:
    | 'NONE'
    | 'NITRO_BOOSTER'
    | 'PARTNER'
    | 'HELPER'
    | 'COMMUNITY_MANAGER'
    | 'DEVELOPER'
  customTagText: string | null
  customTagColor: number | null
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

export enum CreateSessionProvider {
  DISCORD = 'DISCORD',
}
