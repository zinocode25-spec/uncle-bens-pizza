import {
  loadContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
  filterContactMessages,
} from "./contactMessages.js";
import { loadReviews, deleteReview, filterReviews } from "./reviews.js";
import {
  loadReservations,
  updateReservationStatus,
  deleteReservation,
  filterReservations,
} from "./reservations.js";
import { loadOrders, filterOrders } from "./orders.js";

const AdminDashboard = {
  contacts: {
    load: loadContactMessages,
    updateStatus: updateContactMessageStatus,
    delete: deleteContactMessage,
    filter: filterContactMessages,
  },
  reviews: {
    load: loadReviews,
    delete: deleteReview,
    filter: filterReviews,
  },
  reservations: {
    load: loadReservations,
    updateStatus: updateReservationStatus,
    delete: deleteReservation,
    filter: filterReservations,
  },
  orders: {
    load: loadOrders,
    filter: filterOrders,
  },
};

window.AdminDashboard = AdminDashboard;

document.addEventListener("DOMContentLoaded", () => {
  AdminDashboard.contacts.load();
  AdminDashboard.reviews.load();
  AdminDashboard.reservations.load();
  AdminDashboard.orders.load();
});

