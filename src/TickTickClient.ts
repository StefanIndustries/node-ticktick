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

  constructor(private username: string, private password: string) {
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
    const xDevice = JSON.stringify({device: "node-ticktick"});
    const result = await axios.post(url, options, {
      headers: { "Content-Type": "application/json", "X-Device": xDevice },
    });

    const cookie = result.headers["set-cookie"]?.join("; ") + ";";
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
    const modifiedTasks: TickTickTask[] = [];
    tasks.forEach(task => {
      const modifiedTask: TickTickTask = {
        id: task.id ? task.id : ObjectID(),
        title: task.title,
        assignee: task.assignee ? task.assignee : null,
        content: task.content ? task.content : '',
        createdTime: task.createdTime ? task.createdTime : TickTickModelHelpers.ConvertDateToTickTickDateTime(new Date()),
        dueDate: task.dueDate ? task.dueDate : null,
        exDate: task.exDate ? task.exDate : [],
        isFloating: task.isFloating ? task.isFloating : false,
        isAllDay: task.isAllDay ? task.isAllDay : undefined,
        items: task.items ? task.items : [],
        kind: task.kind ? task.kind : null,
        modifiedTime: task.modifiedTime ? task.modifiedTime : TickTickModelHelpers.ConvertDateToTickTickDateTime(new Date()),
        priority: task.priority ? task.priority : 0,
        progress: task.progress ? task.progress : 0,
        projectId: task.projectId,
        reminders: task.reminders ? task.reminders : [],
        repeatFlag: task.repeatFlag ? task.repeatFlag : undefined, // "RRULE:FREQ=DAILY;INTERVAL=1"
        repeatFrom: task.repeatFrom ? task.repeatFrom : undefined, // "2"
        sortOrder: task.sortOrder ? task.sortOrder : -205058918580224,
        startDate: task.startDate ? task.startDate : null,
        status: task.status ? task.status : Status.TODO, // 0 is TODO
        tags: task.tags ? task.tags : [],
        timeZone: task.timeZone ? task.timeZone : 'Europe/Amsterdam'
      };
      modifiedTasks.push(modifiedTask);
    });
    const body = {
      add: modifiedTasks,
      addAttachments: [],
      delete: [],
      deleteAttachments: [],
      update: [],
      updateAttachments: []
    }
    const result = await axios.post(url, body);

    return <any>result.data;
  }
}
