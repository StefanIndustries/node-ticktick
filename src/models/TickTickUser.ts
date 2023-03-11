export interface TickTickLogin {
    token: string,
    userId: number,
    username: string,
    inboxId: string,
    proStartDate?: string,
    proEndDate?: string,
    subscribeType?: string,
    subscribeFreq?: string,
    needSubscribe?: boolean,
    freq?: string,
    teamUser?: boolean,
    activeTeamUser?: boolean,
    freeTrial?: boolean,
    pro?: boolean,
    ds?: boolean
}