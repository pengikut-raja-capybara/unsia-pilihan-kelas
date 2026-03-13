(function attachScheduleDataApi(globalScope) {
  function parseCourse(course) {
    const separator = course.indexOf(" - ");

    if (separator === -1) {
      return {
        courseCode: course,
        courseName: course,
      };
    }

    return {
      courseCode: course.slice(0, separator),
      courseName: course.slice(separator + 3),
    };
  }

  function loadScheduleData(sourceId) {
    let rawItems = [];

    if (Array.isArray(globalScope.SCHEDULE_DATA)) {
      rawItems = globalScope.SCHEDULE_DATA;
    } else {
      const source = document.getElementById(sourceId || "schedule-data");

      if (!source) {
        return [];
      }

      try {
        const parsed = JSON.parse(source.textContent || "[]");
        rawItems = Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        rawItems = [];
      }
    }

    return rawItems.map(function mapItem(item, index) {
      const course = typeof item.course === "string" ? item.course.trim() : "";
      const className = typeof item.className === "string" ? item.className.trim() : "";
      const schedule = typeof item.schedule === "string" ? item.schedule.trim() : "";
      const sks = Number(item.sks || 0);
      const semester = Number(item.semester || 0);
      const status = typeof item.status === "string" ? item.status.trim() : "";
      const courseParts = parseCourse(course);
      const day = schedule.split(",")[0] ? schedule.split(",")[0].trim() : "";

      return {
        id: className + "-" + index,
        course: course,
        courseCode: courseParts.courseCode,
        courseName: courseParts.courseName,
        className: className,
        day: day,
        schedule: schedule,
        sks: sks,
        semester: semester,
        status: status,
      };
    });
  }

  globalScope.ScheduleData = {
    loadScheduleData: loadScheduleData,
  };
})(window);