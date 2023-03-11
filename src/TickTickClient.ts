import axios, { AxiosError } from 'axios';
import { TickTickProfile } from './models/TickTickProfile';
import { TickTickProject } from './models/TickTickProject';
import { TickTickTask } from './models/TickTickTask';
import { TickTickLogin } from './models/TickTickUser';
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

    const result = await axios.post(url, options, {
      headers: { "Content-Type": "application/json" },
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

  public async createTask(task: TickTickTask): Promise<any> {
    console.log(task);
    const url = "batch/task";
    const body = {
      add: [
        task
      ],
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
