import { TickTickTask } from "./TickTickTask";

export interface AddTask extends Partial<TickTickTask> {
    title: string,
    projectId: string
}