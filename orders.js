import { fetchData, applyFilters } from "./dataService.js";
import { renderFilterButtons, showToast } from "./uiComponents.js";

const ORDERS_TABLE = "orders";
const ORDER_STATUS_FLOW = [
  "Received",
  "Preparing",
  "Ready",
  "Delivery",
  "Delivered",
  "Cancelled",
];
const STATUS_ALIAS_MAP = {
  received: "Received",
  pending: "Received",
  placed: "Received",
  preparing: "Preparing",
  cooking: "Preparing",
  ready: "Ready",
  pickup: "Ready",
  delivery: "Delivery",
  delivering: "Delivery",
  driverassigned: "Delivery",
  outfordelivery: "Delivery",
  shipped: "Delivery",
  shipping: "Delivery",
  delivered: "Delivered",
  complete: "Delivered",
  completed: "Delivered",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};
const DEFAULT_ORDER_STATUS = ORDER_STATUS_FLOW[0];

const state = {
  all: [],
  filter: "all",
};

const filterMap = [
  { id: "all", label: "All" },
  ...ORDER_STATUS_FLOW.map((status) => ({ id: status, label: status })),
];

const tableBody = document.querySelector("[data-orders-table]");
const filterContainer = document.querySelector("[data-order-filters]");

export async function loadOrders() {
  try {
    const data = await fetchData(ORDERS_TABLE, {
      orderBy: { column: "created_at", ascending: false },
    });
    state.all = data;
    filterOrders(state.filter);
    renderFilterButtons(filterContainer, filterMap, state.filter, filterOrders);
  } catch (error) {
    renderEmptyState(error.message);
    showToast("Unable to load orders.", "error");
  }
}

export function filterOrders(orderStatus = "all") {
  state.filter = orderStatus;
  const filtered = applyFilters(state.all, (order) => {
    if (orderStatus === "all") return true;
    return (resolveStatus(order.status) ?? DEFAULT_ORDER_STATUS) === orderStatus;
  });
  renderOrderRows(filtered);
  renderFilterButtons(filterContainer, filterMap, state.filter, filterOrders);
}

function renderOrderRows(orders = []) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (!orders.length) {
    renderEmptyState("No orders available for this filter.");
    return;
  }

  orders.forEach((order) => {
    const statusLabel = resolveStatus(order.status) ?? DEFAULT_ORDER_STATUS;
    const row = document.createElement("tr");
    row.className = "border-b border-white/5 hover:bg-white/5 transition text-sm text-white/80";
    row.dataset.rowId = order.id;
    row.innerHTML = `
      <td class="py-4 px-3 font-semibold text-white">#${order.order_number || order.id}</td>
      <td class="py-4 px-3">
        <p class="text-white font-semibold">${order.name}</p>
        <p class="text-xs text-white/60">${order.phone || order.email || "—"}</p>
      </td>
      <td class="py-4 px-3 text-white/70">${renderOrderItems(order.items)}</td>
      <td class="py-4 px-3 text-white/60">${formatCurrency(order.total)}</td>
      <td class="py-4 px-3">
        <span class="${statusBadge(statusLabel)}">${statusLabel}</span>
      </td>
      <td class="py-4 px-3 text-white/60">${formatTimestamp(order.created_at)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderOrderItems(items = []) {
  if (!Array.isArray(items) || !items.length) return "—";
  return items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
}

function normalizeStatus(value = "") {
  return value.toString().trim().toLowerCase().replace(/[^a-z]/g, "");
}

function resolveStatus(value) {
  const normalized = normalizeStatus(value ?? "");
  return (
    STATUS_ALIAS_MAP[normalized] ||
    ORDER_STATUS_FLOW.find((status) => normalizeStatus(status) === normalized) ||
    null
  );
}

function statusBadge(status) {
  const baseClasses =
    "inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full";
  const styleMap = {
    Received: "bg-sky-500/15 text-sky-200",
    Preparing: "bg-orange-500/15 text-orange-200",
    Ready: "bg-amber-500/15 text-amber-200",
    Delivery: "bg-purple-500/15 text-purple-200",
    Delivered: "bg-emerald-500/15 text-emerald-200",
    Cancelled: "bg-rose-500/15 text-rose-200",
  };
  return `${baseClasses} ${styleMap[status] || "bg-white/10 text-white/70"}`;
}

function renderEmptyState(message) {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="py-10 text-center text-white/60 text-sm">${message}</td>
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

function formatCurrency(value) {
  if (!value && value !== 0) return "₵0.00";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(value);
}

