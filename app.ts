import {TickTickClient} from "./src/TickTickClient";


async function main() {
    const username = process.env.TICKTICK_USERNAME!;
    const password = process.env.TICKTICK_PASSWORD!;
    const ticktickClient = new TickTickClient(username, password);
    await ticktickClient.login();
    const tasks = await ticktickClient.getTasks();

    await ticktickClient.createTask({title: 'test vanuit nodejs', projectId: 'inbox117452138'});
    // console.log(tasks);
}

main().then(() => {
    console.log('program done');
})