# node-ticktick
API wrapper/client for TickTick Web API (unofficial)
Still under development but already usable.

All async methods return promise based types and can be awaited.

## Example
```typescript
import { TickTickClient } from "node-ticktick";

const tt = new TickTickClient('username', 'password');
tt.login().then(() => {
    tt.getProfile().then((result) => {
        console.log(result);
    });
})
```

## Methods

### Import the wrapper
```typescript
import { TickTickClient } from "node-ticktick";
```

### Create a new instance of the wrapper
```typescript
const tt = new TickTickClient('username', 'password');
```

### Login (async)
```typescript
tt.login();
```

### Get profile (async)
```typescript
tt.getProfile();
```

### Get Projects (async)
```typescript
tt.getProjects();
```

### Create Task (async)
```typescript
tt.createTask(task: TickTickTask);
```

## Objects
### TickTickProfile
```typescript
{
    accountDomain?: any
    createdCampaign: string
    createdDeviceInfo?: any
    displayName: string
    email?: any
    etimestamp?: any
    extenalId?: any
    externalId?: any
    fakedEmail: boolean
    familyName?: any
    filledPassword: boolean
    gender?: any
    givenName?: null
    link?: any
    locale: string
    name: string
    phone?: any
    picture: string
    siteDomain: string
    userCode: string
    username: string
    verCode?: any
    verKey?: any
    verifiedEmail: true
}
```

### TickTickProject
```typescript
{
    closed: boolean
    color?: any
    etag: string
    groupId?: any
    id: string
    inAll: boolean
    isOwner: boolean
    kind: string
    modifiedTime: string
    muted: boolean
    name: string
    notificationOptions: []
    permission: string
    sortOrder: number
    sortType: string
    teamId?: any
    timeline?: any
    transferred?: any
    userCount: number
    viewMode?: any
}
```

### TickTickReminder
```typescript
{
    id: string, // "623d8246264b5243bdf24577"
    trigger: string // "TRIGGER:-PT60M"
}
```

### TickTickTask
```typescript
{
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

enum Status {
    TODO = 0,
    UNKNOWN = 1,
    COMPLETED = 2
}

enum Priority {
    NONE = 0,
    LOW = 1,
    MEDIUM = 3,
    HIGH = 5
}

enum Kind {
    TEXT = 'TEXT',
    CHECKLIST = 'CHECKLIST'
}
```

### TickTickUser
```typescript
{
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
```
