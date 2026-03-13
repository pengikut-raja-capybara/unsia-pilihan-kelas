(function initializeScheduleApp(globalScope) {
  const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  function compareDays(firstDay, secondDay) {
    return dayOrder.indexOf(firstDay) - dayOrder.indexOf(secondDay);
  }

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    return option;
  }

  function createBadge(text, className) {
    const badge = document.createElement("span");
    badge.className = className;
    badge.textContent = text;
    return badge;
  }

  function populateSelect(select, values, formatter) {
    values.forEach(function appendValue(value) {
      select.appendChild(createOption(value, formatter(value)));
    });
  }

  function getUniqueValues(items, key) {
    return Array.from(
      new Set(
        items.map(function mapItem(item) {
          return item[key];
        })
      )
    );
  }

  function filterItems(items, state) {
    const query = state.query.trim().toLowerCase();

    return items.filter(function matches(item) {
      const searchable = [item.course, item.className, item.schedule, item.status].join(" ").toLowerCase();
      const matchesQuery = query === "" || searchable.includes(query);
      const matchesSemester = state.semester === "all" || item.semester === Number(state.semester);
      const matchesDay = state.day === "all" || item.day === state.day;

      return matchesQuery && matchesSemester && matchesDay;
    });
  }

  function sortItems(items, sortKey) {
    const sorted = items.slice();

    sorted.sort(function compare(firstItem, secondItem) {
      if (sortKey === "semester") {
        return firstItem.semester - secondItem.semester || firstItem.course.localeCompare(secondItem.course);
      }

      if (sortKey === "day") {
        return compareDays(firstItem.day, secondItem.day) || firstItem.schedule.localeCompare(secondItem.schedule);
      }

      if (sortKey === "sks") {
        return secondItem.sks - firstItem.sks || firstItem.course.localeCompare(secondItem.course);
      }

      return firstItem.course.localeCompare(secondItem.course) || firstItem.className.localeCompare(secondItem.className);
    });

    return sorted;
  }

  function renderHeroMeta(target, items) {

    const badges = [
      items.length + " opsi kelas",
      "Genap 25/26",
      "Update: 13 Maret 2026",
      "Unofficial, untuk referensi saja",
    ];

    target.replaceChildren();

    badges.forEach(function appendBadge(text) {
      target.appendChild(
        createBadge(
          text,
          "inline-flex items-center rounded-full border border-black/5 bg-white/80 px-4 py-2 font-medium text-slate-700 shadow-sm"
        )
      );
    });
  }

  function renderStats(target, items) {
    const uniqueCourses = new Set(
      items.map(function getCourse(item) {
        return item.course;
      })
    ).size;
    const semesters = getUniqueValues(items, "semester").sort(function sortSemester(a, b) {
      return a - b;
    });
    const onlineClasses = items.filter(function isOnline(item) {
      return item.status.toLowerCase() === "online";
    }).length;
    const stats = [
      {
        label: "Kelas tampil",
        value: String(items.length),
        accent: "bg-blue-700 text-white",
      },
      {
        label: "Mata kuliah unik",
        value: String(uniqueCourses),
        accent: "bg-blue-950 text-white",
      },
      {
        label: "Semester tersedia",
        value:
          semesters.length === 0
            ? "-"
            : semesters[0] === semesters[semesters.length - 1]
              ? String(semesters[0])
              : semesters[0] + "-" + semesters[semesters.length - 1],
        accent: "bg-amber-500 text-white",
      },
    ];

    target.replaceChildren();

    stats.forEach(function appendStat(stat) {
      const card = document.createElement("article");
      card.className = "rounded-[24px] bg-white/80 p-5 shadow-sm ring-1 ring-black/5";

      const label = document.createElement("p");
      label.className = "text-xs font-bold uppercase tracking-[0.2em] text-slate-500";
      label.textContent = stat.label;

      const value = document.createElement("p");
      value.className = "mt-3 inline-flex min-w-20 items-center justify-center rounded-2xl px-4 py-3 text-2xl font-extrabold " + stat.accent;
      value.textContent = stat.value;

      card.append(label, value);
      target.appendChild(card);
    });
  }

  function renderTable(target, items) {
    target.replaceChildren();

    items.forEach(function appendRow(item) {
      const row = document.createElement("tr");
      row.className = "transition hover:bg-blue-50/70";

      const courseCell = document.createElement("td");
      courseCell.className = "px-6 py-4 align-top";
      courseCell.innerHTML = '<div class="font-semibold text-slate-900">' + item.courseName + '</div><div class="mt-1 text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">' + item.courseCode + "</div>";

      const classCell = document.createElement("td");
      classCell.className = "px-4 py-4 align-top font-semibold text-slate-700";
      classCell.textContent = item.className;

      const scheduleCell = document.createElement("td");
      scheduleCell.className = "px-4 py-4 align-top text-slate-600";
      scheduleCell.textContent = item.schedule;

      const sksCell = document.createElement("td");
      sksCell.className = "px-4 py-4 align-top text-slate-700";
      sksCell.textContent = String(item.sks);

      const semesterCell = document.createElement("td");
      semesterCell.className = "px-4 py-4 align-top text-slate-700";
      semesterCell.textContent = String(item.semester);

      const statusCell = document.createElement("td");
      statusCell.className = "px-6 py-4 align-top";

      const badge = createBadge(
        item.status,
        "inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700"
      );

      statusCell.appendChild(badge);
      row.append(courseCell, classCell, scheduleCell, sksCell, semesterCell, statusCell);
      target.appendChild(row);
    });
  }

  function renderCards(target, items) {
    target.replaceChildren();

    items.forEach(function appendCard(item) {
      const card = document.createElement("article");
      card.className = "rounded-[24px] bg-slate-50 p-4 ring-1 ring-black/5";

      const topRow = document.createElement("div");
      topRow.className = "flex items-start justify-between gap-3";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h3");
      title.className = "text-base font-bold text-slate-900";
      title.textContent = item.courseName;

      const code = document.createElement("p");
      code.className = "mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500";
      code.textContent = item.courseCode;

      const classBadge = createBadge(
        item.className,
        "inline-flex items-center rounded-full bg-blue-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white"
      );

      titleWrap.append(title, code);
      topRow.append(titleWrap, classBadge);

      const detailList = document.createElement("div");
      detailList.className = "mt-4 grid gap-2 text-sm text-slate-600";
      detailList.innerHTML =
        '<div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2"><span>Jadwal</span><span class="text-right font-semibold text-slate-900">' +
        item.schedule +
        '</span></div>' +
        '<div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2"><span>Semester</span><span class="font-semibold text-slate-900">' +
        item.semester +
        '</span></div>' +
        '<div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2"><span>SKS</span><span class="font-semibold text-slate-900">' +
        item.sks +
        '</span></div>';

      const status = createBadge(
        item.status,
        "mt-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700"
      );

      card.append(topRow, detailList, status);
      target.appendChild(card);
    });
  }

  function updateSummary(target, filteredItems, allItems) {
    target.textContent = filteredItems.length + " dari " + allItems.length + " opsi kelas sedang ditampilkan.";
  }

  function syncVisibility(emptyState, resultsSection, hasItems) {
    emptyState.classList.toggle("hidden", hasItems);
    resultsSection.classList.toggle("hidden", !hasItems);
  }

  document.addEventListener("DOMContentLoaded", function onReady() {
    const api = globalScope.ScheduleData;

    if (!api || typeof api.loadScheduleData !== "function") {
      return;
    }

    const allItems = api.loadScheduleData("schedule-data");
    const state = {
      query: "",
      semester: "all",
      day: "all",
      sort: "course",
    };

    const elements = {
      heroMeta: document.getElementById("heroMeta"),
      statsGrid: document.getElementById("statsGrid"),
      searchInput: document.getElementById("searchInput"),
      semesterFilter: document.getElementById("semesterFilter"),
      dayFilter: document.getElementById("dayFilter"),
      sortFilter: document.getElementById("sortFilter"),
      resultSummary: document.getElementById("resultSummary"),
      desktopTableBody: document.getElementById("desktopTableBody"),
      mobileList: document.getElementById("mobileList"),
      emptyState: document.getElementById("emptyState"),
      resultsSection: document.getElementById("resultsSection"),
    };

    const semesters = getUniqueValues(allItems, "semester").sort(function sortSemester(a, b) {
      return a - b;
    });
    const days = getUniqueValues(allItems, "day").sort(compareDays);

    populateSelect(elements.semesterFilter, semesters, function formatSemester(value) {
      return "Semester " + value;
    });
    populateSelect(elements.dayFilter, days, function formatDay(value) {
      return value;
    });

    renderHeroMeta(elements.heroMeta, allItems);

    function updateView() {
      const filteredItems = filterItems(allItems, state);
      const sortedItems = sortItems(filteredItems, state.sort);

      renderStats(elements.statsGrid, sortedItems);
      renderTable(elements.desktopTableBody, sortedItems);
      renderCards(elements.mobileList, sortedItems);
      updateSummary(elements.resultSummary, sortedItems, allItems);
      syncVisibility(elements.emptyState, elements.resultsSection, sortedItems.length > 0);
    }

    elements.searchInput.addEventListener("input", function onSearchInput(event) {
      state.query = event.target.value;
      updateView();
    });

    elements.semesterFilter.addEventListener("change", function onSemesterChange(event) {
      state.semester = event.target.value;
      updateView();
    });

    elements.dayFilter.addEventListener("change", function onDayChange(event) {
      state.day = event.target.value;
      updateView();
    });

    elements.sortFilter.addEventListener("change", function onSortChange(event) {
      state.sort = event.target.value;
      updateView();
    });

    updateView();
  });
})(window);