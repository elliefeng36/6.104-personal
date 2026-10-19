// Vue interface using the generated, typed API client.
import { createApp, nextTick, onMounted, onUnmounted, reactive, ref } from "vue/dist/vue.esm-bundler.js";
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
    const sortBy = ref("none"); const recurringFilter = ref("all"); const maximumDuration = ref("");
    const listError = ref("");
    let listRequest = 0;
    const tasksLoading = ref(false); const tasksLoaded = ref(false); const taskMessage = ref("");
    const editing = ref<Task | null>(null);
    const pendingDelete = ref<Task | null>(null);
    const draft = reactive({ name: "", deadline: "", duration: "", recurringPeriod: "", repeat: "none" });
    const timeLimit = ref("");
    const suggestion = ref<Task | null>(null);
    const currentTime = ref(Date.now());
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
        const maxRaw = String(maximumDuration.value).trim();
        const maxDuration = maxRaw === "" ? null : Number(maxRaw);
        if (maxDuration !== null && (!Number.isFinite(maxDuration) || maxDuration < 0)) {
          suggestionError.value = "Enter a valid maximum duration in the task filters first."; return;
        }
        const result = await client.taskSuggestions.makeRequest({ timeLimit: minutes, recurring: recurringFilter.value, maxDuration });
        if ("error" in result) {
          if (result.error === "UNAUTHORIZED") taskError(result.error);
          else suggestionError.value = result.error === "INVALID_REQUEST"
            ? "Enter a nonnegative number of minutes, or leave it blank for no limit."
            : "Could not suggest a task. Please try again.";
          return;
        }
        await loadTasks();
        const selected = result.suggestion;
        if (selected.outcome === "EMPTY_TASKLIST") suggestionMessage.value = "No active tasks match your filters. Clear the filters or create a task.";
        else if (selected.outcome === "NO_VIABLE_TASKS") suggestionMessage.value = "No tasks fit this time limit. Try more time or remove the limit.";
        else {
          const all = await client.tasklists.view({});
          suggestion.value = "error" in all ? null : all.list.activeTasks.find(row => row.details.task === selected.task)?.details ?? null;
          if (!suggestion.value) suggestionMessage.value = "That task changed while loading. Ask for another suggestion.";
        }
      } catch { suggestionError.value = "Could not suggest a task. Please try again."; }
      finally { busy.value = false; }
    }
    function resetForm() {
      editing.value = null;
      Object.assign(draft, { name: "", deadline: "", duration: "", recurringPeriod: "", repeat: "none" });
    }
    function editTask(task: Task) {
      clearSuggestion();
      editing.value = task; error.value = ""; taskMessage.value = "";
      Object.assign(draft, { name: task.name, deadline: localTime(task.deadline),
        duration: task.duration?.toString() ?? "", recurringPeriod: task.recurringPeriod?.toString() ?? "", repeat: !task.isRecurring ? "none" : task.recurringUnit === "months" ? "monthly" : task.recurringPeriod === 1 ? "daily" : task.recurringPeriod === 7 ? "weekly" : "custom" });
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
    async function loadTasks(background = false) {
      const loadingFor = currentUser.value;
      const requestId = ++listRequest;
      const raw = String(maximumDuration.value).trim();
      const maxDuration = raw === "" ? null : Number(raw);
      if (maxDuration !== null && (!Number.isFinite(maxDuration) || maxDuration < 0)) {
        tasksLoading.value = false; listError.value = "Enter a nonnegative maximum duration, or leave it blank."; return;
      }
      listError.value = "";
      if (!background) tasksLoading.value = true;
      try {
        const options = { sortBy: sortBy.value, recurring: recurringFilter.value, maxDuration };
        const [activeResult, completedResult] = await Promise.all([
          client.taskFiltering.view({ ...options, status: "active" }),
          client.taskFiltering.view({ ...options, status: "completed" }),
        ]);
        if (currentUser.value !== loadingFor || requestId !== listRequest) return;
        if ("error" in activeResult) { tasksLoaded.value = false; taskError(activeResult.error); return; }
        if ("error" in completedResult) { tasksLoaded.value = false; taskError(completedResult.error); return; }
        const active = activeResult.tasks;
        const completed = completedResult.tasks;
        if (JSON.stringify(activeTasks.value) !== JSON.stringify(active) || JSON.stringify(completedTasks.value) !== JSON.stringify(completed)) clearSuggestion();
        if (editing.value && completed.some(task => task.task === editing.value?.task)) {
          resetForm(); error.value = "Completed tasks cannot be edited.";
        }
        activeTasks.value = active; completedTasks.value = completed;
        tasksLoaded.value = true;
      } catch { if (requestId === listRequest) listError.value = "Could not load tasks. Please try again."; }
      finally { if (requestId === listRequest) tasksLoading.value = false; }
    }
    async function saveTask() {
      clearSuggestion();
      busy.value = true; error.value = ""; taskMessage.value = "";
      try {
        const period = draft.repeat === "none" ? null : draft.repeat === "daily" || draft.repeat === "monthly" ? 1 : draft.repeat === "weekly" ? 7 : Number(draft.recurringPeriod);
        const unit = draft.repeat === "monthly" ? "months" : "days";
        const original = editing.value;
        let result;
        if (original) {
          // Send only changed fields; null clears an optional value.
          const changes: TaskChanges = {};
          if (draft.name !== original.name) changes.name = draft.name;
          if (draft.deadline !== localTime(original.deadline)) changes.deadline = draft.deadline ? new Date(draft.deadline).toISOString() : null;
          if (draft.duration !== (original.duration?.toString() ?? "")) changes.duration = draft.duration === "" ? null : Number(draft.duration);
          if (period !== (original.recurringPeriod ?? null) || (period !== null && unit !== (original.recurringUnit ?? "days"))) {
            changes.recurringPeriod = period; changes.recurringUnit = period === null ? null : unit;
          }
          if (!Object.keys(changes).length) { resetForm(); taskMessage.value = "No changes to save."; return; }
          result = await client.tasks.update({ task: original.task, changes });
        } else {
          result = await client.tasks.make({ name: draft.name,
            ...(draft.deadline ? { deadline: new Date(draft.deadline).toISOString() } : {}),
            ...(draft.duration !== "" ? { duration: Number(draft.duration) } : {}),
            ...(period !== null ? { recurringPeriod: period, recurringUnit: unit } : {}),
          });
        }
        if ("error" in result) { taskError(result.error); return; }
        resetForm(); taskMessage.value = original ? "Task updated." : "Task created.";
        await loadTasks();
      } catch { error.value = "Could not save the task. Check the fields and try again."; }
      finally { busy.value = false; }
    }
    function requestDelete(task: Task) {
      pendingDelete.value = task;
      nextTick(() => document.getElementById("cancel-delete")?.focus());
    }
    function cancelDelete() {
      const task = pendingDelete.value;
      pendingDelete.value = null;
      nextTick(() => document.getElementById(`delete-${task?.task}`)?.focus());
    }
    async function confirmDelete() {
      const task = pendingDelete.value;
      if (!task) return;
      pendingDelete.value = null;
      await changeTask("delete", task.task);
    }
    function trapDeleteFocus(event: KeyboardEvent) {
      const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>("button");
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
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
    const isOverdue = (task: Task) => task.hasDeadline && !!task.deadline && Date.parse(task.deadline) < currentTime.value;
    const deadlineText = (deadline: string) => {
      const date = new Date(deadline);
      return date.toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
        ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" as const } : {}),
      });
    };
    const recurrenceText = (task: Task) => {
      if (task.recurringUnit === "months" && task.recurringPeriod === 1) return "Monthly";
      if (task.recurringUnit !== "months" && task.recurringPeriod === 1) return "Daily";
      if (task.recurringUnit !== "months" && task.recurringPeriod === 7) return "Weekly";
      return `Every ${task.recurringPeriod} ${task.recurringUnit === "months" ? "months" : "days"}`;
    };
    onMounted(async () => {
      try {
        const result = await client.auth.current({});
        if (!("error" in result)) { currentUser.value = result.username; await loadTasks(); }
        else if (result.error !== "UNAUTHORIZED") error.value = "Could not check your session. Please try again.";
      } finally { busy.value = false; }
    });
    // Keep scheduled returns visible without disrupting an open edit form.
    let polling = false;
    const recurrencePoll = setInterval(async () => {
      currentTime.value = Date.now();
      if (!currentUser.value || busy.value || tasksLoading.value || pendingDelete.value || polling) return;
      polling = true;
      try { await loadTasks(true); } finally { polling = false; }
    }, 5000);
    onUnmounted(() => clearInterval(recurrencePoll));
    return { username, password, currentUser, registering, busy, error, submit, logout, toggle,
      sortBy, recurringFilter, maximumDuration, listError, activeTasks, completedTasks, tasksLoading, tasksLoaded, taskMessage, loadTasks, changeTask,
      pendingDelete, requestDelete, cancelDelete, confirmDelete, trapDeleteFocus, editing, draft, resetForm, editTask, saveTask, deadlineText, recurrenceText, isOverdue,
      timeLimit, suggestion, suggestionMessage, suggestionError, suggestTask, clearSuggestion };
  },
  template: `
    <main>
      <h1>Taskmaster</h1>
      <template v-if="currentUser">
        <p>You’re logged in as <strong>{{ currentUser }}</strong>.</p>
        <button :disabled="busy" @click="logout">Log out</button>
        <div v-if="pendingDelete" class="dialog-backdrop" @click.self="cancelDelete">
          <div class="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" @keydown.esc.prevent="cancelDelete" @keydown.tab="trapDeleteFocus">
            <h2 id="delete-title">Delete task?</h2>
            <p id="delete-description">Delete &quot;{{ pendingDelete.name }}&quot;? This cannot be undone.</p>
            <div class="dialog-actions">
              <button id="cancel-delete" type="button" @click="cancelDelete">Cancel</button>
              <button class="delete" type="button" @click="confirmDelete">Delete task</button>
            </div>
          </div>
        </div>
        <section aria-label="Task suggestion" class="compact-suggestion">
          <form @submit.prevent="suggestTask" class="suggestion-row">
            <h2>Suggestion</h2>
            <label for="suggestion-time" class="sr-only">Time available in minutes (optional)</label>
            <input id="suggestion-time" v-model="timeLimit" type="text" inputmode="decimal" placeholder="Minutes (any)" :disabled="busy || tasksLoading" @input="clearSuggestion">
            <button type="submit" :disabled="busy || tasksLoading">Suggest</button>
          </form>
          <div class="suggestion-result" :class="{ overdue: suggestion && isOverdue(suggestion) }" aria-live="polite">
            <span v-if="suggestionError" role="alert" class="error">{{ suggestionError }}</span>
            <span v-else-if="suggestionMessage">{{ suggestionMessage }}</span>
            <template v-else-if="suggestion">
              <strong>{{ suggestion.name }}<span v-if="isOverdue(suggestion)"> (overdue)</span></strong>
              <button class="suggestion-complete" :disabled="busy || tasksLoading" :aria-label="'Complete suggested task ' + suggestion.name" @click="changeTask('complete', suggestion.task)">Complete</button>
              <button class="link" :disabled="busy" @click="editTask(suggestion)">Edit</button>
            </template>
            <span v-else class="hint">No suggestion yet.</span>
          </div>
        </section>
        <section aria-label="Your tasks">
          <h2>{{ editing ? 'Edit task' : 'New task' }}</h2>
          <form @submit.prevent="saveTask">
            <fieldset :disabled="busy || tasksLoading">
              <label for="task-name" class="sr-only">Task name</label>
              <input id="task-name" v-model="draft.name" placeholder="Task name" required maxlength="200" :aria-expanded="!!editing || !!draft.name.trim()" aria-controls="task-details">
              <div v-if="editing || draft.name.trim()" id="task-details">
                <div class="task-fields">
                  <div>
                    <label for="task-deadline">Deadline (optional)</label>
                    <input id="task-deadline" v-model="draft.deadline" type="datetime-local">
                  </div>
                  <div>
                    <label for="task-duration">Duration (minutes)</label>
                    <input id="task-duration" v-model="draft.duration" type="number" min="0" step="any" placeholder="Optional">
                  </div>
                  <div>
                    <label for="task-recurrence">Repeat</label>
                    <select id="task-recurrence" v-model="draft.repeat"><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="custom">Custom</option></select>
                  </div>
                  <div v-if="draft.repeat === 'custom'">
                    <label for="custom-days">Repeat every (days)</label>
                    <input id="custom-days" v-model="draft.recurringPeriod" type="number" min="0.000001" step="any" required>
                  </div>
                </div>
                <button type="submit">{{ busy ? 'Please wait...' : editing ? 'Save changes' : 'Create task' }}</button>
                <p v-if="error" role="alert" class="error">{{ error }}</p>
                <button v-if="editing" class="link" type="button" @click="resetForm">Cancel editing</button>
              </div>
              <p v-if="error && !editing && !draft.name.trim()" role="alert" class="error">{{ error }}</p>
            </fieldset>
          </form>
          <form @submit.prevent="clearSuggestion(); loadTasks()" aria-label="Sort and filter tasks" class="filter-bar">
            <div class="filter-row">
              <label for="sort-tasks" class="sr-only">Sort by</label>
              <select id="sort-tasks" v-model="sortBy" @change="clearSuggestion(); loadTasks()" :disabled="busy">
                <option value="none">Added order</option><option value="deadline">Due date</option><option value="duration">Duration</option>
              </select>
              <label for="filter-recurring" class="sr-only">Recurring tasks</label>
              <select id="filter-recurring" v-model="recurringFilter" @change="clearSuggestion(); loadTasks()" :disabled="busy">
                <option value="all">All tasks</option><option value="recurring">Recurring only</option><option value="nonrecurring">Nonrecurring only</option>
              </select>
              <label for="filter-duration" class="sr-only">Maximum duration in minutes (optional)</label>
              <input id="filter-duration" v-model="maximumDuration" @input="clearSuggestion" type="number" min="0" step="any" placeholder="Max min" :disabled="busy">
              <button type="submit" :disabled="busy">Apply</button>
            </div>
            <p v-if="listError" role="alert" class="error">{{ listError }}</p>
          </form>
          <p v-if="tasksLoading" role="status">Loading tasks…</p>
          <template v-else-if="tasksLoaded">
            <h3>Active ({{ activeTasks.length }})</h3>
            <p v-if="!activeTasks.length" class="hint">No active tasks match these filters.</p>
            <ul class="tasks">
              <li v-for="task in activeTasks" :key="task.task" :class="{ overdue: isOverdue(task) }">
                <div class="task-row">
                  <strong>{{ task.name }}</strong>
                  <div class="actions">
                    <button :disabled="busy || tasksLoading" :aria-label="'Complete ' + task.name" @click="changeTask('complete', task.task)">Complete</button>
                    <button :disabled="busy || tasksLoading" :aria-label="'Edit ' + task.name" @click="editTask(task)">Edit</button>
                    <button class="delete" :id="'delete-' + task.task" :disabled="busy || tasksLoading" :aria-label="'Delete ' + task.name" @click="requestDelete(task)">Delete</button>
                  </div>
                </div>
                <div v-if="task.hasDeadline || task.duration !== undefined || task.isRecurring" class="hint task-meta">
                  <span v-if="task.hasDeadline"><span v-if="isOverdue(task)" class="overdue-label">Overdue: </span><template v-else>Due </template>{{ deadlineText(task.deadline) }}</span>
                  <span v-if="task.duration !== undefined">{{ task.duration }} min</span>
                  <span v-if="task.isRecurring">{{ recurrenceText(task) }}</span>
                </div>
              </li>
            </ul>
            <h3>Completed ({{ completedTasks.length }})</h3>
            <p v-if="!completedTasks.length" class="hint">No completed tasks match these filters.</p>
            <ul class="tasks"><li v-for="task in completedTasks" :key="task.task">
              <span class="completed">{{ task.name }}</span>
              <div v-if="task.hasDeadline || task.duration !== undefined || task.isRecurring || task.nextOccurrenceAt" class="hint task-meta">
                <span v-if="task.hasDeadline">Due {{ deadlineText(task.deadline) }}</span>
                <span v-if="task.duration !== undefined">{{ task.duration }} min</span>
                <span v-if="task.isRecurring">{{ recurrenceText(task) }}</span>
                <span v-if="task.nextOccurrenceAt">Returns {{ deadlineText(task.nextOccurrenceAt) }}</span>
              </div>
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
