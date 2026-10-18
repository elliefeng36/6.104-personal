// Vue interface using the generated, typed API client.
import { createApp, onMounted, reactive, ref } from "vue/dist/vue.esm-bundler.js";
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { TaskmasterWireHttp } from "../generated/wire.ts";
type Task = TaskmasterWireHttp["/tasklists/view"]["output"]["list"]["activeTasks"][number]["details"];
type TaskChanges = TaskmasterWireHttp["/tasks/update"]["input"]["changes"];

const client = createHttpClient<TaskmasterWireHttp>({ baseUrl: "/api" });
const localTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
createApp({
  setup() {
    const username = ref(""); const password = ref("");
    const currentUser = ref<string | null>(null);
    const registering = ref(false); const busy = ref(true); const error = ref("");
    const activeTasks = ref<Task[]>([]); const completedTasks = ref<Task[]>([]);
    const tasksLoading = ref(false); const tasksLoaded = ref(false); const taskMessage = ref("");
    const editing = ref<Task | null>(null);
    const draft = reactive({ name: "", deadline: "", duration: "", recurringPeriod: "" });
    const timeLimit = ref("");
    const suggestion = ref<Task | null>(null);
    const suggestionMessage = ref("");
    const suggestionError = ref("");
    function clearSuggestion() { suggestion.value = null; suggestionMessage.value = ""; suggestionError.value = ""; }
    async function suggestTask() {
      clearSuggestion();
      const raw = String(timeLimit.value).trim();
      const minutes = raw === "" ? null : Number(raw);
      if (minutes !== null && (!Number.isFinite(minutes) || minutes < 0)) {
        suggestionError.value = "Enter a nonnegative number of minutes, or leave it blank for no limit.";
        return;
      }
      busy.value = true;
      try {
        const result = await client.taskSuggestions.makeRequest({ timeLimit: minutes });
        if ("error" in result) {
          if (result.error === "UNAUTHORIZED") taskError(result.error);
          else suggestionError.value = result.error === "INVALID_REQUEST"
            ? "Enter a nonnegative number of minutes, or leave it blank for no limit."
            : "Could not suggest a task. Please try again.";
          return;
        }
        await loadTasks();
        const selected = result.suggestion;
        if (selected.outcome === "EMPTY_TASKLIST") suggestionMessage.value = "No active tasks to suggest. Create a task first.";
        else if (selected.outcome === "NO_VIABLE_TASKS") suggestionMessage.value = "No tasks fit this time limit. Try more time or remove the limit.";
        else {
          suggestion.value = activeTasks.value.find(task => task.task === selected.task) ?? null;
          if (!suggestion.value) suggestionMessage.value = "That task changed while loading. Ask for another suggestion.";
        }
      } catch { suggestionError.value = "Could not suggest a task. Please try again."; }
      finally { busy.value = false; }
    }
    function resetForm() {
      editing.value = null;
      Object.assign(draft, { name: "", deadline: "", duration: "", recurringPeriod: "" });
    }
    function editTask(task: Task) {
      clearSuggestion();
      editing.value = task; error.value = ""; taskMessage.value = "";
      Object.assign(draft, { name: task.name, deadline: localTime(task.deadline),
        duration: task.duration?.toString() ?? "", recurringPeriod: task.recurringPeriod?.toString() ?? "" });
      document.getElementById("task-name")?.focus();
    }
    function taskError(code: string) {
      if (code === "UNAUTHORIZED") {
        clearSuggestion();
        currentUser.value = null; activeTasks.value = []; completedTasks.value = []; tasksLoaded.value = false; resetForm();
        error.value = "Your session expired. Please log in again.";
      } else if (code === "NOT_FOUND") error.value = "That task is unavailable or is no longer active. Refresh your tasks.";
      else if (code === "INVALID_REQUEST") error.value = "Check the task fields: name is required, a new deadline must be in the future, duration must be nonnegative, and recurring period must be positive.";
      else error.value = "Could not update your tasks. Please try again.";
    }
    async function loadTasks() {
      tasksLoading.value = true;
      try {
        const result = await client.tasklists.view({});
        if ("error" in result) { tasksLoaded.value = false; taskError(result.error); return; }
        activeTasks.value = result.list.activeTasks.map(row => row.details);
        completedTasks.value = result.list.completedTasks.map(row => row.details);
        tasksLoaded.value = true;
      } finally { tasksLoading.value = false; }
    }
    async function saveTask() {
      clearSuggestion();
      busy.value = true; error.value = ""; taskMessage.value = "";
      try {
        const original = editing.value;
        let result;
        if (original) {
          // Send only changed fields; null clears an optional value.
          const changes: TaskChanges = {};
          if (draft.name !== original.name) changes.name = draft.name;
          if (draft.deadline !== localTime(original.deadline)) changes.deadline = draft.deadline ? new Date(draft.deadline).toISOString() : null;
          if (draft.duration !== (original.duration?.toString() ?? "")) changes.duration = draft.duration === "" ? null : Number(draft.duration);
          if (draft.recurringPeriod !== (original.recurringPeriod?.toString() ?? "")) changes.recurringPeriod = draft.recurringPeriod === "" ? null : Number(draft.recurringPeriod);
          if (!Object.keys(changes).length) { resetForm(); taskMessage.value = "No changes to save."; return; }
          result = await client.tasks.update({ task: original.task, changes });
        } else {
          result = await client.tasks.make({ name: draft.name,
            ...(draft.deadline ? { deadline: new Date(draft.deadline).toISOString() } : {}),
            ...(draft.duration !== "" ? { duration: Number(draft.duration) } : {}),
            ...(draft.recurringPeriod !== "" ? { recurringPeriod: Number(draft.recurringPeriod) } : {}),
          });
        }
        if ("error" in result) { taskError(result.error); return; }
        resetForm(); taskMessage.value = original ? "Task updated." : "Task created.";
        await loadTasks();
      } catch { error.value = "Could not save the task. Check the fields and try again."; }
      finally { busy.value = false; }
    }
    async function changeTask(action: "delete" | "complete", task: string) {
      clearSuggestion();
      busy.value = true; error.value = ""; taskMessage.value = "";
      try {
        const result = await client.tasklists[action]({ task });
        if ("error" in result) { taskError(result.error); if (result.error === "NOT_FOUND") await loadTasks(); return; }
        if (editing.value?.task === task) resetForm();
        taskMessage.value = action === "delete" ? "Task deleted." : "Task completed.";
        await loadTasks();
      } finally { busy.value = false; }
    }
    async function submit() {
      busy.value = true; error.value = "";
      try {
        const credentials = { username: username.value, password: password.value };
        const result = registering.value ? await client.auth.register(credentials) : await client.auth["sign-in"](credentials);
        if ("error" in result) error.value = result.error === "UNAUTHORIZED" ? "The username or password is incorrect." : result.error === "CONFLICT" ? "That username is already registered." : "Could not sign in. Check your username and password and try again.";
        else { currentUser.value = result.account; password.value = ""; await loadTasks(); }
      } finally { busy.value = false; }
    }
    async function logout() {
      busy.value = true; error.value = "";
      try {
        const result = await client.auth["sign-out"]({});
        if ("error" in result && result.error !== "UNAUTHORIZED") error.value = "Could not log out. Please try again.";
        else { currentUser.value = null; password.value = ""; activeTasks.value = []; completedTasks.value = []; tasksLoaded.value = false; taskMessage.value = ""; resetForm(); clearSuggestion(); }
      } finally { busy.value = false; }
    }
    function toggle() { registering.value = !registering.value; error.value = ""; password.value = ""; }
    const deadlineText = (deadline: string) => new Date(deadline).toLocaleString();
    onMounted(async () => {
      try {
        const result = await client.auth.current({});
        if (!("error" in result)) { currentUser.value = result.username; await loadTasks(); }
        else if (result.error !== "UNAUTHORIZED") error.value = "Could not check your session. Please try again.";
      } finally { busy.value = false; }
    });
    return { username, password, currentUser, registering, busy, error, submit, logout, toggle,
      activeTasks, completedTasks, tasksLoading, tasksLoaded, taskMessage, loadTasks, changeTask,
      editing, draft, resetForm, editTask, saveTask, deadlineText,
      timeLimit, suggestion, suggestionMessage, suggestionError, suggestTask, clearSuggestion };
  },
  template: `
    <main>
      <h1>Taskmaster</h1>
      <template v-if="currentUser">
        <p>You’re logged in as <strong>{{ currentUser }}</strong>.</p>
        <button :disabled="busy" @click="logout">Log out</button>
        <section aria-label="Task suggestion">
          <h2>What should I do next?</h2>
          <form @submit.prevent="suggestTask">
            <label for="suggestion-time">Time available in minutes (optional)</label>
            <input id="suggestion-time" v-model="timeLimit" type="text" inputmode="decimal" :disabled="busy || tasksLoading" @input="clearSuggestion">
            <p class="hint">Leave blank for no limit. Missing duration estimates count as 0 minutes. Earlier deadlines come first.</p>
            <button type="submit" :disabled="busy || tasksLoading">Suggest a task</button>
            <p v-if="suggestionError" role="alert" class="error">{{ suggestionError }}</p>
          </form>
          <p v-if="suggestionMessage" role="status">{{ suggestionMessage }}</p>
          <div v-if="suggestion" role="status" class="suggestion">
            <strong>Suggested: {{ suggestion.name }}</strong>
            <div v-if="suggestion.hasDeadline">Due: {{ deadlineText(suggestion.deadline) }}</div>
            <div v-if="suggestion.duration !== undefined">Estimated duration: {{ suggestion.duration }} minutes</div>
            <button class="link" :disabled="busy" @click="editTask(suggestion)">Edit suggested task</button>
          </div>
        </section>
        <section aria-label="Your tasks">
          <h2>{{ editing ? 'Edit task' : 'New task' }}</h2>
          <form @submit.prevent="saveTask">
            <fieldset :disabled="busy || tasksLoading">
              <label for="task-name">Task name</label>
              <input id="task-name" v-model="draft.name" required maxlength="200">
              <label for="task-deadline">Deadline (optional)</label>
              <input id="task-deadline" v-model="draft.deadline" type="datetime-local">
              <label for="task-duration">Estimated duration in minutes (optional)</label>
              <input id="task-duration" v-model="draft.duration" type="number" min="0" step="any">
              <label for="task-recurrence">Repeat every how many days? (optional)</label>
              <input id="task-recurrence" v-model="draft.recurringPeriod" type="number" min="0.000001" step="any">
              <p class="hint">Leave optional fields blank to omit or clear them. Repeating tasks are not automatically regenerated yet.</p>
              <button type="submit">{{ busy ? 'Please wait…' : editing ? 'Save changes' : 'Create task' }}</button>
              <p v-if="error" role="alert" class="error">{{ error }}</p>
              <button v-if="editing" class="link" type="button" @click="resetForm">Cancel editing</button>
            </fieldset>
          </form>
          <p v-if="tasksLoading" role="status">Loading tasks…</p>
          <template v-else-if="tasksLoaded">
            <h3>Active ({{ activeTasks.length }})</h3>
            <p v-if="!activeTasks.length" class="hint">No active tasks. Create a task above.</p>
            <ul class="tasks">
              <li v-for="task in activeTasks" :key="task.task">
                <strong>{{ task.name }}</strong>
                <div class="hint">
                  <div v-if="task.hasDeadline">Due: {{ deadlineText(task.deadline) }}</div>
                  <div v-if="task.duration !== undefined">Estimated duration: {{ task.duration }} minutes</div>
                  <div v-if="task.isRecurring">Repeats every {{ task.recurringPeriod }} days</div>
                </div>
                <div class="actions">
                  <button :disabled="busy || tasksLoading" :aria-label="'Edit ' + task.name" @click="editTask(task)">Edit</button>
                  <button :disabled="busy || tasksLoading" :aria-label="'Complete ' + task.name" @click="changeTask('complete', task.task)">Complete</button>
                  <button class="delete" :disabled="busy || tasksLoading" :aria-label="'Delete ' + task.name" @click="changeTask('delete', task.task)">Delete</button>
                </div>
              </li>
            </ul>
            <h3>Completed ({{ completedTasks.length }})</h3>
            <p v-if="!completedTasks.length" class="hint">No completed tasks yet.</p>
            <ul class="tasks"><li v-for="task in completedTasks" :key="task.task">
              <span class="completed">{{ task.name }}</span>
              <div class="hint">
                <div v-if="task.hasDeadline">Due: {{ deadlineText(task.deadline) }}</div>
                <div v-if="task.duration !== undefined">Estimated duration: {{ task.duration }} minutes</div>
                <div v-if="task.isRecurring">Repeats every {{ task.recurringPeriod }} days</div>
              </div>
              <button :disabled="busy || tasksLoading" :aria-label="'Edit ' + task.name" @click="editTask(task)">Edit</button>
            </li></ul>
          </template>
          <button class="link" :disabled="busy || tasksLoading" @click="clearSuggestion(); loadTasks()">Refresh tasks</button>
          <p v-if="taskMessage" role="status">{{ taskMessage }}</p>
        </section>
      </template>
      <template v-else>
        <h2>{{ registering ? 'Create an account' : 'Log in' }}</h2>
        <form @submit.prevent="submit"><fieldset :disabled="busy">
          <label for="username">Username</label>
          <input id="username" v-model="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_-]{3,32}" autocapitalize="none" spellcheck="false">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" required minlength="8" maxlength="128">
          <p v-if="registering" class="hint">Username: 3–32 letters, numbers, underscores, or hyphens. Password: 8–128 characters.</p>
          <button type="submit">{{ busy ? 'Please wait…' : registering ? 'Create account' : 'Log in' }}</button>
        </fieldset></form>
        <button class="link" :disabled="busy" @click="toggle">{{ registering ? 'Already have an account? Log in' : 'New here? Create an account' }}</button>
      </template>
      <p v-if="error && !currentUser" role="alert" class="error">{{ error }}</p>
    </main>`,
}).mount("#app");
