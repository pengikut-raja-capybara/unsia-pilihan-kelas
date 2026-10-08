(function initializeScheduleApp(globalScope) {
  const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  function compareDays(firstDay, secondDay) {
    const idxA = dayOrder.indexOf(firstDay);
    const idxB = dayOrder.indexOf(secondDay);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
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

  function getUniqueValues(items, key) {
    return Array.from(
      new Set(
        items.map(function mapItem(item) {
          return item[key];
        })
      )
    );
  }

  function getStorageKey(periodId) {
    return "unsia_krs_selected_" + (periodId || "default");
  }

  function loadSavedSelection(periodId) {
    try {
      const raw = localStorage.getItem(getStorageKey(periodId));
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (_err) {
      return new Set();
    }
  }

  function saveSelection(periodId, selectedIds) {
    try {
      const arr = Array.from(selectedIds);
      localStorage.setItem(getStorageKey(periodId), JSON.stringify(arr));
    } catch (_err) {
      // storage unavailable or full
    }
  }

  function filterItems(items, state, activeTranscript) {
    const query = state.query.trim().toLowerCase();

    return items.filter(function matches(item) {
      const searchable = [item.course, item.courseName, item.courseCode, item.className, item.schedule, item.status]
        .join(" ")
        .toLowerCase();
      const matchesQuery = query === "" || searchable.includes(query);
      const matchesSemester = state.semester === "all" || item.semester === Number(state.semester);
      const matchesDay = state.day === "all" || item.day === state.day;

      // Status Belajar filter (Transcript match)
      let matchesStatus = true;
      if (state.statusFilter !== "all") {
        const transcriptCourse =
          activeTranscript && activeTranscript.courses ? activeTranscript.courses[item.courseCode] : null;
        const isPassed = transcriptCourse && transcriptCourse.isPassed;

        if (state.statusFilter === "not_taken") {
          matchesStatus = !isPassed;
        } else if (state.statusFilter === "passed") {
          matchesStatus = Boolean(isPassed);
        }
      }

      return matchesQuery && matchesSemester && matchesDay && matchesStatus;
    });
  }

  function sortItems(items, sortKey) {
    const sorted = items.slice();

    sorted.sort(function compare(firstItem, secondItem) {
      if (sortKey === "semester") {
        return (
          firstItem.semester - secondItem.semester ||
          firstItem.courseName.localeCompare(secondItem.courseName) ||
          firstItem.className.localeCompare(secondItem.className)
        );
      }

      if (sortKey === "day") {
        return (
          compareDays(firstItem.day, secondItem.day) ||
          firstItem.startMinutes - secondItem.startMinutes ||
          firstItem.schedule.localeCompare(secondItem.schedule)
        );
      }

      if (sortKey === "sks") {
        return (
          secondItem.sks - firstItem.sks ||
          firstItem.courseName.localeCompare(secondItem.courseName) ||
          firstItem.className.localeCompare(secondItem.className)
        );
      }

      return (
        firstItem.courseName.localeCompare(secondItem.courseName) ||
        firstItem.className.localeCompare(secondItem.className)
      );
    });

    return sorted;
  }

  document.addEventListener("DOMContentLoaded", function onReady() {
    const api = globalScope.ScheduleData;
    const transcriptApi = globalScope.TranscriptData;

    if (!api || typeof api.loadScheduleData !== "function") {
      return;
    }

    const periods = api.getPeriods();
    const defaultPeriod = periods.find(function isDef(p) { return p.isDefault; }) || periods[0];

    let activeTranscript = transcriptApi ? transcriptApi.getTranscript() : null;
    let pendingTranscript = null;

    const state = {
      period: defaultPeriod ? defaultPeriod.id : "default",
      query: "",
      statusFilter: "all",
      semester: "all",
      day: "all",
      sort: "semester",
      selectedIds: loadSavedSelection(defaultPeriod ? defaultPeriod.id : "default"),
    };

    let allItems = api.loadScheduleData(state.period);

    const elements = {
      heroMeta: document.getElementById("heroMeta"),
      statsGrid: document.getElementById("statsGrid"),
      searchInput: document.getElementById("searchInput"),
      periodFilter: document.getElementById("periodFilter"),
      statusFilter: document.getElementById("statusFilter"),
      semesterFilter: document.getElementById("semesterFilter"),
      dayFilter: document.getElementById("dayFilter"),
      sortFilter: document.getElementById("sortFilter"),
      resultSummary: document.getElementById("resultSummary"),
      desktopTableBody: document.getElementById("desktopTableBody"),
      mobileList: document.getElementById("mobileList"),
      emptyState: document.getElementById("emptyState"),
      resultsSection: document.getElementById("resultsSection"),
      btnQuickViewKrs: document.getElementById("btnQuickViewKrs"),
      headerKrsBadge: document.getElementById("headerKrsBadge"),
      krsDock: document.getElementById("krsDock"),
      dockSubtitle: document.getElementById("dockSubtitle"),
      dockConflictBadge: document.getElementById("dockConflictBadge"),
      dockCountBadge: document.getElementById("dockCountBadge"),
      btnOpenDockDrawer: document.getElementById("btnOpenDockDrawer"),
      krsModal: document.getElementById("krsModal"),
      krsModalBackdrop: document.getElementById("krsModalBackdrop"),
      btnCloseModal: document.getElementById("btnCloseModal"),
      modalPeriodSubtitle: document.getElementById("modalPeriodSubtitle"),
      modalConflictBox: document.getElementById("modalConflictBox"),
      modalConflictList: document.getElementById("modalConflictList"),
      modalSksValue: document.getElementById("modalSksValue"),
      modalSksProgress: document.getElementById("modalSksProgress"),
      modalSksAdvice: document.getElementById("modalSksAdvice"),
      modalGraduationProjection: document.getElementById("modalGraduationProjection"),
      modalClassList: document.getElementById("modalClassList"),
      btnResetKrs: document.getElementById("btnResetKrs"),
      btnCopyWa: document.getElementById("btnCopyWa"),
      btnPrintKrs: document.getElementById("btnPrintKrs"),
      toastNotification: document.getElementById("toastNotification"),
      toastIcon: document.getElementById("toastIcon"),
      toastMessage: document.getElementById("toastMessage"),
      printPeriodTitle: document.getElementById("printPeriodTitle"),
      printTableBody: document.getElementById("printTableBody"),
      printTotalSks: document.getElementById("printTotalSks"),
      printGeneratedDate: document.getElementById("printGeneratedDate"),

      // Transcript Elements
      transcriptProgressCard: document.getElementById("transcriptProgressCard"),
      transcriptStudentName: document.getElementById("transcriptStudentName"),
      transcriptStudentNim: document.getElementById("transcriptStudentNim"),
      transcriptDateBadge: document.getElementById("transcriptDateBadge"),
      transcriptStatsSummary: document.getElementById("transcriptStatsSummary"),
      transcriptProgressPercent: document.getElementById("transcriptProgressPercent"),
      transcriptProgressBar: document.getElementById("transcriptProgressBar"),
      btnManageTranscript: document.getElementById("btnManageTranscript"),
      btnOpenTranscriptModal: document.getElementById("btnOpenTranscriptModal"),
      transcriptBtnText: document.getElementById("transcriptBtnText"),
      transcriptBtnBadge: document.getElementById("transcriptBtnBadge"),

      transcriptValidityBanner: document.getElementById("transcriptValidityBanner"),
      transcriptValidityMessage: document.getElementById("transcriptValidityMessage"),
      btnUpdateTranscriptPrompt: document.getElementById("btnUpdateTranscriptPrompt"),
      btnDismissValidityWarning: document.getElementById("btnDismissValidityWarning"),

      transcriptModal: document.getElementById("transcriptModal"),
      transcriptModalBackdrop: document.getElementById("transcriptModalBackdrop"),
      btnCloseTranscriptModal: document.getElementById("btnCloseTranscriptModal"),
      transcriptDropzone: document.getElementById("transcriptDropzone"),
      transcriptFileInput: document.getElementById("transcriptFileInput"),
      transcriptLoadingSpinner: document.getElementById("transcriptLoadingSpinner"),
      transcriptPreviewContainer: document.getElementById("transcriptPreviewContainer"),
      previewStudentName: document.getElementById("previewStudentName"),
      previewStudentNim: document.getElementById("previewStudentNim"),
      previewStudentIpk: document.getElementById("previewStudentIpk"),
      previewStudentSks: document.getElementById("previewStudentSks"),
      previewTranscriptDate: document.getElementById("previewTranscriptDate"),
      previewCourseCount: document.getElementById("previewCourseCount"),
      btnClearTranscript: document.getElementById("btnClearTranscript"),
      btnSaveTranscript: document.getElementById("btnSaveTranscript"),
    };

    let toastTimer = null;
    function showToast(message, isWarning) {
      if (!elements.toastNotification) return;
      clearTimeout(toastTimer);
      elements.toastMessage.textContent = message;
      elements.toastIcon.textContent = isWarning ? "⚠️" : "✓";
      elements.toastIcon.className = isWarning ? "text-amber-400" : "text-emerald-400";
      elements.toastNotification.classList.remove("translate-y-[-100px]", "opacity-0", "pointer-events-none");
      elements.toastNotification.classList.add("translate-y-0", "opacity-100", "pointer-events-auto");

      toastTimer = setTimeout(function hide() {
        elements.toastNotification.classList.remove("translate-y-0", "opacity-100", "pointer-events-auto");
        elements.toastNotification.classList.add("translate-y-[-100px]", "opacity-0", "pointer-events-none");
      }, 2600);
    }

    // Populate Period Dropdown
    if (elements.periodFilter) {
      elements.periodFilter.replaceChildren();
      const sortedPeriods = periods.slice().sort(function sortPeriods(a, b) {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });
      sortedPeriods.forEach(function appendPeriod(p) {
        const label = p.name + (p.statusBadge ? " (" + p.statusBadge + ")" : "");
        elements.periodFilter.appendChild(createOption(p.id, label));
      });
      elements.periodFilter.value = state.period;
    }

    function populateFilterOptions() {
      const semesters = getUniqueValues(allItems, "semester").sort(function sortSemester(a, b) {
        return a - b;
      });
      const days = getUniqueValues(allItems, "day").sort(compareDays);

      elements.semesterFilter.replaceChildren();
      elements.semesterFilter.appendChild(createOption("all", "Semua semester"));
      semesters.forEach(function appendSem(val) {
        elements.semesterFilter.appendChild(createOption(val, "Semester " + val));
      });
      elements.semesterFilter.value = state.semester;

      elements.dayFilter.replaceChildren();
      elements.dayFilter.appendChild(createOption("all", "Semua hari"));
      days.forEach(function appendDay(val) {
        elements.dayFilter.appendChild(createOption(val, val));
      });
      elements.dayFilter.value = state.day;
    }

    function getSelectedItems() {
      return allItems.filter(function isSelected(item) {
        return state.selectedIds.has(item.id);
      });
    }

    function calculateTotalSks(items) {
      return items.reduce(function sum(total, item) {
        return total + (item.sks || 0);
      }, 0);
    }

    function detectConflictsInSelection(selectedItems) {
      const clashes = [];
      for (let i = 0; i < selectedItems.length; i++) {
        for (let j = i + 1; j < selectedItems.length; j++) {
          const a = selectedItems[i];
          const b = selectedItems[j];
          if (a.courseCode === b.courseCode) {
            clashes.push({
              itemA: a,
              itemB: b,
              type: "same_course",
              message: a.courseName + " dipilih ganda (Kelas " + a.className + " & " + b.className + ")",
            });
          } else if (api.isTimeOverlap(a, b)) {
            clashes.push({
              itemA: a,
              itemB: b,
              type: "time_clash",
              message: a.courseName + " (" + a.className + ") bentrok waktu dengan " + b.courseName + " (" + b.className + ") pada " + a.day + " (" + a.timeRange + " vs " + b.timeRange + ")",
            });
          }
        }
      }
      return clashes;
    }

    function renderHeroMeta(target, items, periodInfo) {
      const periodName = periodInfo ? periodInfo.shortName || periodInfo.name : "Periode Aktif";
      const updatedAt = periodInfo && periodInfo.updatedAt ? "Update: " + periodInfo.updatedAt : "Update terbaru";

      const badges = [
        items.length + " Pilihan Kelas",
        periodName,
        updatedAt,
        "Simulasi Beban SKS",
      ];

      target.replaceChildren();
      badges.forEach(function appendBadge(text, index) {
        const isHighlight = index === 1;
        target.appendChild(
          createBadge(
            text,
            isHighlight
              ? "inline-flex items-center rounded-full border border-blue-600/30 bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs"
              : "inline-flex items-center rounded-full border border-black/5 bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-2xs"
          )
        );
      });
    }

    function renderStats(target, filteredItems, selectedItems) {
      const uniqueCourses = new Set(
        filteredItems.map(function getCourse(item) {
          return item.courseCode || item.course;
        })
      ).size;
      const semesters = getUniqueValues(allItems, "semester").sort(function sortSemester(a, b) {
        return a - b;
      });
      const selectedSks = calculateTotalSks(selectedItems);

      let sksAccent = "bg-blue-600 text-white";
      if (selectedSks > 24) {
        sksAccent = "bg-rose-600 text-white";
      } else if (selectedSks >= 20) {
        sksAccent = "bg-emerald-600 text-white";
      }

      const stats = [
        {
          label: "Kelas Tampil",
          value: String(filteredItems.length),
          accent: "bg-blue-900 text-white",
        },
        {
          label: "Mata Kuliah",
          value: String(uniqueCourses),
          accent: "bg-slate-800 text-white",
        },
        {
          label: "Beban SKS",
          value: selectedSks + " / 24 SKS",
          accent: sksAccent,
        },
        {
          label: "Semester",
          value:
            semesters.length === 0
              ? "-"
              : semesters[0] === semesters[semesters.length - 1]
                ? "Sem " + semesters[0]
                : "Sem " + semesters[0] + " - " + semesters[semesters.length - 1],
          accent: "bg-amber-500 text-white",
        },
      ];

      target.replaceChildren();

      stats.forEach(function appendStat(stat) {
        const card = document.createElement("article");
        card.className = "rounded-xl bg-white/85 p-2 sm:p-2.5 shadow-2xs ring-1 ring-black/5 flex flex-col justify-between";

        const label = document.createElement("p");
        label.className = "text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate";
        label.textContent = stat.label;

        const value = document.createElement("p");
        value.className = "mt-1.5 inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs sm:text-sm font-black " + stat.accent;
        value.textContent = stat.value;

        card.append(label, value);
        target.appendChild(card);
      });
    }

    function toggleSelectClass(itemId) {
      const item = allItems.find(function findItem(it) {
        return it.id === itemId;
      });
      if (!item) return;

      const selected = state.selectedIds.has(itemId);
      if (selected) {
        state.selectedIds.delete(itemId);
        showToast("Kelas " + item.className + " (" + item.courseName + ") dihapus.", false);
      } else {
        const currentSelected = getSelectedItems();
        const conflicts = api.findConflicts(item, currentSelected);
        state.selectedIds.add(itemId);

        const transcriptCourse =
          activeTranscript && activeTranscript.courses ? activeTranscript.courses[item.courseCode] : null;

        if (transcriptCourse && transcriptCourse.isPassed) {
          showToast("ℹ️ Anda sudah menyelesaikan MK ini dengan nilai " + transcriptCourse.grade + " pada transkrip.", false);
        } else if (conflicts.length > 0) {
          showToast("⚠️ Kelas dipilih, namun ada jadwal bentrok!", true);
        } else {
          showToast("✓ " + item.courseName + " (" + item.className + ") ditambahkan.", false);
        }
      }

      saveSelection(state.period, state.selectedIds);
      updateView();
      updateKrsDockAndModal();
    }

    function renderTable(target, items, selectedItems) {
      target.replaceChildren();

      items.forEach(function appendRow(item) {
        const isSelected = state.selectedIds.has(item.id);
        const conflicts = api.findConflicts(item, selectedItems);
        const hasConflict = conflicts.length > 0;

        const transcriptCourse =
          activeTranscript && activeTranscript.courses ? activeTranscript.courses[item.courseCode] : null;
        const isPassed = transcriptCourse && transcriptCourse.isPassed;

        const row = document.createElement("tr");
        row.className =
          "transition text-xs " +
          (isSelected
            ? "bg-blue-50/95 font-medium"
            : isPassed
              ? "bg-emerald-50/25 hover:bg-emerald-50/50"
              : "hover:bg-slate-50/80");

        // Col 1: Action (Pilih)
        const actionCell = document.createElement("td");
        actionCell.className = "px-3 py-2 align-middle text-center";
        const selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className =
          "cursor-pointer text-[11px] font-bold rounded-lg px-2.5 py-1 transition active:scale-95 shadow-2xs " +
          (isSelected
            ? "bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-blue-600/30"
            : isPassed
              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-white hover:bg-blue-50 text-blue-700 border border-blue-200");
        selectBtn.innerHTML = isSelected ? "✓ Terpilih" : isPassed ? "+ Pilih Ulang" : "+ Pilih";
        selectBtn.addEventListener("click", function onSelectClick() {
          toggleSelectClass(item.id);
        });
        actionCell.appendChild(selectBtn);

        // Col 2: Course
        const courseCell = document.createElement("td");
        courseCell.className = "px-4 py-2 align-middle";
        let courseContent = '<div class="font-bold text-slate-900 text-xs sm:text-[13px]">' + item.courseName + '</div><div class="text-[10px] font-mono text-slate-500">' + item.courseCode + "</div>";

        if (isPassed) {
          courseContent += '<div class="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-100/80 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">✓ Sudah Lulus (Nilai: ' + transcriptCourse.grade + ')</div>';
        } else if (hasConflict && !isSelected) {
          courseContent += '<div class="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700">⚠️ Bentrok: ' + conflicts[0].conflictingItem.courseName + " (" + conflicts[0].conflictingItem.className + ")</div>";
        }
        courseCell.innerHTML = courseContent;

        // Col 3: Class Name
        const classCell = document.createElement("td");
        classCell.className = "px-3 py-2 align-middle text-center";
        const classBadge = createBadge(
          item.className,
          "inline-flex items-center rounded-md bg-blue-100/70 border border-blue-200 px-2 py-0.5 text-xs font-black text-blue-900"
        );
        classCell.appendChild(classBadge);

        // Col 4: Schedule
        const scheduleCell = document.createElement("td");
        scheduleCell.className = "px-3 py-2 align-middle text-slate-700";
        scheduleCell.innerHTML = '<span class="font-bold text-slate-900">' + item.day + "</span>, " + (item.timeRange || item.schedule);

        // Col 5: SKS
        const sksCell = document.createElement("td");
        sksCell.className = "px-3 py-2 align-middle text-center font-bold text-slate-800";
        sksCell.textContent = String(item.sks);

        // Col 6: Semester
        const semesterCell = document.createElement("td");
        semesterCell.className = "px-3 py-2 align-middle text-center text-slate-700 font-semibold";
        semesterCell.textContent = String(item.semester);

        // Col 7: Status
        const statusCell = document.createElement("td");
        statusCell.className = "px-4 py-2 align-middle text-center";
        const badge = createBadge(
          item.status,
          "inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700"
        );
        statusCell.appendChild(badge);

        row.append(actionCell, courseCell, classCell, scheduleCell, sksCell, semesterCell, statusCell);
        target.appendChild(row);
      });
    }

    function renderCards(target, items, selectedItems) {
      target.replaceChildren();

      items.forEach(function appendCard(item) {
        const isSelected = state.selectedIds.has(item.id);
        const conflicts = api.findConflicts(item, selectedItems);
        const hasConflict = conflicts.length > 0;

        const transcriptCourse =
          activeTranscript && activeTranscript.courses ? activeTranscript.courses[item.courseCode] : null;
        const isPassed = transcriptCourse && transcriptCourse.isPassed;

        const card = document.createElement("article");
        card.className =
          "rounded-2xl p-3 transition ring-1 " +
          (isSelected
            ? "bg-blue-50/85 ring-blue-500 shadow-sm"
            : isPassed
              ? "bg-emerald-50/25 ring-emerald-300"
              : "bg-white/85 ring-black/5");

        const topRow = document.createElement("div");
        topRow.className = "flex items-start justify-between gap-2";

        const titleWrap = document.createElement("div");
        const title = document.createElement("h3");
        title.className = "text-xs font-bold text-slate-900 leading-snug";
        title.textContent = item.courseName;

        const code = document.createElement("p");
        code.className = "mt-0.5 text-[10px] font-mono text-slate-500";
        code.textContent = item.courseCode;

        const classBadge = createBadge(
          item.className,
          "inline-flex items-center rounded-lg bg-blue-900 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white"
        );

        titleWrap.append(title, code);
        topRow.append(titleWrap, classBadge);

        const detailList = document.createElement("div");
        detailList.className = "mt-2.5 grid gap-1.5 text-[11px] text-slate-600";
        detailList.innerHTML =
          '<div class="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-black/5 font-medium"><span>Jadwal</span><span class="text-right font-bold text-slate-900">' +
          item.schedule +
          '</span></div>' +
          '<div class="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-black/5 font-medium"><span>Semester & SKS</span><span class="font-bold text-slate-900">Semester ' +
          item.semester +
          " • " +
          item.sks +
          " SKS</span></div>";

        let alertMarkup = "";
        if (isPassed) {
          alertMarkup =
            '<div class="mt-2 rounded-lg border border-emerald-200 bg-emerald-100/70 px-2.5 py-1 text-[11px] font-bold text-emerald-800">✓ Sudah Lulus pada Transkrip (Nilai: ' +
            transcriptCourse.grade +
            ")</div>";
        } else if (hasConflict && !isSelected) {
          alertMarkup =
            '<div class="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">⚠️ Bentrok: ' +
            conflicts[0].conflictingItem.courseName +
            " (" +
            conflicts[0].conflictingItem.className +
            ")</div>";
        }

        const bottomRow = document.createElement("div");
        bottomRow.className = "mt-3 flex items-center justify-between gap-2 pt-1.5 border-t border-black/5";

        const statusBadge = createBadge(
          item.status,
          "inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700"
        );

        const selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className =
          "cursor-pointer text-[11px] font-bold rounded-lg px-3 py-1 transition active:scale-95 shadow-2xs " +
          (isSelected
            ? "bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-blue-600/30"
            : isPassed
              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-white hover:bg-blue-50 text-blue-700 border border-blue-200");
        selectBtn.innerHTML = isSelected ? "✓ Terpilih" : isPassed ? "+ Pilih Ulang" : "+ Pilih";
        selectBtn.addEventListener("click", function onCardSelectClick() {
          toggleSelectClass(item.id);
        });

        bottomRow.append(statusBadge, selectBtn);

        card.innerHTML = "";
        card.append(topRow, detailList);
        if (alertMarkup) {
          const div = document.createElement("div");
          div.innerHTML = alertMarkup;
          card.appendChild(div);
        }
        card.appendChild(bottomRow);

        target.appendChild(card);
      });
    }

    function updateSummary(target, filteredItems, allItemsCount) {
      target.textContent =
        "Menampilkan " + filteredItems.length + " dari " + allItemsCount + " pilihan kelas.";
    }

    function syncVisibility(emptyState, resultsSection, hasItems) {
      emptyState.classList.toggle("hidden", hasItems);
      resultsSection.classList.toggle("hidden", !hasItems);
    }

    function updateTranscriptUI() {
      if (!transcriptApi) return;

      if (activeTranscript) {
        // Show Progress Card
        if (elements.transcriptProgressCard) {
          elements.transcriptProgressCard.classList.remove("hidden");
          elements.transcriptStudentName.textContent = activeTranscript.student.name;
          elements.transcriptStudentNim.textContent = activeTranscript.student.nim;
          if (elements.transcriptDateBadge && activeTranscript.dateStr) {
            elements.transcriptDateBadge.textContent = activeTranscript.dateStr;
          }
          elements.transcriptStatsSummary.textContent =
            activeTranscript.stats.sksLulus +
            " / 144 SKS Lulus (" +
            activeTranscript.stats.progressPercent +
            "%) • IPK: " +
            activeTranscript.stats.ipk +
            " • Sisa " +
            activeTranscript.stats.remainingSks +
            " SKS lagi";
          elements.transcriptProgressPercent.textContent = activeTranscript.stats.progressPercent + "%";
          elements.transcriptProgressBar.style.width = activeTranscript.stats.progressPercent + "%";
        }

        // Toolbar Button update
        if (elements.transcriptBtnText) {
          elements.transcriptBtnText.textContent = "Transkrip: " + activeTranscript.stats.sksLulus + " SKS";
        }
        if (elements.transcriptBtnBadge) {
          elements.transcriptBtnBadge.classList.remove("hidden");
        }

        // Validity Check & Warning Banner
        const validity = transcriptApi.checkTranscriptValidity(activeTranscript, state.period);
        if (elements.transcriptValidityBanner && elements.transcriptValidityMessage) {
          if (validity.isOld && !transcriptApi.isWarningDismissed(activeTranscript.dateStr)) {
            elements.transcriptValidityBanner.classList.remove("hidden");
            elements.transcriptValidityMessage.textContent = validity.message;
          } else {
            elements.transcriptValidityBanner.classList.add("hidden");
          }
        }
      } else {
        // Hide Progress Card & Warning Banner
        if (elements.transcriptProgressCard) {
          elements.transcriptProgressCard.classList.add("hidden");
        }
        if (elements.transcriptValidityBanner) {
          elements.transcriptValidityBanner.classList.add("hidden");
        }
        if (elements.transcriptBtnText) {
          elements.transcriptBtnText.textContent = "Upload Transkrip PDF";
        }
        if (elements.transcriptBtnBadge) {
          elements.transcriptBtnBadge.classList.add("hidden");
        }
      }
    }

    function updateKrsDockAndModal() {
      const selectedItems = getSelectedItems();
      const count = selectedItems.length;
      const totalSks = calculateTotalSks(selectedItems);
      const conflicts = detectConflictsInSelection(selectedItems);
      const hasConflict = conflicts.length > 0;

      // Header Quick View Badge
      if (elements.headerKrsBadge) {
        elements.headerKrsBadge.textContent = String(count);
      }

      // Floating Dock
      if (elements.krsDock) {
        if (count > 0) {
          elements.krsDock.classList.remove("translate-y-28", "opacity-0", "pointer-events-none");
          elements.krsDock.classList.add("translate-y-0", "opacity-100", "pointer-events-auto");
          elements.dockSubtitle.textContent = count + " Mata Kuliah • " + totalSks + " / 24 SKS";
          elements.dockCountBadge.textContent = String(count);
          elements.dockConflictBadge.classList.toggle("hidden", !hasConflict);
        } else {
          elements.krsDock.classList.remove("translate-y-0", "opacity-100", "pointer-events-auto");
          elements.krsDock.classList.add("translate-y-28", "opacity-0", "pointer-events-none");
        }
      }

      // Modal Drawer Elements
      const periodInfo = api.getPeriodById(state.period);
      if (elements.modalPeriodSubtitle) {
        elements.modalPeriodSubtitle.textContent =
          "Periode: " + (periodInfo ? periodInfo.name : "-") + " • " + count + " Mata Kuliah Dipilih";
      }

      if (elements.modalConflictBox && elements.modalConflictList) {
        if (hasConflict) {
          elements.modalConflictBox.classList.remove("hidden");
          elements.modalConflictList.replaceChildren();
          conflicts.forEach(function appendConflict(clash) {
            const li = document.createElement("li");
            li.textContent = clash.message;
            elements.modalConflictList.appendChild(li);
          });
        } else {
          elements.modalConflictBox.classList.add("hidden");
        }
      }

      if (elements.modalSksValue && elements.modalSksProgress && elements.modalSksAdvice) {
        elements.modalSksValue.textContent = totalSks + " / 24 SKS";
        const percent = Math.min(100, Math.round((totalSks / 24) * 100));
        elements.modalSksProgress.style.width = percent + "%";

        if (totalSks > 24) {
          elements.modalSksProgress.className = "h-full rounded-full bg-rose-600 transition-all duration-300";
          elements.modalSksAdvice.textContent = "⚠️ Beban SKS melebihi batas maksimal reguler 24 SKS!";
          elements.modalSksAdvice.className = "text-[11px] font-bold text-rose-600";
        } else if (totalSks >= 20) {
          elements.modalSksProgress.className = "h-full rounded-full bg-emerald-600 transition-all duration-300";
          elements.modalSksAdvice.textContent = "Beban SKS ideal untuk semester ini.";
          elements.modalSksAdvice.className = "text-[11px] font-medium text-emerald-700";
        } else {
          elements.modalSksProgress.className = "h-full rounded-full bg-blue-600 transition-all duration-300";
          elements.modalSksAdvice.textContent = "Batas maksimal pengambilan reguler adalah 24 SKS.";
          elements.modalSksAdvice.className = "text-[11px] text-slate-500";
        }

        // Graduation Projection
        if (elements.modalGraduationProjection) {
          if (activeTranscript) {
            const projectedSks = activeTranscript.stats.sksLulus + totalSks;
            const projectedPct = Math.min(100, Math.round((projectedSks / 144) * 100));
            elements.modalGraduationProjection.classList.remove("hidden");
            elements.modalGraduationProjection.textContent =
              "Proyeksi Kelulusan: " + projectedSks + " / 144 SKS (" + projectedPct + "%)";
          } else {
            elements.modalGraduationProjection.classList.add("hidden");
          }
        }
      }

      // Modal Class List
      if (elements.modalClassList) {
        elements.modalClassList.replaceChildren();

        if (count === 0) {
          const emptyItem = document.createElement("div");
          emptyItem.className = "text-center py-6 text-slate-500";
          emptyItem.innerHTML =
            '<p class="font-semibold text-sm">Belum ada kelas yang dipilih.</p><p class="text-xs mt-0.5">Gunakan tombol "+ Pilih" pada daftar tabel atau kartu untuk menambahkan kelas.</p>';
          elements.modalClassList.appendChild(emptyItem);
        } else {
          const sortedSelected = selectedItems.slice().sort(function compare(a, b) {
            return (
              a.semester - b.semester ||
              a.courseName.localeCompare(b.courseName) ||
              a.className.localeCompare(b.className)
            );
          });

          sortedSelected.forEach(function appendItem(it) {
            const rowItem = document.createElement("div");
            rowItem.className =
              "flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs";

            const left = document.createElement("div");
            left.className = "flex-1 min-w-[200px]";
            left.innerHTML =
              '<div class="flex items-center gap-2"><span class="rounded-md bg-blue-900 px-2 py-0.5 text-[10px] font-black text-white uppercase">' +
              it.className +
              '</span><span class="font-bold text-slate-900 text-xs sm:text-sm">' +
              it.courseName +
              '</span></div><div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600"><span>📅 ' +
              it.schedule +
              '</span><span>•</span><span class="font-bold text-blue-700">' +
              it.sks +
              " SKS</span><span>•</span><span>Sem " +
              it.semester +
              "</span></div>";

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className =
              "cursor-pointer rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 transition active:scale-95";
            removeBtn.innerHTML = "Hapus";
            removeBtn.addEventListener("click", function onRemoveClick() {
              toggleSelectClass(it.id);
            });

            rowItem.append(left, removeBtn);
            elements.modalClassList.appendChild(rowItem);
          });
        }
      }
    }

    function openModal() {
      if (!elements.krsModal) return;
      elements.krsModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
      updateKrsDockAndModal();
    }

    function closeModal() {
      if (!elements.krsModal) return;
      elements.krsModal.classList.add("hidden");
      document.body.style.overflow = "";
    }

    // Transcript Modal Functions
    function openTranscriptModal() {
      if (!elements.transcriptModal) return;
      elements.transcriptModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";

      pendingTranscript = null;
      if (elements.btnSaveTranscript) elements.btnSaveTranscript.disabled = true;
      if (elements.transcriptLoadingSpinner) elements.transcriptLoadingSpinner.classList.add("hidden");

      if (activeTranscript) {
        if (elements.btnClearTranscript) elements.btnClearTranscript.classList.remove("hidden");
        showTranscriptPreview(activeTranscript);
      } else {
        if (elements.btnClearTranscript) elements.btnClearTranscript.classList.add("hidden");
        if (elements.transcriptPreviewContainer) elements.transcriptPreviewContainer.classList.add("hidden");
      }
    }

    function closeTranscriptModal() {
      if (!elements.transcriptModal) return;
      elements.transcriptModal.classList.add("hidden");
      document.body.style.overflow = "";
      if (elements.transcriptFileInput) elements.transcriptFileInput.value = "";
    }

    function showTranscriptPreview(data) {
      if (!elements.transcriptPreviewContainer) return;
      elements.previewStudentName.textContent = data.student.name;
      elements.previewStudentNim.textContent = "NIM: " + data.student.nim + " • " + data.student.prodi;
      elements.previewStudentIpk.textContent = "IPK: " + data.stats.ipk;
      elements.previewStudentSks.textContent = data.stats.sksLulus + " / 144 SKS Lulus";
      elements.previewTranscriptDate.textContent = data.dateStr || "-";
      elements.previewCourseCount.textContent = data.courseCount + " MK terdata";
      elements.transcriptPreviewContainer.classList.remove("hidden");
    }

    async function handleTranscriptFile(file) {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Mohon unggah berkas bertipe .pdf", true);
        return;
      }

      if (elements.transcriptLoadingSpinner) elements.transcriptLoadingSpinner.classList.remove("hidden");
      if (elements.transcriptPreviewContainer) elements.transcriptPreviewContainer.classList.add("hidden");
      if (elements.btnSaveTranscript) elements.btnSaveTranscript.disabled = true;

      try {
        const parsed = await transcriptApi.parsePdfFile(file);
        pendingTranscript = parsed;
        if (elements.transcriptLoadingSpinner) elements.transcriptLoadingSpinner.classList.add("hidden");
        showTranscriptPreview(parsed);
        if (elements.btnSaveTranscript) elements.btnSaveTranscript.disabled = false;
        showToast("✓ Transkrip berhasil dibaca! Klik Simpan untuk sinkronisasi.", false);
      } catch (err) {
        if (elements.transcriptLoadingSpinner) elements.transcriptLoadingSpinner.classList.add("hidden");
        showToast(err.message || "Gagal memproses berkas PDF transkrip.", true);
      }
    }

    function resetKrsSelection() {
      if (state.selectedIds.size === 0) return;
      if (confirm("Reset seluruh kelas yang ada di rencana KRS?")) {
        state.selectedIds.clear();
        saveSelection(state.period, state.selectedIds);
        showToast("Rancangan KRS telah direset.", false);
        updateView();
        updateKrsDockAndModal();
      }
    }

    function copyToWhatsApp() {
      const selected = getSelectedItems();
      if (selected.length === 0) {
        showToast("Belum ada kelas yang dipilih untuk disalin.", true);
        return;
      }

      const periodInfo = api.getPeriodById(state.period);
      const totalSks = calculateTotalSks(selected);
      const conflicts = detectConflictsInSelection(selected);

      // Group by Semester
      const bySemester = {};
      selected.forEach(function group(item) {
        const s = item.semester || 0;
        if (!bySemester[s]) bySemester[s] = [];
        bySemester[s].push(item);
      });

      let text = "🎓 *RANCANGAN KRS PJJ SISTEM INFORMASI UNSIA*\n";
      text += "📅 *Periode:* " + (periodInfo ? periodInfo.name : "-") + "\n";
      text += "📊 *Beban:* " + selected.length + " Mata Kuliah (" + totalSks + " SKS)\n";
      if (activeTranscript) {
        text += "📈 *Progres Kelulusan:* " + (activeTranscript.stats.sksLulus + totalSks) + " / 144 SKS (IPK: " + activeTranscript.stats.ipk + ")\n";
      }
      text += "--------------------------------------\n\n";

      const sortedSemesters = Object.keys(bySemester).map(Number).sort(function (a, b) {
        return a - b;
      });

      sortedSemesters.forEach(function formatSem(sem) {
        text += "📌 *Semester " + sem + "*:\n";
        bySemester[sem].sort(function (a, b) {
          return a.courseName.localeCompare(b.courseName) || a.className.localeCompare(b.className);
        }).forEach(function formatItem(it) {
          text += "• " + it.courseName + " [" + it.className + "]\n";
          text += "  📅 " + it.schedule + " • " + it.sks + " SKS\n";
        });
        text += "\n";
      });

      text += "--------------------------------------\n";
      if (conflicts.length > 0) {
        text += "⚠️ *PERHATIAN:* Ditemukan " + conflicts.length + " jadwal bentrok!\n";
      } else {
        text += "✅ *Status:* Jadwal aman (tidak ada bentrok)\n";
      }
      text += "_Disusun mandiri via Pilihan Kelas UNSIA PJJ Sistem Informasi_";

      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text).then(
          function onSuccess() {
            showToast("✓ Jadwal berhasil disalin! Siap dikirim ke WhatsApp.", false);
          },
          function onError() {
            fallbackCopy(text);
          }
        );
      } else {
        fallbackCopy(text);
      }
    }

    function fallbackCopy(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showToast("✓ Jadwal berhasil disalin ke clipboard!", false);
      } catch (_e) {
        showToast("Gagal menyalin otomatis, silakan salin manual.", true);
      }
      document.body.removeChild(textarea);
    }

    function printKrs() {
      const selected = getSelectedItems();
      if (selected.length === 0) {
        showToast("Pilih minimal 1 kelas untuk dicetak.", true);
        return;
      }

      const periodInfo = api.getPeriodById(state.period);
      const totalSks = calculateTotalSks(selected);

      if (elements.printPeriodTitle) {
        let periodDesc = "Periode Akademik: " + (periodInfo ? periodInfo.name : "-");
        if (activeTranscript) {
          periodDesc += " | Mahasiswa: " + activeTranscript.student.name + " (" + activeTranscript.student.nim + ")";
        }
        elements.printPeriodTitle.textContent = periodDesc;
      }
      if (elements.printTotalSks) {
        elements.printTotalSks.textContent = totalSks + " SKS";
      }
      if (elements.printGeneratedDate) {
        const now = new Date();
        elements.printGeneratedDate.textContent =
          "Dicetak pada: " +
          now.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
      }

      if (elements.printTableBody) {
        elements.printTableBody.replaceChildren();
        const sorted = selected.slice().sort(function compare(a, b) {
          return (
            a.semester - b.semester ||
            a.courseName.localeCompare(b.courseName) ||
            a.className.localeCompare(b.className)
          );
        });

        sorted.forEach(function appendRow(it, idx) {
          const tr = document.createElement("tr");
          tr.className = idx % 2 === 1 ? "bg-slate-50" : "";
          tr.innerHTML =
            '<td class="border border-slate-300 p-1.5 text-center">' +
            (idx + 1) +
            '</td>' +
            '<td class="border border-slate-300 p-1.5 font-mono">' +
            it.courseCode +
            '</td>' +
            '<td class="border border-slate-300 p-1.5 font-semibold">' +
            it.courseName +
            '</td>' +
            '<td class="border border-slate-300 p-1.5 text-center font-bold">' +
            it.className +
            '</td>' +
            '<td class="border border-slate-300 p-1.5">' +
            it.schedule +
            '</td>' +
            '<td class="border border-slate-300 p-1.5 text-center font-bold">' +
            it.sks +
            '</td>' +
            '<td class="border border-slate-300 p-1.5 text-center">' +
            it.status +
            '</td>';
          elements.printTableBody.appendChild(tr);
        });
      }

      window.print();
    }

    function updateView() {
      const filteredItems = filterItems(allItems, state, activeTranscript);
      const sortedItems = sortItems(filteredItems, state.sort);
      const selectedItems = getSelectedItems();
      const periodInfo = api.getPeriodById(state.period);

      renderHeroMeta(elements.heroMeta, allItems, periodInfo);
      renderStats(elements.statsGrid, sortedItems, selectedItems);
      renderTable(elements.desktopTableBody, sortedItems, selectedItems);
      renderCards(elements.mobileList, sortedItems, selectedItems);
      updateSummary(elements.resultSummary, sortedItems, allItems.length);
      syncVisibility(elements.emptyState, elements.resultsSection, sortedItems.length > 0);
    }

    // Event Listeners
    elements.searchInput.addEventListener("input", function onSearchInput(event) {
      state.query = event.target.value;
      updateView();
    });

    if (elements.periodFilter) {
      elements.periodFilter.addEventListener("change", function onPeriodChange(event) {
        state.period = event.target.value;
        state.selectedIds = loadSavedSelection(state.period);
        state.semester = "all";
        state.day = "all";
        allItems = api.loadScheduleData(state.period);
        populateFilterOptions();
        updateView();
        updateKrsDockAndModal();
        updateTranscriptUI();
        showToast("Beralih ke " + (api.getPeriodById(state.period).name || "periode baru"), false);
      });
    }

    if (elements.statusFilter) {
      elements.statusFilter.addEventListener("change", function onStatusChange(event) {
        state.statusFilter = event.target.value;
        updateView();
      });
    }

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

    // Modal / Drawer Listeners
    if (elements.btnQuickViewKrs) {
      elements.btnQuickViewKrs.addEventListener("click", openModal);
    }
    if (elements.btnOpenDockDrawer) {
      elements.btnOpenDockDrawer.addEventListener("click", openModal);
    }
    if (elements.btnCloseModal) {
      elements.btnCloseModal.addEventListener("click", closeModal);
    }
    if (elements.krsModalBackdrop) {
      elements.krsModalBackdrop.addEventListener("click", closeModal);
    }
    if (elements.btnResetKrs) {
      elements.btnResetKrs.addEventListener("click", resetKrsSelection);
    }
    if (elements.btnCopyWa) {
      elements.btnCopyWa.addEventListener("click", copyToWhatsApp);
    }
    if (elements.btnPrintKrs) {
      elements.btnPrintKrs.addEventListener("click", printKrs);
    }

    // Transcript Modal & Action Listeners
    if (elements.btnOpenTranscriptModal) {
      elements.btnOpenTranscriptModal.addEventListener("click", openTranscriptModal);
    }
    if (elements.btnManageTranscript) {
      elements.btnManageTranscript.addEventListener("click", openTranscriptModal);
    }
    if (elements.btnUpdateTranscriptPrompt) {
      elements.btnUpdateTranscriptPrompt.addEventListener("click", openTranscriptModal);
    }
    if (elements.btnCloseTranscriptModal) {
      elements.btnCloseTranscriptModal.addEventListener("click", closeTranscriptModal);
    }
    if (elements.transcriptModalBackdrop) {
      elements.transcriptModalBackdrop.addEventListener("click", closeTranscriptModal);
    }

    if (elements.btnDismissValidityWarning) {
      elements.btnDismissValidityWarning.addEventListener("click", function onDismiss() {
        if (activeTranscript && transcriptApi) {
          transcriptApi.dismissWarning(activeTranscript.dateStr);
          elements.transcriptValidityBanner.classList.add("hidden");
        }
      });
    }

    // Dropzone & File Input
    if (elements.transcriptDropzone && elements.transcriptFileInput) {
      elements.transcriptDropzone.addEventListener("click", function () {
        elements.transcriptFileInput.click();
      });

      elements.transcriptFileInput.addEventListener("change", function (e) {
        const file = e.target.files && e.target.files[0];
        if (file) handleTranscriptFile(file);
      });

      elements.transcriptDropzone.addEventListener("dragover", function (e) {
        e.preventDefault();
        elements.transcriptDropzone.classList.add("border-blue-600", "bg-blue-100/60");
      });

      elements.transcriptDropzone.addEventListener("dragleave", function (e) {
        e.preventDefault();
        elements.transcriptDropzone.classList.remove("border-blue-600", "bg-blue-100/60");
      });

      elements.transcriptDropzone.addEventListener("drop", function (e) {
        e.preventDefault();
        elements.transcriptDropzone.classList.remove("border-blue-600", "bg-blue-100/60");
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleTranscriptFile(file);
      });
    }

    if (elements.btnSaveTranscript) {
      elements.btnSaveTranscript.addEventListener("click", function () {
        if (!pendingTranscript) return;
        transcriptApi.saveTranscript(pendingTranscript);
        activeTranscript = pendingTranscript;
        pendingTranscript = null;
        closeTranscriptModal();
        showToast("✓ Transkrip berhasil disimpan & disinkronkan!", false);
        updateTranscriptUI();
        updateView();
        updateKrsDockAndModal();
      });
    }

    if (elements.btnClearTranscript) {
      elements.btnClearTranscript.addEventListener("click", function () {
        if (confirm("Apakah Anda yakin ingin menghapus data transkrip dari browser?")) {
          transcriptApi.clearTranscript();
          activeTranscript = null;
          pendingTranscript = null;
          closeTranscriptModal();
          showToast("Data transkrip telah dihapus.", false);
          updateTranscriptUI();
          updateView();
          updateKrsDockAndModal();
        }
      });
    }

    document.addEventListener("keydown", function onKeyDown(e) {
      if (e.key === "Escape") {
        if (elements.krsModal && !elements.krsModal.classList.contains("hidden")) {
          closeModal();
        }
        if (elements.transcriptModal && !elements.transcriptModal.classList.contains("hidden")) {
          closeTranscriptModal();
        }
      }
    });

    // Initial setup
    populateFilterOptions();
    updateTranscriptUI();
    updateView();
    updateKrsDockAndModal();
  });
})(window);