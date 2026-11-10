import axios, { AxiosError } from 'axios';
import ObjectID from 'bson-objectid';
import { AddTask } from './models/AddTask';
import { TickTickProfile } from './models/TickTickProfile';
import { TickTickProject } from './models/TickTickProject';
import { Status, TickTickTask } from './models/TickTickTask';
import { TickTickLogin } from './models/TickTickUser';
import { TickTickModelHelpers } from './TickTickModelHelpers';
import { getNextOccurrence, getUnsupportedRecurrenceReason, shiftTickTickDateTime } from './TickTickRecurrence';

axios.defaults.baseURL = 'https://ticktick.com/api/v2/';

export class TickTickClient {

  private readonly xDevice = JSON.stringify({
    "platform": "web",
    "os": "Windows 10",
    "device": "Firefox 147.0",
    "name": "",
    "version": 8010,
    "id": "6980721550301f0a1c194621",
    "channel": "website",
    "campaign": "",
    "websocket": ""
  });
  private csrfHeader: string | undefined;

  constructor(private username: string, private password: string) {
    axios.interceptors.request.use((config) => {
      if (this.xDevice) {
        config.headers['X-Device'] = this.xDevice;
      }
      if (this.csrfHeader) {
        config.headers['X-Csrftoken'] = this.csrfHeader;
      }
      return config;
    });

    axios.interceptors.response.use(undefined, async (error: AxiosError) => {
      const originalRequestConfig = error.config as (typeof error.config & { _ticktickRetried?: boolean }) | undefined;
      // Retry once after logging in again; a second 401 means the credentials or the endpoint are not valid.
      if (error.response?.status !== 401 || !originalRequestConfig || originalRequestConfig._ticktickRetried) {
        return Promise.reject(error);
      }
      originalRequestConfig._ticktickRetried = true;

      await this.login();
      delete originalRequestConfig.headers['Cookie'];

      return axios.request(originalRequestConfig);
    });
  }

  public async login(): Promise<TickTickLogin> {
    await this._getTokens();
    return this._login();
  }

  private async _getTokens(): Promise<void> {
    const url = "https://ticktick.com/signin";
    const result = await axios.get(url);
    const cookie = result.headers["set-cookie"]?.join("; ") + ";";
    axios.defaults.headers.common['Cookie'] = cookie;
  }

  private async _login(): Promise<TickTickLogin> {
    const url = "/user/signon?wc=true&remember=true";

    const options = {
      username: this.username,
      password: this.password,
    };
    const result = await axios.post(url, options, {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://ticktick.com",
        "DNT": 1,
        "Origin": "https://ticktick.com",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.5",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
      },
    });

    const cookie = result.headers["set-cookie"]?.join("; ") + ";";
    const csrfCookie = result.headers["set-cookie"]?.find(c => c.startsWith('_csrf_token='));
    if (csrfCookie) {
      this.csrfHeader = csrfCookie.split(';')[0].split('=')[1];
    }
    axios.defaults.headers.common['Cookie'] = cookie;

