import ObjectID from "bson-objectid"
import { TickTickReminder } from "./TickTickReminder"

export interface TickTickTask {
    id: string | ObjectID,
    title: string, // "test notification"
    assignee: any,
    content: string,
    createdTime: string, // datetime "2022-03-25T08:45:40.000+0000" note: missing : at the end from normal ISO 8601
    dueDate: string | null, // datetime "2022-03-25T08:45:40.000+0000" note: missing : at the end from normal ISO 8601
    exDate: any[],
    isFloating: boolean,
    isAllDay?: boolean,
    items: [],
    kind: Kind | null,
    modifiedTime: string, // datetime "2022-03-25T08:45:40.000+0000" note: missing : at the end from normal ISO 8601
    priority: Priority, // 0
    progress: number, // 0
    projectId: string, // "inbox117452138"
    reminders: TickTickReminder[], // not supported yet
    repeatFlag?: string, // "RRULE:FREQ=DAILY;INTERVAL=1"
    repeatFrom?: string, // "2"
    sortOrder: number, // -202859895324672
    startDate: string | null, // datetime "2022-03-25T08:45:40.000+0000" note: missing : at the end from normal ISO 8601
    status: Status, // 0 is TODO
    tags: [],
    timeZone: string // "Europe/Amsterdam"
}

export enum Status {
    TODO = 0,
    UNKNOWN = 1,
    COMPLETED = 2
}

export enum Priority {
    NONE = 0,
    LOW = 1,
    MEDIUM = 3,
    HIGH = 5
}

export enum Kind {
    TEXT = 'TEXT',
    CHECKLIST = 'CHECKLIST'
}