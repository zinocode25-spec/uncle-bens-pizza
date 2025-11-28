import { fetchData, deleteItem, updateStatus, applyFilters } from "./dataService.js";
import {
  getConfirmModal,
  getHoverPreview,
  renderFilterButtons,
  fadeTableRow,
  showToast,
} from "./uiComponents.js";

const CONTACT_TABLE = "contact_messages";
const CONTACT_STATUSES = ["pending", "viewed", "resolved"];

const state = {
  all: [],
  filter: "all",
};

const tableBody = document.querySelector("[data-contact-table]");
const filterContainer = document.querySelector("[data-contact-filters]");

const confirmModal = getConfirmModal();
const hoverPreview = getHoverPreview();

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "viewed", label: "Viewed" },
  { id: "resolved", label: "Resolved" },
];

export async function loadContactMessages() {
  try {
    const data = await fetchData(CONTACT_TABLE, {
      orderBy: { column: "created_at", ascending: false },
    });
    state.all = data;
    filterContactMessages(state.filter);
    renderFilterButtons(filterContainer, FILTERS, state.filter, filterContactMessages);
  } catch (error) {
    renderEmptyState(error.message);
    showToast("Failed to load contact messages.", "error");
  }
}

export async function updateContactMessageStatus(id, newStatus) {
  try {
    await updateStatus(CONTACT_TABLE, id, { status: newStatus });
    showToast(`Status moved to ${newStatus}.`, "success");
    await loadContactMessages();
  } catch (error) {
    showToast("Unable to change status.", "error");
  }
}

export async function deleteContactMessage(id) {
  const shouldDelete = await confirmModal.open({
    title: "Delete Message",
    message: "This message will be permanently removed from Supabase.",
  });
  if (!shouldDelete) return;

  try {
    await deleteItem(CONTACT_TABLE, id);
    showToast("Message deleted.", "success");
    await loadContactMessages();
  } catch (error) {
    showToast("Failed to delete message.", "error");
  }
}

export function filterContactMessages(filterType = "all") {
  state.filter = filterType;
  const filtered = applyFilters(state.all, (message) =>
    filterType === "all" ? true : (message.status || "pending") === filterType
  );
  renderContactRows(filtered);
  renderFilterButtons(filterContainer, FILTERS, state.filter, filterContactMessages);
}

export function tooltipHoverPreview(messageText = "") {
  return `
    <div class="space-y-1">
      <p class="text-xs uppercase tracking-[0.2em] text-white/60">Full message</p>
      <p class="text-sm leading-relaxed whitespace-pre-wrap">${messageText || "No content"}</p>
    </div>
  `;
}

function renderContactRows(messages) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (!messages.length) {
    renderEmptyState("No messages match this filter.");
    return;
  }

  messages.forEach((message) => {
    const row = document.createElement("tr");
    row.className =
      "border-b border-white/5 hover:bg-white/5 transition text-sm text-white/80";
    row.dataset.rowId = message.id;
    row.innerHTML = `
      <td class="py-4 px-3 font-semibold text-white">${message.name}</td>
      <td class="py-4 px-3 text-white/70">${message.email}</td>
      <td class="py-4 px-3">${message.subject || "—"}</td>
      <td class="py-4 px-3 max-w-xs truncate" data-message-cell>${message.message || "—"}</td>
      <td class="py-4 px-3 text-white/60">${formatTimestamp(message.created_at)}</td>
      <td class="py-4 px-3">
        ${renderStatusSelect(message)}
      </td>
      <td class="py-4 px-3 text-right">
        <button data-delete-contact="${message.id}" class="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 transition">
          Delete
        </button>
      </td>
    `;

    tableBody.appendChild(row);

    const messageCell = row.querySelector("[data-message-cell]");
    hoverPreview.bind(messageCell, () => tooltipHoverPreview(message.message));

    row.querySelector("select").addEventListener("change", (event) => {
      updateContactMessageStatus(message.id, event.target.value);
    });

    row.querySelector("[data-delete-contact]").addEventListener("click", () => {
      deleteContactMessage(message.id);
    });
  });
}

function renderStatusSelect(message) {
  const current = message.status || "pending";
  const options = CONTACT_STATUSES.map(
    (status) =>
      `<option value="${status}" ${status === current ? "selected" : ""}>${
        status.charAt(0).toUpperCase() + status.slice(1)
      }</option>`
  ).join("");

  return `
    <select
      class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
    >
      ${options}
    </select>
  `;
}

function renderEmptyState(message) {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="py-10 text-center text-white/60 text-sm">${message}</td>
    </tr>
  `;
}

function formatTimestamp(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

