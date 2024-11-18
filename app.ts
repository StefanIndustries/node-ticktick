import {TickTickClient} from "./src/TickTickClient";


async function main() {
    const username = process.env.TICKTICK_USERNAME!;
    const password = process.env.TICKTICK_PASSWORD!;
    const ticktickClient = new TickTickClient(username, password);
    const tasks = await ticktickClient.getTasks();
    console.log(tasks);
}

main().then(() => {
    console.log('program done');
})