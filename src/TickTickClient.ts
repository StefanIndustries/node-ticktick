import axios, { AxiosError } from 'axios';
import ObjectID from 'bson-objectid';
import { AddTask } from './models/AddTask';
import { TickTickProfile } from './models/TickTickProfile';
import { TickTickProject } from './models/TickTickProject';
import { Status, TickTickTask } from './models/TickTickTask';
import { TickTickLogin } from './models/TickTickUser';
import { TickTickModelHelpers } from './TickTickModelHelpers';

axios.defaults.baseURL = 'https://ticktick.com/api/v2/';

export class TickTickClient {

  private readonly xDevice = JSON.stringify({
    "platform": "web",
    "os": "Windows 10",
    "device": "Firefox 122.0",
    "name": "",
    "version": 5070,
    "id": "6235fe7bac5d867b31382f52",
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
      if(error.response?.status !== 401) {
        return Promise.reject(error);
      }

      await this.login().catch(error => Promise.reject(error));
      const originalRequestConfig = error.config;
      delete originalRequestConfig!.headers!['Cookie'];

      return axios.request(originalRequestConfig!);
    });
  }

  public async login(): Promise<TickTickLogin> {
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

  public async getTasks(): Promise<TickTickTask[]> {
    const url = "project/all/completedInAll/?from=2023-04-12 00:00:00&to=2023-04-12 22:00:00&limit=50";
    const result = await axios.get(url);

    return <TickTickTask[]>result.data;
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
