import { createApp, onMounted, ref } from "vue/dist/vue.esm-bundler.js";
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { TaskmasterWireHttp } from "../generated/wire.ts";
import { dummyTasks } from "../src/dummy-tasks.ts";

const client = createHttpClient<TaskmasterWireHttp>({ baseUrl: "/api" });
createApp({
  setup() {
    const username = ref("");
    const password = ref("");
    const currentUser = ref<string | null>(null);
    const registering = ref(false);
    const busy = ref(true);
    const error = ref("");
    const activeTasks = ref<string[]>([]);
    const completedTasks = ref<string[]>([]);
    const sampleTask = ref<string>(dummyTasks[0]);
    const tasksLoading = ref(false);
    const taskMessage = ref("");
    const tasksLoaded = ref(false);

    function taskError(code: string) {
      if (code === "UNAUTHORIZED") {
        currentUser.value = null;
        activeTasks.value = []; completedTasks.value = [];
        tasksLoaded.value = false;
        error.value = "Your session expired. Please log in again.";
      } else if (code === "NOT_FOUND") {
        error.value = "That task is no longer active. Your list has been refreshed.";
      } else error.value = "Could not update your tasks. Please try again.";
    }
    async function loadTasks() {
      tasksLoading.value = true;
      try {
        const result = await client.tasklists.view({});
        if ("error" in result) { tasksLoaded.value = false; taskError(result.error); return; }
        activeTasks.value = result.list.taskList.activeTasks;
        completedTasks.value = result.list.taskList.completedTasks;
        tasksLoaded.value = true;
      } finally { tasksLoading.value = false; }
    }
    async function changeTask(action: "add" | "delete" | "complete", task: string) {
      busy.value = true; error.value = ""; taskMessage.value = "";
      try {
        const result = await client.tasklists[action]({ task });
        if ("error" in result) {
          taskError(result.error);
          if (result.error === "NOT_FOUND") await loadTasks();
          return;
        }
        taskMessage.value = action === "add" ? "Sample task added (already listed tasks stay unchanged)." : action === "delete" ? "Task deleted." : "Task completed.";
        await loadTasks();
      } finally { busy.value = false; }
    }
    const messages: Record<string, string> = {
      UNAUTHORIZED: "The username or password is incorrect.",
      CONFLICT: "That username is already registered. Try logging in.",
      INVALID_REQUEST: "Use a username of 3–32 letters, numbers, underscores, or hyphens, and a password of 8–128 characters.",
      NETWORK_ERROR: "Could not connect. Please try again.",
    };
    async function submit() {
      busy.value = true;
      error.value = "";
      try {
        const credentials = { username: username.value, password: password.value };
        const result = registering.value
          ? await client.auth.register(credentials)
          : await client.auth["sign-in"](credentials);
        if ("error" in result) error.value = messages[result.error] ?? "Could not sign in. Please try again.";
        else { currentUser.value = result.account; password.value = ""; await loadTasks(); }
      } finally { busy.value = false; }
    }
    async function logout() {
      busy.value = true;
      error.value = "";
      try {
        const result = await client.auth["sign-out"]({});
        if ("error" in result && result.error !== "UNAUTHORIZED") {
          error.value = "Could not log out. Please try again.";
        } else {
          currentUser.value = null; password.value = "";
          activeTasks.value = []; completedTasks.value = []; taskMessage.value = ""; tasksLoaded.value = false;
        }
      } finally { busy.value = false; }
    }
    function toggle() { registering.value = !registering.value; error.value = ""; password.value = ""; }
    onMounted(async () => {
      try {
        const result = await client.auth.current({});
        if (!("error" in result)) { currentUser.value = result.username; await loadTasks(); }
        else if (result.error !== "UNAUTHORIZED") error.value = "Could not check your session. Please try again.";
      } finally { busy.value = false; }
    });
    return { username, password, currentUser, registering, busy, error, submit, logout, toggle,
      activeTasks, completedTasks, sampleTask, dummyTasks, tasksLoading, tasksLoaded, taskMessage, loadTasks, changeTask };
  },
  template: `
    <main>
      <h1>Taskmaster</h1>
      <template v-if="currentUser">
        <p role="status">You’re logged in as <strong>{{ currentUser }}</strong>.</p>
        <button :disabled="busy" @click="logout">Log out</button>
        <section aria-label="Your tasks">
          <h2>Your tasks</h2>
          <p class="hint">These sample tasks stand in for real task records for now.</p>
          <form @submit.prevent="changeTask('add', sampleTask)">
            <label for="sample-task">Sample task</label>
            <select id="sample-task" v-model="sampleTask" :disabled="busy || tasksLoading">
              <option v-for="task in dummyTasks" :key="task" :value="task">{{ task }}</option>
            </select>
            <button type="submit" :disabled="busy || tasksLoading">Add sample task</button>
          </form>
          <p v-if="tasksLoading" role="status">Loading tasks…</p>
          <template v-else-if="tasksLoaded">
            <h3>Active ({{ activeTasks.length }})</h3>
            <p v-if="!activeTasks.length" class="hint">No active tasks. Add a sample task above.</p>
            <ul class="tasks">
              <li v-for="task in activeTasks" :key="task">
                <span>{{ task }}</span>
                <div class="actions">
                  <button :disabled="busy" :aria-label="'Complete ' + task" @click="changeTask('complete', task)">Complete</button>
                  <button class="delete" :disabled="busy" :aria-label="'Delete ' + task" @click="changeTask('delete', task)">Delete</button>
                </div>
              </li>
            </ul>
            <h3>Completed ({{ completedTasks.length }})</h3>
            <p v-if="!completedTasks.length" class="hint">No completed tasks yet.</p>
            <ul class="tasks completed"><li v-for="task in completedTasks" :key="task">{{ task }}</li></ul>
          </template>
          <button class="link" :disabled="busy || tasksLoading" @click="loadTasks">Refresh tasks</button>
          <p v-if="taskMessage" role="status">{{ taskMessage }}</p>
        </section>
      </template>
      <template v-else>
        <h2>{{ registering ? 'Create an account' : 'Log in' }}</h2>
        <form @submit.prevent="submit">
          <fieldset :disabled="busy">
            <label for="username">Username</label>
            <input id="username" v-model="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_-]{3,32}" autocapitalize="none" spellcheck="false">
            <label for="password">Password</label>
            <input id="password" v-model="password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" required minlength="8" maxlength="128">
            <p v-if="registering" class="hint">Username: 3–32 letters, numbers, underscores, or hyphens. Password: 8–128 characters.</p>
            <button type="submit">{{ busy ? 'Please wait…' : registering ? 'Create account' : 'Log in' }}</button>
          </fieldset>
        </form>
        <button class="link" :disabled="busy" @click="toggle">{{ registering ? 'Already have an account? Log in' : 'New here? Create an account' }}</button>
      </template>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
    </main>`,
}).mount("#app");
