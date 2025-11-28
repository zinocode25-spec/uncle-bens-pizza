import { fetchData, deleteItem, applyFilters } from "./dataService.js";
import {
  getConfirmModal,
  getHoverPreview,
  renderFilterButtons,
  fadeTableRow,
  showToast,
} from "./uiComponents.js";

const REVIEWS_TABLE = "reviews";

const state = {
  all: [],
  filter: "all",
};

const filterMap = [
  { id: "all", label: "All Ratings" },
  { id: "5", label: "5 Stars" },
  { id: "4", label: "4 Stars" },
  { id: "3", label: "3 Stars" },
  { id: "2", label: "2 Stars" },
  { id: "1", label: "1 Star" },
];

const tableBody = document.querySelector("[data-review-table]");
const filterContainer = document.querySelector("[data-review-filters]");

const confirmModal = getConfirmModal();
const hoverPreview = getHoverPreview();

export async function loadReviews() {
  try {
    const data = await fetchData(REVIEWS_TABLE, {
      orderBy: { column: "created_at", ascending: false },
    });
    state.all = data;
    filterReviews(state.filter);
    renderFilterButtons(filterContainer, filterMap, state.filter, filterReviews);
  } catch (error) {
    renderEmptyState(error.message);
    showToast("Unable to load reviews.", "error");
  }
}

export async function deleteReview(id) {
  const shouldDelete = await confirmModal.open({
    title: "Delete Review",
    message: "This review will be removed for everyone. Continue?",
  });
  if (!shouldDelete) return;

  try {
    await deleteItem(REVIEWS_TABLE, id);
    showToast("Review deleted.", "success");
    await loadReviews();
  } catch (error) {
    showToast("Failed to delete review.", "error");
  }
}

export function filterReviews(starFilter = "all") {
  state.filter = starFilter;
  const filtered = applyFilters(state.all, (review) =>
    starFilter === "all" ? true : String(review.rating) === starFilter
  );
  renderReviewRows(filtered);
  renderFilterButtons(filterContainer, filterMap, state.filter, filterReviews);
}

export function reviewHoverPreview(reviewText = "") {
  return `
    <div class="space-y-1">
      <p class="text-xs uppercase tracking-[0.2em] text-white/60">Review</p>
      <p class="text-sm leading-relaxed whitespace-pre-wrap">${reviewText || "No review provided."}</p>
    </div>
  `;
}

function renderReviewRows(reviews = []) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (!reviews.length) {
    renderEmptyState("No reviews found.");
    return;
  }

  reviews.forEach((review) => {
    const row = document.createElement("tr");
    row.className = "border-b border-white/5 hover:bg-white/5 transition text-sm text-white/80";
    row.dataset.rowId = review.id;
    row.innerHTML = `
      <td class="py-4 px-3 font-semibold text-white">${review.name}</td>
      <td class="py-4 px-3 text-amber-300">${renderStars(review.rating)}</td>
      <td class="py-4 px-3 max-w-sm truncate" data-review-cell>${review.review || "—"}</td>
      <td class="py-4 px-3 text-white/60">${formatTimestamp(review.created_at)}</td>
      <td class="py-4 px-3 text-right">
        <button data-delete-review="${review.id}" class="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 transition">
          Delete
        </button>
      </td>
    `;

    tableBody.appendChild(row);

    const reviewCell = row.querySelector("[data-review-cell]");
    hoverPreview.bind(reviewCell, () => reviewHoverPreview(review.review));

    row.querySelector("[data-delete-review]").addEventListener("click", () => {
      deleteReview(review.id);
    });
  });
}

function renderStars(rating = 0) {
  const filled = "★".repeat(rating);
  const empty = "☆".repeat(Math.max(0, 5 - rating));
  return `<span class="tracking-widest">${filled}${empty}</span>`;
}

function renderEmptyState(message) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="py-10 text-center text-white/60 text-sm">${message}</td>
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

