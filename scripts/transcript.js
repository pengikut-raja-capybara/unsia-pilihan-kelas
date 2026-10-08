(function attachTranscriptApi(globalScope) {
  const STORAGE_KEY = "unsia_transcript_data";
  const DISMISSED_WARNING_KEY = "unsia_transcript_warning_dismissed";
  const TARGET_S1_SKS = 144;

  const INDO_MONTHS = [
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
  ];

  function parseIndonesianDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const day = parseInt(parts[0], 10);
    const monthIdx = INDO_MONTHS.indexOf(parts[1].toLowerCase());
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || monthIdx === -1 || isNaN(year)) return null;
    return new Date(year, monthIdx, day);
  }

  function cleanString(str, maxLength) {
    if (!str || typeof str !== "string") return "";
    let cleaned = str.replace(/\s+/g, " ").trim();
    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.slice(0, maxLength).trim();
    }
    return cleaned;
  }

  function parseTranscriptText(rawText) {
    if (!rawText || typeof rawText !== "string") return null;

    // 1. Precise Student identity matching with lookahead boundaries
    const nameMatch = rawText.match(/Nama\s*:\s*([A-Za-z\s\.,]+?)(?=\s*(?:Tanggal Lahir|Tahun Masuk|NIM|NO|KODE|\n|\r|$))/i);
    const nimMatch = rawText.match(/NIM\s*:\s*(\d{8,14})/i);
    const prodiMatch = rawText.match(/Program Studi\s*:\s*([A-Za-z\s]+?)(?=\s*(?:NIM|Jenjang|Nama|\n|\r|$))/i);
    const yearMatch = rawText.match(/Tahun Masuk\s*:\s*(\d{4})/i);

    let studentName = nameMatch ? cleanString(nameMatch[1], 50) : "Mahasiswa";
    let studentNim = nimMatch ? nimMatch[1].trim() : "";
    let studentProdi = prodiMatch ? cleanString(prodiMatch[1], 40) : "PJJ Sistem Informasi";
    let studentYear = yearMatch ? yearMatch[1].trim() : "";

    // Extra sanitization to prevent text spillover
    if (studentName.length > 50 || /\d/.test(studentName)) {
      studentName = studentName.split(/\s+(?:Tanggal|Tahun|NIM|NO|\d)/i)[0].trim();
    }
    if (studentProdi.length > 40 || /\d/.test(studentProdi)) {
      studentProdi = studentProdi.split(/\s+(?:NIM|Jenjang|Nama|\d)/i)[0].trim();
    }

    // 2. Transcript signature date
    const dateMatch = rawText.match(/Jakarta,\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
    const dateStr = dateMatch ? dateMatch[1].trim() : "";
    const parsedDate = parseIndonesianDate(dateStr);

    // 3. Stats
    const sksDiambilMatch = rawText.match(/Jumlah SKS Yang Diambil\s*:\s*(\d+)/i);
    const sksLulusMatch = rawText.match(/Jumlah SKS Yang lulus\s*:\s*(\d+)/i);
    const ipkMatch = rawText.match(/Index Prestasi Kumulatif\s*\(IPK\)\s*:\s*([\d\.]+)/i);

    // 4. Parse course rows
    // Regex matches 9-digit code, course name, letter grade, point, SKS, weight
    const courseRegex = /(\d{9})\s*(.+?)\s+([A-E][+-]?)\s+(\d+\.\d{2})\s*(\d)\s+(\d+)/g;
    const courses = {};
    const courseList = [];
    let match;

    while ((match = courseRegex.exec(rawText)) !== null) {
      const code = match[1].trim();
      const name = cleanString(match[2], 80);
      const grade = match[3].trim().toUpperCase();
      const point = match[4].trim();
      const sks = parseInt(match[5], 10) || 0;
      const weight = parseInt(match[6], 10) || 0;

      const courseObj = {
        code: code,
        name: name,
        grade: grade,
        point: point,
        sks: sks,
        weight: weight,
        isPassed: !["D", "E"].includes(grade),
      };

      courses[code] = courseObj;
      courseList.push(courseObj);
    }

    const calculatedSksLulus = courseList.reduce(function sum(total, it) {
      return total + (it.isPassed ? it.sks : 0);
    }, 0);

    const sksLulus = sksLulusMatch ? parseInt(sksLulusMatch[1], 10) : calculatedSksLulus;
    const sksDiambil = sksDiambilMatch ? parseInt(sksDiambilMatch[1], 10) : sksLulus;
    const ipk = ipkMatch ? ipkMatch[1].trim() : "0.00";

    const remainingSks = Math.max(0, TARGET_S1_SKS - sksLulus);
    const progressPercent = Math.min(100, Math.round((sksLulus / TARGET_S1_SKS) * 100));

    return {
      student: {
        name: studentName || "Mahasiswa",
        nim: studentNim,
        prodi: studentProdi || "PJJ Sistem Informasi",
        entryYear: studentYear,
      },
      dateStr: dateStr,
      dateIso: parsedDate ? parsedDate.toISOString() : null,
      stats: {
        sksLulus: sksLulus,
        sksDiambil: sksDiambil,
        ipk: ipk,
        targetSks: TARGET_S1_SKS,
        remainingSks: remainingSks,
        progressPercent: progressPercent,
      },
      courses: courses,
      courseCount: courseList.length,
      uploadedAt: new Date().toISOString(),
    };
  }

  function checkTranscriptValidity(transcript, activePeriod) {
    if (!transcript || !transcript.dateStr) {
      return { isOld: false, message: "" };
    }

    const tDate = parseIndonesianDate(transcript.dateStr);
    if (!tDate) {
      return { isOld: false, message: "" };
    }

    const now = new Date();
    const diffMonths = (now.getFullYear() - tDate.getFullYear()) * 12 + (now.getMonth() - tDate.getMonth());

    let isOld = false;
    let message = "";

    if (diffMonths >= 5) {
      isOld = true;
      message =
        "Transkrip ini tertanggal " +
        transcript.dateStr +
        " (lebih dari " +
        diffMonths +
        " bulan yang lalu). Jika Anda baru saja menyelesaikan semester baru atau ada nilai yang baru terbit di portal, silakan perbarui transkrip untuk memastikan data akurat.";
    }

    return {
      isOld: isOld,
      transcriptDate: transcript.dateStr,
      diffMonths: diffMonths,
      message: message,
    };
  }

  function isWarningDismissed(transcriptDateStr) {
    try {
      const dismissedDate = sessionStorage.getItem(DISMISSED_WARNING_KEY);
      return dismissedDate === transcriptDateStr;
    } catch (_e) {
      return false;
    }
  }

  function dismissWarning(transcriptDateStr) {
    try {
      sessionStorage.setItem(DISMISSED_WARNING_KEY, transcriptDateStr || "yes");
    } catch (_e) {}
  }

  function saveTranscript(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Gagal menyimpan transkrip ke localStorage:", e);
      return false;
    }
  }

  function getTranscript() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.student) {
        if (typeof data.student.name === "string" && (data.student.name.length > 50 || /\d/.test(data.student.name))) {
          data.student.name = data.student.name.split(/\s+(?:Tanggal|Tahun|NIM|NO|\d)/i)[0].trim();
        }
        if (typeof data.student.prodi === "string" && (data.student.prodi.length > 40 || /\d/.test(data.student.prodi))) {
          data.student.prodi = data.student.prodi.split(/\s+(?:NIM|Jenjang|Nama|\d)/i)[0].trim();
        }
      }
      return data;
    } catch (_e) {
      return null;
    }
  }

  function clearTranscript() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(DISMISSED_WARNING_KEY);
      return true;
    } catch (_e) {
      return false;
    }
  }

  async function parsePdfFile(file) {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("Pustaka PDF.js belum dimuat.");
    }

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Preserve physical line breaks by inspecting vertical Y position
      let lastY = null;
      let pageText = "";
      for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i];
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 3) {
          pageText += "\n";
        } else if (pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
          pageText += " ";
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
      fullText += "\n" + pageText;
    }

    const parsed = parseTranscriptText(fullText);
    if (!parsed || parsed.courseCount === 0) {
      throw new Error("Tidak dapat menemukan daftar nilai mata kuliah dalam berkas transkrip ini.");
    }

    return parsed;
  }

  globalScope.TranscriptData = {
    parseIndonesianDate: parseIndonesianDate,
    parseTranscriptText: parseTranscriptText,
    parsePdfFile: parsePdfFile,
    checkTranscriptValidity: checkTranscriptValidity,
    isWarningDismissed: isWarningDismissed,
    dismissWarning: dismissWarning,
    saveTranscript: saveTranscript,
    getTranscript: getTranscript,
    clearTranscript: clearTranscript,
  };
})(window);
