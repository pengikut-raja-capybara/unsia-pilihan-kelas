(function attachScheduleDataApi(globalScope) {
  function parseCourse(course) {
    const separator = course.indexOf(" - ");

    if (separator === -1) {
      return {
        courseCode: course.trim(),
        courseName: course.trim(),
      };
    }

    return {
      courseCode: course.slice(0, separator).trim(),
      courseName: course.slice(separator + 3).trim(),
    };
  }

  function parseMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") {
      return 0;
    }
    const parts = timeStr.trim().split(":");
    if (parts.length < 2) {
      return 0;
    }
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hours * 60 + mins;
  }

  function parseSchedule(schedule) {
    if (!schedule || typeof schedule !== "string") {
      return {
        day: "",
        timeRange: "",
        startTime: "",
        endTime: "",
        startMinutes: 0,
        endMinutes: 0,
      };
    }

    const commaIndex = schedule.indexOf(",");
    if (commaIndex === -1) {
      return {
        day: schedule.trim(),
        timeRange: "",
        startTime: "",
        endTime: "",
        startMinutes: 0,
        endMinutes: 0,
      };
    }

    const day = schedule.slice(0, commaIndex).trim();
    const timeRange = schedule.slice(commaIndex + 1).trim();
    const timeParts = timeRange.split("-");

    const startTime = timeParts[0] ? timeParts[0].trim() : "";
    const endTime = timeParts[1] ? timeParts[1].trim() : "";

    return {
      day: day,
      timeRange: timeRange,
      startTime: startTime,
      endTime: endTime,
      startMinutes: parseMinutes(startTime),
      endMinutes: parseMinutes(endTime),
    };
  }

  function isTimeOverlap(slotA, slotB) {
    if (!slotA.day || !slotB.day || slotA.day.toLowerCase() !== slotB.day.toLowerCase()) {
      return false;
    }
    if (slotA.startMinutes === 0 && slotA.endMinutes === 0) {
      return false;
    }
    if (slotB.startMinutes === 0 && slotB.endMinutes === 0) {
      return false;
    }
    return slotA.startMinutes < slotB.endMinutes && slotB.startMinutes < slotA.endMinutes;
  }

  function getPeriods() {
    if (globalScope.SCHEDULE_PERIODS && typeof globalScope.SCHEDULE_PERIODS === "object") {
      const keys = Object.keys(globalScope.SCHEDULE_PERIODS);
      if (keys.length > 0) {
        return keys.map(function mapPeriod(key) {
          return globalScope.SCHEDULE_PERIODS[key];
        });
      }
    }

    return [
      {
        id: "default",
        name: "Semester Aktif",
        shortName: "Aktif",
        updatedAt: "Terbaru",
        statusBadge: "Aktif",
        isDefault: true,
        data: Array.isArray(globalScope.SCHEDULE_DATA) ? globalScope.SCHEDULE_DATA : [],
      },
    ];
  }

  function getPeriodById(periodId) {
    const periods = getPeriods();
    if (!periodId) {
      return periods.find(function isDefault(p) { return p.isDefault; }) || periods[0];
    }
    return periods.find(function matches(p) { return p.id === periodId; }) || periods[0];
  }

  function loadScheduleData(periodIdOrSource) {
    let rawItems = [];
    let periodInfo = null;

    if (globalScope.SCHEDULE_PERIODS && typeof periodIdOrSource === "string" && globalScope.SCHEDULE_PERIODS[periodIdOrSource]) {
      periodInfo = globalScope.SCHEDULE_PERIODS[periodIdOrSource];
      rawItems = Array.isArray(periodInfo.data) ? periodInfo.data : [];
    } else if (Array.isArray(globalScope.SCHEDULE_DATA)) {
      rawItems = globalScope.SCHEDULE_DATA;
      periodInfo = getPeriodById(periodIdOrSource);
    } else {
      const source = document.getElementById(periodIdOrSource || "schedule-data");
      if (source) {
        try {
          const parsed = JSON.parse(source.textContent || "[]");
          rawItems = Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
          rawItems = [];
        }
      }
      periodInfo = getPeriodById(periodIdOrSource);
    }

    const currentPeriodId = periodInfo ? periodInfo.id : "default";

    return rawItems.map(function mapItem(item, index) {
      const course = typeof item.course === "string" ? item.course.trim() : "";
      const className = typeof item.className === "string" ? item.className.trim() : "";
      const schedule = typeof item.schedule === "string" ? item.schedule.trim() : "";
      const sks = Number(item.sks || 0);
      const semester = Number(item.semester || 0);
      const status = typeof item.status === "string" ? item.status.trim() : "";
      const courseParts = parseCourse(course);
      const scheduleDetails = parseSchedule(schedule);

      return {
        id: currentPeriodId + "-" + className + "-" + index,
        periodId: currentPeriodId,
        course: course,
        courseCode: courseParts.courseCode,
        courseName: courseParts.courseName,
        className: className,
        day: scheduleDetails.day,
        timeRange: scheduleDetails.timeRange,
        startTime: scheduleDetails.startTime,
        endTime: scheduleDetails.endTime,
        startMinutes: scheduleDetails.startMinutes,
        endMinutes: scheduleDetails.endMinutes,
        schedule: schedule,
        sks: sks,
        semester: semester,
        status: status,
      };
    });
  }

  function findConflicts(targetItem, selectedItems) {
    const conflicts = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      if (item.id === targetItem.id) {
        continue;
      }

      // Check same course conflict (already taking another class for the same course)
      if (item.courseCode === targetItem.courseCode) {
        conflicts.push({
          conflictingItem: item,
          type: "same_course",
          message: "Mata kuliah sama dengan " + item.courseName + " (" + item.className + ")",
        });
        continue;
      }

      // Check time overlap
      if (isTimeOverlap(targetItem, item)) {
        conflicts.push({
          conflictingItem: item,
          type: "time_clash",
          message: "Jadwal bentrok dengan " + item.courseName + " (" + item.className + ", " + item.schedule + ")",
        });
      }
    }

    return conflicts;
  }

  globalScope.ScheduleData = {
    parseCourse: parseCourse,
    parseSchedule: parseSchedule,
    isTimeOverlap: isTimeOverlap,
    getPeriods: getPeriods,
    getPeriodById: getPeriodById,
    loadScheduleData: loadScheduleData,
    findConflicts: findConflicts,
  };
})(window);