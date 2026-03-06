import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------
export type HabitCreatedEvent = {
    readonly habitId: bigint;
    readonly stakeAmount: bigint;
};
export type CheckInEvent = {
    readonly habitId: bigint;
    readonly newStreak: bigint;
};
export type StreakBrokenEvent = {
    readonly habitId: bigint;
    readonly taxAmount: bigint;
    readonly returned: bigint;
};
export type YieldClaimedEvent = {
    readonly amount: bigint;
};
export type SponsoredEvent = {
    readonly amount: bigint;
};
export type ChallengeIssuedEvent = {
    readonly challengeId: bigint;
    readonly friend: bigint;
    readonly multiplier: bigint;
};
export type ChallengeAcceptedEvent = {
    readonly challengeId: bigint;
};
export type GroupCreatedEvent = {
    readonly groupId: bigint;
    readonly creator: bigint;
    readonly maxPlayers: bigint;
};
export type GroupMemberJoinedEvent = {
    readonly groupId: bigint;
    readonly member: bigint;
};
export type GroupStartedEvent = {
    readonly groupId: bigint;
    readonly memberCount: bigint;
};
export type GroupMemberEliminatedEvent = {
    readonly groupId: bigint;
    readonly member: bigint;
};
export type GroupWinnersClaimedEvent = {
    readonly groupId: bigint;
    readonly winner: bigint;
    readonly amount: bigint;
};

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the setAddresses function call.
 */
export type SetAddresses = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the createHabit function call.
 */
export type CreateHabit = CallResult<
    {
        habitId: bigint;
    },
    OPNetEvent<HabitCreatedEvent>[]
>;

/**
 * @description Represents the result of the checkIn function call.
 */
export type CheckIn = CallResult<
    {
        newStreakCount: bigint;
    },
    OPNetEvent<CheckInEvent>[]
>;

/**
 * @description Represents the result of the breakStreak function call.
 */
export type BreakStreak = CallResult<
    {
        taxAmount: bigint;
    },
    OPNetEvent<StreakBrokenEvent>[]
>;

/**
 * @description Represents the result of the claimYield function call.
 */
export type ClaimYield = CallResult<
    {
        claimed: bigint;
    },
    OPNetEvent<YieldClaimedEvent>[]
>;

/**
 * @description Represents the result of the sponsor function call.
 */
export type Sponsor = CallResult<{}, OPNetEvent<SponsoredEvent>[]>;

/**
 * @description Represents the result of the challenge function call.
 */
export type Challenge = CallResult<
    {
        challengeId: bigint;
    },
    OPNetEvent<ChallengeIssuedEvent>[]
>;

/**
 * @description Represents the result of the acceptChallenge function call.
 */
export type AcceptChallenge = CallResult<{}, OPNetEvent<ChallengeAcceptedEvent>[]>;

/**
 * @description Represents the result of the cancelChallenge function call.
 */
export type CancelChallenge = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the createGroupHabit function call.
 */
export type CreateGroupHabit = CallResult<
    {
        groupId: bigint;
    },
    OPNetEvent<GroupCreatedEvent>[]
>;

/**
 * @description Represents the result of the joinGroupHabit function call.
 */
export type JoinGroupHabit = CallResult<{}, OPNetEvent<GroupMemberJoinedEvent>[]>;

/**
 * @description Represents the result of the startGroupHabit function call.
 */
export type StartGroupHabit = CallResult<{}, OPNetEvent<GroupStartedEvent>[]>;

/**
 * @description Represents the result of the cancelGroupHabit function call.
 */
export type CancelGroupHabit = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the checkInGroup function call.
 */
export type CheckInGroup = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the eliminateGroupMember function call.
 */
export type EliminateGroupMember = CallResult<{}, OPNetEvent<GroupMemberEliminatedEvent>[]>;

/**
 * @description Represents the result of the claimGroupWinnings function call.
 */
export type ClaimGroupWinnings = CallResult<
    {
        claimed: bigint;
    },
    OPNetEvent<GroupWinnersClaimedEvent>[]
>;

/**
 * @description Represents the result of the getGroupInfo function call.
 */
