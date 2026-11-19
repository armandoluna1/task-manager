"use strict";

const byId = id => document.getElementById(id);
const storageKey = "daylist.tasks.v1";
let tasks = [];
let editing = null;
let view = "all";

function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

function matches(task, day) {
  if (view === "active" && task.done || view === "completed" && !task.done) return false;
  switch (byId("dates").value) {
    case "today": return task.due === day;
    case "overdue": return !task.done && task.due && task.due < day;
    case "upcoming": return task.due > day;
    case "none": return !task.due;
    default: return true;
  }
}

function store(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    byId("warning").textContent = "";
  } catch {
    byId("warning").textContent = "Browser storage is unavailable. Your changes will last for this session only.";
  }
  byId("message").textContent = message;
  render();
}

function clearForm() {
  editing = null;
  byId("entry").reset();
  byId("save").textContent = "Add task";
  byId("cancel").hidden = true;
}

function button(label, handler) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  node.onclick = handler;
  return node;
}

function taskRow(task, day) {
  const row = document.createElement("li");
  row.className = task.done ? "row done" : "row";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = task.done;
  check.setAttribute("aria-label", "Mark " + task.name + (task.done ? " active" : " complete"));
  check.onchange = () => {
    task.done = check.checked;
    store(task.done ? "Task completed." : "Task marked active.");
  };

  const details = document.createElement("div");
  details.className = "details";
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = task.name;
  details.append(title);
  if (task.due) {
    const date = document.createElement("time");
    date.dateTime = task.due;
    const late = !task.done && task.due < day;
    date.className = late ? "date late" : "date";
    const formatted = new Date(task.due + "T12:00:00").toLocaleDateString(undefined, {dateStyle: "medium"});
    date.textContent = (late ? "Overdue · " : "Due ") + formatted;
    details.append(date);
  }
  const controls = document.createElement("div");
  controls.className = "controls";
  const edit = button("Edit", () => {
    editing = task.id;
    byId("name").value = task.name;
    byId("due").value = task.due;
    byId("save").textContent = "Save changes";
    byId("cancel").hidden = false;
    byId("name").focus();
  });
  const remove = button("Delete", () => {
    tasks = tasks.filter(item => item.id !== task.id);
    if (editing === task.id) clearForm();
    store("Task deleted.");
  });
  remove.className = "remove";
  controls.append(edit, remove);
  row.append(check, details, controls);
  return row;
}

function render() {
  const day = localDate();
  byId("today").textContent = new Date().toLocaleDateString(undefined, {month: "short", day: "numeric", weekday: "long"});
  const visible = tasks.filter(task => matches(task, day));
  byId("list").replaceChildren(...visible.map(task => taskRow(task, day)));
  byId("empty").textContent = visible.length ? "" : tasks.length ?
    "No tasks match these filters." : "Your list is empty. Add your first task above.";
  for (const tab of byId("tabs").querySelectorAll("button")) {
    tab.setAttribute("aria-pressed", tab.dataset.view === view);
  }
}

byId("entry").onsubmit = event => {
  event.preventDefault();
  const name = byId("name").value.trim();
  if (!name) {
    byId("message").textContent = "Enter a task name.";
    byId("name").focus();
    return;
  }
  const due = byId("due").value;
  const task = tasks.find(item => item.id === editing);
  if (task) {
    task.name = name;
    task.due = due;
  } else {
    tasks.push({id: crypto.randomUUID(), name, due, done: false});
    view = "all";
    byId("dates").value = "all";
  }
  clearForm();
  store(task ? "Changes saved." : "Task added.");
  byId("name").focus();
};
byId("cancel").onclick = () => { clearForm(); byId("name").focus(); };
for (const tab of byId("tabs").querySelectorAll("button")) {
  tab.onclick = () => { view = tab.dataset.view; render(); };
}
byId("dates").onchange = render;
window.addEventListener("focus", render);
try {
  tasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (!Array.isArray(tasks)) throw new Error("Invalid task list");
} catch {
  tasks = [];
  byId("warning").textContent = "Your saved tasks could not be loaded.";
}
render();
