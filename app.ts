import {TickTickClient} from "./src/TickTickClient";


async function main() {
    const username = process.env.TICKTICK_USERNAME!;
    const password = process.env.TICKTICK_PASSWORD!;

    console.log('username', username);
    console.log('password', password);

    const ticktickClient = new TickTickClient(username, password);
    const loginResult = await ticktickClient.login();

    console.log(loginResult);

    const tasks = await ticktickClient.getTasks("2026-02-02", "2026-02-02");

    await ticktickClient.createTask({title: 'test vanuit nodejs', projectId: loginResult.inboxId});
    console.log(tasks);
}

main().then(() => {
    console.log('program done');
})