export type GetGroupInfo = CallResult<
    {
        frequency: bigint;
        duration: bigint;
        minStake: bigint;
        maxPlayers: bigint;
        status: bigint;
        startBlock: bigint;
        totalPool: bigint;
        memberCount: bigint;
        survivorCount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getGroupMembers function call.
 */
export type GetGroupMembers = CallResult<
    {
        members: Uint8Array;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getGroupName function call.
 */
export type GetGroupName = CallResult<
    {
        name: string;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getChallengeInfo function call.
 */
export type GetChallengeInfo = CallResult<
    {
        fromAddr: bigint;
        toAddr: bigint;
        multiplier: bigint;
        baseAmount: bigint;
        expiry: bigint;
        status: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getIncomingChallenges function call.
 */
export type GetIncomingChallenges = CallResult<
    {
        challengeIds: Uint8Array;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getLeaderboard function call.
 */
export type GetLeaderboard = CallResult<
    {
        addresses: Uint8Array;
        streaks: Uint8Array;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMotoMiles function call.
 */
export type GetMotoMiles = CallResult<
    {
        miles: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUserHabits function call.
 */
export type GetUserHabits = CallResult<
    {
        habitIds: Uint8Array;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getHabitInfo function call.
 */
export type GetHabitInfo = CallResult<
    {
        streak: bigint;
        lastCheckIn: bigint;
        stakeAmount: bigint;
        frequency: bigint;
        isActive: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getHabitName function call.
 */
export type GetHabitName = CallResult<
    {
        name: string;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getStats function call.
 */
export type GetStats = CallResult<
    {
        totalStaked: bigint;
        totalStreakDays: bigint;
        totalHabits: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPendingYield function call.
 */
export type GetPendingYield = CallResult<
    {
        pending: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IStreakSats
// ------------------------------------------------------------------
export interface IStreakSats extends IOP_NETContract {
    setAddresses(pillContractAddress: Address, badgeContractAddress: Address): Promise<SetAddresses>;
    createHabit(name: string, frequency: string, stakeAmount: bigint): Promise<CreateHabit>;
    checkIn(habitId: bigint): Promise<CheckIn>;
    breakStreak(habitId: bigint): Promise<BreakStreak>;
    claimYield(): Promise<ClaimYield>;
    sponsor(amount: bigint): Promise<Sponsor>;
    challenge(friendAddress: Address, multiplier: bigint, baseAmount: bigint): Promise<Challenge>;
    acceptChallenge(challengeId: bigint): Promise<AcceptChallenge>;
    cancelChallenge(challengeId: bigint): Promise<CancelChallenge>;
    createGroupHabit(
        name: string,
        frequency: string,
        durationDays: bigint,
        minStake: bigint,
        maxPlayers: bigint,
    ): Promise<CreateGroupHabit>;
    joinGroupHabit(groupId: bigint, stakeAmount: bigint): Promise<JoinGroupHabit>;
    startGroupHabit(groupId: bigint): Promise<StartGroupHabit>;
    cancelGroupHabit(groupId: bigint): Promise<CancelGroupHabit>;
    checkInGroup(groupId: bigint): Promise<CheckInGroup>;
    eliminateGroupMember(groupId: bigint, memberAddress: Address): Promise<EliminateGroupMember>;
    claimGroupWinnings(groupId: bigint): Promise<ClaimGroupWinnings>;
    getGroupInfo(groupId: bigint): Promise<GetGroupInfo>;
    getGroupMembers(groupId: bigint): Promise<GetGroupMembers>;
    getGroupName(groupId: bigint): Promise<GetGroupName>;
    getChallengeInfo(challengeId: bigint): Promise<GetChallengeInfo>;
    getIncomingChallenges(user: Address): Promise<GetIncomingChallenges>;
    getLeaderboard(): Promise<GetLeaderboard>;
    getMotoMiles(user: Address): Promise<GetMotoMiles>;
    getUserHabits(user: Address): Promise<GetUserHabits>;
    getHabitInfo(habitId: bigint): Promise<GetHabitInfo>;
    getHabitName(habitId: bigint): Promise<GetHabitName>;
    getStats(): Promise<GetStats>;
    getPendingYield(user: Address): Promise<GetPendingYield>;
}
