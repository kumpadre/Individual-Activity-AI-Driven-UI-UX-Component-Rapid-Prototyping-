/* =====================================================================
   Gridlark Analytics Dashboard — vanilla JS
   ===================================================================== */

const FIRST_NAMES = ["John","Maria","Liam","Sofia","Noah","Ava","Ethan","Isabella","Mason","Mia","Lucas","Amelia","Elena","Diego","Hana","Kenji","Priya","Omar","Grace","Miguel"];
const LAST_NAMES = ["Anderson","Cruz","Bennett","Reyes","Carter","Santos","Walker","Torres","Bailey","Ramos","Foster","Delgado","Kim","Osei","Nakamura","Hassan","Patel","Silva","Novak","Fischer"];
const LOCATIONS = ["Manila","Cebu","Singapore","Austin","Toronto","Berlin","Lagos","Nairobi","Seoul","Lisbon","Auckland","Bogotá"];
const ROLES = ["Administrator","Manager","User","Editor"];
const STATUSES = ["Active","Inactive","Pending","Suspended"];
const AVATAR_PALETTE = ["#4F46E5","#0EA5E9","#16A34A","#D97706","#DB2777","#7C3AED","#0D9488"];
const PAGE_SIZE = 8;

const STATUS_STYLES = {
  Active:    { dot: "#16A34A", text: "#15803D", bg: "var(--success-bg)", border: "var(--success-border)" },
  Inactive:  { dot: "#64748B", text: "#475569", bg: "var(--inactive-bg)", border: "var(--inactive-border)" },
  Pending:   { dot: "#D97706", text: "#B45309", bg: "var(--warning-bg)", border: "var(--warning-border)" },
  Suspended: { dot: "#DC2626", text: "#B91C1C", bg: "var(--danger-bg)", border: "var(--danger-border)" },
};

