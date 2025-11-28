import { fetchData, deleteItem, updateStatus, applyFilters } from "./dataService.js";
import { getConfirmModal, renderFilterButtons, showToast } from "./uiComponents.js";

const RESERVATIONS_TABLE = "reservations";
const RESERVATION_STATUSES = ["pending", "approved", "declined", "completed"];

const state = {
  all: [],
  filter: "all",
};

const filterMap = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "completed", label: "Completed" },
  { id: "declined", label: "Declined" },
];

const tableBody = document.querySelector("[data-reservation-table]");
const filterContainer = document.querySelector("[data-reservation-filters]");

const confirmModal = getConfirmModal();

export async function loadReservations() {
  try {
    const data = await fetchData(RESERVATIONS_TABLE, {
      orderBy: { column: "created_at", ascending: false },
    });
    state.all = data;
    filterReservations(state.filter);
    renderFilterButtons(filterContainer, filterMap, state.filter, filterReservations);
  } catch (error) {
    renderEmptyState(error.message);
    showToast("Could not load reservations.", "error");
  }
}

export async function updateReservationStatus(id, newStatus) {
  try {
    await updateStatus(RESERVATIONS_TABLE, id, { status: newStatus });
    showToast("Reservation updated.", "success");
    await loadReservations();
  } catch (error) {
    showToast("Failed to update reservation.", "error");
  }
}

export async function deleteReservation(id) {
  const shouldDelete = await confirmModal.open({
    title: "Delete Reservation",
    message: "This reservation will be deleted permanently.",
  });
  if (!shouldDelete) return;

  try {
    await deleteItem(RESERVATIONS_TABLE, id);
    showToast("Reservation deleted.", "success");
    await loadReservations();
  } catch (error) {
    showToast("Unable to delete reservation.", "error");
  }
}

export function filterReservations(filterType = "all") {
  state.filter = filterType;
  const filtered = applyFilters(state.all, (reservation) =>
    filterType === "all" ? true : (reservation.status || "pending") === filterType
  );
  renderReservationRows(filtered);
  renderFilterButtons(filterContainer, filterMap, state.filter, filterReservations);
}

function renderReservationRows(reservations = []) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (!reservations.length) {
    renderEmptyState("No reservations match this filter.");
    return;
  }

  reservations.forEach((reservation) => {
    const row = document.createElement("tr");
    row.className = "border-b border-white/5 hover:bg-white/5 transition text-sm text-white/80";
    row.dataset.rowId = reservation.id;
    row.innerHTML = `
      <td class="py-4 px-3 font-semibold text-white">${reservation.name}</td>
      <td class="py-4 px-3 text-white/70">${reservation.phone || reservation.email || "—"}</td>
      <td class="py-4 px-3">${reservation.guests || "—"} guests</td>
      <td class="py-4 px-3">${formatDateTime(reservation.date, reservation.time)}</td>
      <td class="py-4 px-3">
        ${renderStatusSelect(reservation)}
      </td>
      <td class="py-4 px-3 text-right">
        <button data-delete-reservation="${reservation.id}" class="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 transition">
          Delete
        </button>
      </td>
    `;

    tableBody.appendChild(row);

    row.querySelector("select").addEventListener("change", (event) => {
      updateReservationStatus(reservation.id, event.target.value);
    });

    row.querySelector("[data-delete-reservation]").addEventListener("click", () => {
      deleteReservation(reservation.id);
    });
  });
}

function renderStatusSelect(reservation) {
  const current = reservation.status || "pending";
  const options = RESERVATION_STATUSES.map(
    (status) =>
      `<option value="${status}" ${status === current ? "selected" : ""}>${
        status.charAt(0).toUpperCase() + status.slice(1)
      }</option>`
  ).join("");

  return `
    <select class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400/50">
      ${options}
    </select>
  `;
}

function renderEmptyState(message) {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="py-10 text-center text-white/60 text-sm">${message}</td>
    </tr>
  `;
}

function formatDateTime(date, time) {
  if (!date) return "—";
  const isoString = time ? `${date}T${time}` : date;
  return new Date(isoString).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