    return <TickTickLogin>result.data;
  }

  public async getProfile(): Promise<TickTickProfile> {
    const url = "user/profile";
    const result = await axios.get(url);

    return <TickTickProfile>result.data;
  }

  public async getProjects(): Promise<TickTickProject[]> {
    const url = "projects";
    const result = await axios.get(url);

    return <TickTickProject[]>result.data;
  }

  public async getTasks(fromDate: string, toDate: string): Promise<TickTickTask[]> {
    const url = `project/all/completedInAll/?from=${fromDate} 00:00:00&to=${toDate} 22:00:00&limit=50`;
    const result = await axios.get(url);

    return <TickTickTask[]>result.data;
  }

  /**
   * Returns all tasks that are not completed yet, across all projects (including the inbox).
   */
  public async getUncompletedTasks(): Promise<TickTickTask[]> {
    const url = "batch/check/0";
    const result = await axios.get(url);

    return <TickTickTask[]>(result.data?.syncTaskBean?.update ?? []);
  }

  /**
   * Returns a single uncompleted task by its id, or undefined when it can not be found
   * (for example because it is already completed or deleted).
   */
  public async getUncompletedTask(taskId: string): Promise<TickTickTask | undefined> {
    const tasks = await this.getUncompletedTasks();
    return tasks.find(task => task.id.toString() === taskId);
  }

  public async updateTask(task: TickTickTask): Promise<any> {
    return this.updateTasks([task]);
  }

  /**
   * Updates existing tasks. Pass the full task objects as returned by TickTick,
   * fields that are left out may be cleared by TickTick.
   */
  public async updateTasks(tasks: TickTickTask[]): Promise<any> {
    const now = TickTickModelHelpers.ConvertDateToTickTickDateTime(new Date());
    return this.batchTask({ update: tasks.map(task => ({ ...task, modifiedTime: now })) });
  }

  /**
   * Returns whether completeTask supports this task. Recurring tasks with an unsupported repeat rule
   * (for example custom TickTick rules, or repeating from the completion date) can not be completed.
   */
  public static canCompleteTask(task: TickTickTask): boolean {
    return getUnsupportedRecurrenceReason(task) === null;
  }

  /**
   * Marks a task as completed.
   *
   * For recurring tasks this does what the TickTick apps do: a completed copy of the current occurrence
   * is added, and the series itself moves to its next occurrence. When the series has ended
   * (UNTIL or COUNT reached) the task is simply completed. Throws for unsupported repeat rules.
   */
  public async completeTask(task: TickTickTask): Promise<any> {
    const now = TickTickModelHelpers.ConvertDateToTickTickDateTime(new Date());
    const next = task.repeatFlag ? getNextOccurrence(task) : null;

    if (!next) {
      return this.batchTask({
        update: [{ ...task, status: Status.COMPLETED, completedTime: now, modifiedTime: now }],
      });
    }

    const timeZone = task.timeZone || 'UTC';
    const { attachments, focusSummaries, ...copyBase } = task as TickTickTask & { attachments?: unknown, focusSummaries?: unknown };
    const completedOccurrence = {
      ...copyBase,
      id: ObjectID().toHexString(),
      status: Status.COMPLETED,
      completedTime: now,
      modifiedTime: now,
      repeatFlag: '',
      repeatTaskId: task.id.toString(),
      items: (task.items ?? []).map((item: any) => ({ ...item, id: ObjectID().toHexString() })),
      reminders: (task.reminders ?? []).map(reminder => ({ ...reminder, id: ObjectID().toHexString() })),
    };

    const shiftItemDate = (value: string | null | undefined) =>
      value ? shiftTickTickDateTime(value, next.shiftedDays, timeZone) : value;
    const advancedSeries: TickTickTask = {
      ...task,
      status: Status.TODO,
      completedTime: null,
      modifiedTime: now,
      startDate: next.startDate,
      dueDate: next.dueDate,
      repeatFlag: next.repeatFlag,
      items: (task.items ?? []).map((item: any) => ({
        ...item,
        status: 0,
        completedTime: null,
        startDate: shiftItemDate(item.startDate),
        dueDate: shiftItemDate(item.dueDate),
      })) as [],
      ...('progress' in task ? { progress: 0 } : {}),
    };

    return this.batchTask({ add: [completedOccurrence], update: [advancedSeries] });
  }

  /**
   * Marks a task as completed by its id. Throws when the task can not be found among the uncompleted tasks.
   */
  public async completeTaskById(taskId: string): Promise<any> {
    const task = await this.getUncompletedTask(taskId);
    if (!task) {
      throw new Error(`Uncompleted task with id ${taskId} not found.`);
    }

    return this.completeTask(task);
  }

  /** Posts to batch/task and throws when TickTick reports errors for any of the tasks. */
  private async batchTask(changes: { add?: object[], update?: object[] }): Promise<any> {
    const body = {
      add: changes.add ?? [],
      addAttachments: [],
      delete: [],
      deleteAttachments: [],
      update: changes.update ?? [],
      updateAttachments: []
    };
    const result = await axios.post("batch/task", body);
    const errors = result.data?.id2error ?? {};
    if (Object.keys(errors).length > 0) {
      throw new Error(`TickTick rejected the change: ${JSON.stringify(errors)}`);
    }
    return result.data;
  }

  public async createTask(task: AddTask): Promise<any> {
    return this.createTasks([task]);
  }

  public async createTasks(tasks: AddTask[]): Promise<any> {
    const url = "batch/task";
    const modifiedTasks: TickTickTask[] = tasks.map(task => ({
          id: task.id ?? ObjectID(),
          title: task.title,
          assignee: task.assignee ?? null,
          content: task.content ?? "",
          createdTime: task.createdTime ?? TickTickModelHelpers.ConvertDateToTickTickDateTime(new Date()),
          dueDate: task.dueDate ?? null,
          exDate: task.exDate ?? [],
          isFloating: task.isFloating ?? false,
          isAllDay: task.isAllDay !== undefined ? task.isAllDay : true, // Fix for boolean
          items: task.items ?? [],
          kind: task.kind ?? null,
          modifiedTime: task.modifiedTime ?? TickTickModelHelpers.ConvertDateToTickTickDateTime(new Date()),
          priority: task.priority !== undefined ? task.priority : 0, // Fix for numbers
          progress: task.progress ?? 0,
          projectId: task.projectId,
          reminders: task.reminders ?? [],
          repeatFlag: task.repeatFlag ?? undefined,
          repeatFrom: task.repeatFrom ?? undefined,
          sortOrder: task.sortOrder ?? -205058918580224,
          startDate: task.startDate ?? null,
          status: task.status !== undefined ? task.status : Status.TODO, // Fix for numbers
          tags: task.tags ?? [],
          timeZone: task.timeZone ?? 'Europe/Amsterdam'
        })
    );
    const body = {
      add: modifiedTasks,
      addAttachments: [],
      delete: [],
      deleteAttachments: [],
      update: [],
      updateAttachments: []
    };

    const result = await axios.post(url, body);
    return result.data;
  }
}