/* --------------------------- Mock data generation --------------------------- */

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildUsers() {
  const rand = seededRandom(42);
  const users = [];
  for (let i = 0; i < 24; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3 + 1) % LAST_NAMES.length];
    const role = ROLES[Math.floor(rand() * ROLES.length)];
    const statusRoll = rand();
    const status = statusRoll < 0.55 ? "Active" : statusRoll < 0.75 ? "Inactive" : statusRoll < 0.9 ? "Pending" : "Suspended";
    const activity = Math.floor(rand() * 70) + 30;
    const daysAgoJoined = Math.floor(rand() * 620) + 5;
    const joined = new Date();
    joined.setDate(joined.getDate() - daysAgoJoined);
    const minutesAgoActive = Math.floor(rand() * 60000);
    users.push({
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@gridlark.io`,
      initials: `${first[0]}${last[0]}`,
      role,
      status,
      activity,
      location: LOCATIONS[Math.floor(rand() * LOCATIONS.length)],
      joinedDate: joined.toISOString().slice(0, 10),
      lastActiveMinutes: minutesAgoActive,
    });
  }
  return users;
}

let users = buildUsers();

/* --------------------------- State --------------------------- */

const state = {
  search: "",
  statusFilter: "All",
  roleFilter: "All",
  sortBy: "name-asc",
  sortColumn: null,
  sortDir: "asc",
  page: 1,
};

/* --------------------------- Helpers --------------------------- */

function avatarColor(id) { return AVATAR_PALETTE[id % AVATAR_PALETTE.length]; }

function formatRelativeTime(minutesAgo) {
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo${months > 1 ? "s" : ""} ago`;
}

function formatJoinedDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function activityColor(value) {
  return value >= 70 ? "#16A34A" : value >= 40 ? "#D97706" : "#DC2626";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* --------------------------- Derived data --------------------------- */

function getFilteredUsers() {
  let result = users.filter((u) => {
    const q = state.search.trim().toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesStatus = state.statusFilter === "All" || u.status === state.statusFilter;
    const matchesRole = state.roleFilter === "All" || u.role === state.roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const dir = state.sortDir === "asc" ? 1 : -1;

  if (state.sortColumn === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name) * dir);
  } else if (state.sortColumn === "activity") {
    result.sort((a, b) => (a.activity - b.activity) * dir);
  } else if (state.sortColumn === "joined") {
    result.sort((a, b) => (new Date(a.joinedDate) - new Date(b.joinedDate)) * dir);
  } else if (state.sortColumn === "lastActive") {
    result.sort((a, b) => (b.lastActiveMinutes - a.lastActiveMinutes) * dir);
  } else if (state.sortBy) {
    switch (state.sortBy) {
      case "name-asc": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc": result.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "newest": result.sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate)); break;
      case "oldest": result.sort((a, b) => new Date(a.joinedDate) - new Date(b.joinedDate)); break;
      case "most-active": result.sort((a, b) => b.activity - a.activity); break;
    }
  }
  return result;
}

/* --------------------------- Rendering --------------------------- */

function renderStats() {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active").length;
  const newUsers = users.filter((u) => {
    const days = (Date.now() - new Date(u.joinedDate).getTime()) / 86400000;
    return days <= 30;
  }).length;
  const avgActivity = users.length ? Math.round(users.reduce((s, u) => s + u.activity, 0) / users.length) : 0;

  const cards = [
    { icon: "users", label: "Total users", value: totalUsers.toLocaleString(), delta: 12.5, bg: "#EEF2FF", fg: "#4F46E5" },
    { icon: "activity", label: "Active users", value: activeUsers.toLocaleString(), delta: 8.2, bg: "#F0FDF4", fg: "#16A34A" },
    { icon: "trending-up", label: "New users", value: newUsers.toLocaleString(), delta: 15.7, bg: "#FFFBEB", fg: "#D97706" },
    { icon: "bar-chart-3", label: "Avg. engagement", value: `${avgActivity}%`, delta: 4.6, bg: "#FDF2F8", fg: "#DB2777" },
  ];

  document.getElementById("statsGrid").innerHTML = cards.map((c) => `
    <div class="stat-card">
      <div class="stat-card-top">
        <div>
          <p class="stat-label">${c.label}</p>
          <p class="stat-value">${c.value}</p>
        </div>
        <div class="stat-icon" style="background:${c.bg};color:${c.fg}">
          <i data-lucide="${c.icon}"></i>
        </div>
      </div>
      <div class="stat-delta up">
        <i data-lucide="arrow-up-right"></i>
        <span>+${c.delta}%</span>
        <span class="muted">from last month</span>
      </div>
    </div>
  `).join("");
}

function statusBadgeHtml(status) {
  const s = STATUS_STYLES[status];
  return `<span class="status-badge" style="background:${s.bg};color:${s.text};border-color:${s.border}">
    <span class="status-dot" style="background:${s.dot}"></span>${status}
  </span>`;
}

function avatarHtml(user, size) {
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${size * 0.38}px;background:${avatarColor(user.id)}">${user.initials}</div>`;
}

function activityHtml(value) {
  return `<div class="activity-cell">
    <div class="activity-track"><div class="activity-fill" style="width:${value}%;background:${activityColor(value)}"></div></div>
    <span>${value}%</span>
  </div>`;
}

function renderSortArrows() {
  document.querySelectorAll(".sort-arrows").forEach((el) => {
    const col = el.dataset.arrows;
    const [up, down] = el.querySelectorAll("i");
    up.classList.toggle("active", state.sortColumn === col && state.sortDir === "asc");
    down.classList.toggle("active", state.sortColumn === col && state.sortDir === "desc");
  });
}

function renderTable() {
  const filtered = getFilteredUsers();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const pageUsers = filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

  const emptyState = document.getElementById("emptyState");
  const tableScroll = document.getElementById("tableScroll");
  const mobileCards = document.getElementById("mobileCards");
  const pagination = document.getElementById("pagination");

  if (filtered.length === 0) {
    emptyState.hidden = false;
    tableScroll.style.display = "none";
    mobileCards.style.display = "none";
    pagination.innerHTML = "";
    lucide.createIcons();
    return;
  }

  emptyState.hidden = true;
  tableScroll.style.display = "";
  mobileCards.style.display = "";

  // Desktop rows
  document.getElementById("tableBody").innerHTML = pageUsers.map((u) => `
    <tr data-id="${u.id}">
      <td>
        <div class="user-cell">
          ${avatarHtml(u, 36)}
          <div>
            <p class="user-cell-name">${escapeHtml(u.name)}</p>
            <p class="user-cell-loc"><i data-lucide="map-pin"></i>${escapeHtml(u.location)}</p>
          </div>
        </div>
      </td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.role)}</td>
      <td>${statusBadgeHtml(u.status)}</td>
      <td>${activityHtml(u.activity)}</td>
      <td>${formatRelativeTime(u.lastActiveMinutes)}</td>
      <td>${formatJoinedDate(u.joinedDate)}</td>
      <td class="row-actions">
        <button class="row-menu-btn" data-menu-toggle="${u.id}" aria-haspopup="true" aria-expanded="false" aria-label="Open user actions">
          <i data-lucide="more-vertical"></i>
        </button>
      </td>
    </tr>
  `).join("");

  // Mobile cards
  document.getElementById("mobileCards").innerHTML = pageUsers.map((u) => `
    <div class="mobile-card" data-id="${u.id}">
      <div class="mobile-card-main">
        ${avatarHtml(u, 40)}
        <div>
          <p class="mobile-card-name">${escapeHtml(u.name)}</p>
          <p class="mobile-card-email">${escapeHtml(u.email)}</p>
          <div class="mobile-card-meta">
            ${statusBadgeHtml(u.status)}
            <span class="mobile-card-role">${escapeHtml(u.role)}</span>
          </div>
          <div style="margin-top:8px">${activityHtml(u.activity)}</div>
          <p class="mobile-card-foot">Active ${formatRelativeTime(u.lastActiveMinutes)} · Joined ${formatJoinedDate(u.joinedDate)}</p>
        </div>
      </div>
      <div class="row-actions">
        <button class="row-menu-btn" data-menu-toggle="${u.id}" aria-haspopup="true" aria-expanded="false" aria-label="Open user actions">
          <i data-lucide="more-vertical"></i>
        </button>
      </div>
    </div>
  `).join("");

  // Pagination
  const start = (state.page - 1) * PAGE_SIZE + 1;
  const end = Math.min(state.page * PAGE_SIZE, filtered.length);
  let pageBtns = "";
  for (let n = 1; n <= totalPages; n++) {
    pageBtns += `<button class="page-btn ${n === state.page ? "active" : ""}" data-page="${n}">${n}</button>`;
  }
  pagination.innerHTML = `
    <p class="pagination-info">Showing ${start}–${end} of ${filtered.length} users</p>
    <div class="pagination-controls">
      <button class="btn btn-ghost" id="prevPage" ${state.page === 1 ? "disabled" : ""}>Previous</button>
      ${pageBtns}
      <button class="btn btn-ghost" id="nextPage" ${state.page === totalPages ? "disabled" : ""}>Next</button>
    </div>
  `;

  renderSortArrows();
  lucide.createIcons();
  attachRowListeners();
}

function renderAll() {
  renderStats();
  renderTable();
  lucide.createIcons();
}

/* --------------------------- Row menu --------------------------- */

let openMenuId = null;

function closeRowMenu() {
  openMenuId = null;
  document.querySelectorAll(".row-menu").forEach((m) => m.remove());
  document.querySelectorAll("[data-menu-toggle]").forEach((b) => b.setAttribute("aria-expanded", "false"));
}

function toggleRowMenu(id, anchorEl) {
  if (openMenuId === id) {
    closeRowMenu();
    return;
  }
  closeRowMenu();
  openMenuId = id;
  anchorEl.setAttribute("aria-expanded", "true");

  const menu = document.createElement("div");
  menu.className = "row-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <button role="menuitem" data-action="view"><i data-lucide="eye"></i>View profile</button>
    <button role="menuitem" data-action="edit"><i data-lucide="pencil"></i>Edit user</button>
    <button role="menuitem" data-action="activity"><i data-lucide="activity"></i>View activity</button>
    <div class="row-menu-divider"></div>
    <button role="menuitem" class="danger" data-action="delete"><i data-lucide="trash-2"></i>Delete user</button>
  `;
  const container = anchorEl.closest(".row-actions");
  container.style.position = "relative";
  container.appendChild(menu);
  lucide.createIcons();

  menu.querySelector('[data-action="view"]').addEventListener("click", () => { closeRowMenu(); openViewModal(id); });
  menu.querySelector('[data-action="edit"]').addEventListener("click", () => { closeRowMenu(); openEditModal(id); });
  menu.querySelector('[data-action="delete"]').addEventListener("click", () => { closeRowMenu(); openDeleteModal(id); });
  menu.querySelector('[data-action="activity"]').addEventListener("click", () => { closeRowMenu(); });
}

function attachRowListeners() {
  document.querySelectorAll("[data-menu-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRowMenu(Number(btn.dataset.menuToggle), btn);
    });
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".row-menu") && !e.target.closest("[data-menu-toggle]")) closeRowMenu();
});

/* --------------------------- Modals --------------------------- */

const modalRoot = document.getElementById("modalRoot");

function closeModal() { modalRoot.innerHTML = ""; }

function openViewModal(id) {
  const u = users.find((x) => x.id === id);
  if (!u) return;
  modalRoot.innerHTML = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" role="dialog" aria-modal="true" aria-label="User profile">
        <div class="modal-header">
          <h2>User profile</h2>
          <button class="icon-btn" data-close aria-label="Close dialog"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-profile-top">
          ${avatarHtml(u, 52)}
          <div>
            <p style="font-weight:600;margin:0 0 6px">${escapeHtml(u.name)}</p>
            ${statusBadgeHtml(u.status)}
          </div>
        </div>
        <dl class="modal-dl">
          <div class="modal-row"><dt>Email</dt><dd>${escapeHtml(u.email)}</dd></div>
          <div class="modal-row"><dt>Role</dt><dd>${escapeHtml(u.role)}</dd></div>
          <div class="modal-row"><dt>Location</dt><dd>${escapeHtml(u.location)}</dd></div>
          <div class="modal-row"><dt>Activity</dt><dd>${u.activity}%</dd></div>
          <div class="modal-row"><dt>Joined</dt><dd>${formatJoinedDate(u.joinedDate)}</dd></div>
          <div class="modal-row"><dt>Last active</dt><dd>${formatRelativeTime(u.lastActiveMinutes)}</dd></div>
        </dl>
      </div>
    </div>
  `;
  wireModalClose();
  lucide.createIcons();
}

function openEditModal(id) {
  const u = users.find((x) => x.id === id);
  if (!u) return;
  modalRoot.innerHTML = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Edit user">
        <div class="modal-header">
          <h2>Edit user</h2>
          <button class="icon-btn" data-close aria-label="Close dialog"><i data-lucide="x"></i></button>
        </div>
        <form id="editForm">
          <div class="form-group">
            <label for="editName">Name</label>
            <input id="editName" value="${escapeHtml(u.name)}" required />
          </div>
          <div class="form-group">
            <label for="editEmail">Email</label>
            <input id="editEmail" type="email" value="${escapeHtml(u.email)}" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editRole">Role</label>
              <div class="select-wrap">
                <select id="editRole">
                  ${ROLES.map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}
                </select>
                <i data-lucide="chevron-down"></i>
              </div>
            </div>
            <div class="form-group">
              <label for="editStatus">Status</label>
              <div class="select-wrap">
                <select id="editStatus">
                  ${STATUSES.map((s) => `<option value="${s}" ${s === u.status ? "selected" : ""}>${s}</option>`).join("")}
                </select>
                <i data-lucide="chevron-down"></i>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-close>Cancel</button>
            <button type="submit" class="btn btn-primary">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
  wireModalClose();
  lucide.createIcons();

  document.getElementById("editForm").addEventListener("submit", (e) => {
    e.preventDefault();
    u.name = document.getElementById("editName").value.trim();
    u.email = document.getElementById("editEmail").value.trim();
    u.role = document.getElementById("editRole").value;
    u.status = document.getElementById("editStatus").value;
    const parts = u.name.split(" ");
    u.initials = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
    closeModal();
    renderAll();
  });
}

function openDeleteModal(id) {
  const u = users.find((x) => x.id === id);
  if (!u) return;
  modalRoot.innerHTML = `
    <div class="modal-overlay" data-overlay>
      <div class="modal" style="max-width:380px" role="dialog" aria-modal="true" aria-label="Delete user">
        <div class="modal-header">
          <h2>Delete user</h2>
          <button class="icon-btn" data-close aria-label="Close dialog"><i data-lucide="x"></i></button>
        </div>
        <p class="modal-text">Remove <strong>${escapeHtml(u.name)}</strong> from the platform? This can't be undone.</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
        </div>
      </div>
    </div>
  `;
  wireModalClose();
  lucide.createIcons();

  document.getElementById("confirmDelete").addEventListener("click", () => {
    users = users.filter((x) => x.id !== id);
    closeModal();
    renderAll();
  });
}

function wireModalClose() {
  modalRoot.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
  modalRoot.querySelector("[data-overlay]").addEventListener("mousedown", (e) => {
    if (e.target.hasAttribute("data-overlay")) closeModal();
  });
}

/* --------------------------- Filter / sort / pagination wiring --------------------------- */

function clearFilters() {
  state.search = "";
  state.statusFilter = "All";
  state.roleFilter = "All";
  state.sortBy = "name-asc";
  state.sortColumn = null;
  state.sortDir = "asc";
  state.page = 1;
  document.getElementById("searchInput").value = "";
  document.getElementById("statusFilter").value = "All";
  document.getElementById("roleFilter").value = "All";
  document.getElementById("sortSelect").value = "name-asc";
  renderTable();
}

function initFilterBar() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.search = e.target.value;
    state.page = 1;
    renderTable();
  });

  document.getElementById("statusFilter").addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    state.page = 1;
    renderTable();
  });

  document.getElementById("roleFilter").addEventListener("change", (e) => {
    state.roleFilter = e.target.value;
    state.page = 1;
    renderTable();
  });

  document.getElementById("sortSelect").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    state.sortColumn = null;
    state.page = 1;
    renderTable();
  });

  document.querySelectorAll(".sort-head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const col = btn.dataset.col;
      if (state.sortColumn === col) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortColumn = col;
        state.sortDir = "asc";
      }
      state.sortBy = "";
      state.page = 1;
      renderTable();
    });
  });

  document.getElementById("clearFiltersBtn").addEventListener("click", clearFilters);

  document.getElementById("pagination").addEventListener("click", (e) => {
    if (e.target.id === "prevPage") { state.page = Math.max(1, state.page - 1); renderTable(); }
    if (e.target.id === "nextPage") { state.page += 1; renderTable(); }
    if (e.target.dataset.page) { state.page = Number(e.target.dataset.page); renderTable(); }
  });
}

/* --------------------------- Mobile nav --------------------------- */

function initMobileNav() {
  const overlay = document.getElementById("mobileNavOverlay");
  document.getElementById("openMobileNav").addEventListener("click", () => overlay.classList.add("open"));
  document.getElementById("closeMobileNav").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
}

/* --------------------------- Init --------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initFilterBar();
  initMobileNav();
  renderAll();
});
