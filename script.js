const DEFAULT_VISIBLE_DAY_COUNT = 7;
let showAllDaysInCharts = false;
let lastAnalyzedRawData = null;
let breastfeedingChartInstance = null;
let breastfeedingTimesChartInstance = null;
let dailyPatternsChartInstance = null;
let sleepStatusChartInstance = null;
let accumulatedSleepChartInstance = null;

function getVisibleDateKeys(dateKeys) {
    const sortedDates = [...dateKeys].sort((a, b) => parseDeDateString(a) - parseDeDateString(b));
    if (showAllDaysInCharts) {
        return sortedDates;
    }
    return sortedDates.slice(-DEFAULT_VISIBLE_DAY_COUNT);
}

function parseDeDateString(dateString) {
    const parts = dateString.split(".").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return new Date(dateString);
    }
    const [day, month, year] = parts;
    return new Date(year, month - 1, day);
}

function updateChartDayRange(showAll) {
    showAllDaysInCharts = showAll;

    if (lastAnalyzedRawData) {
        analyzeRawData(lastAnalyzedRawData);
    }
}

function analyzeRawData(rawData) {
    const formattedTextDiv = document.getElementById("formattedText");
    const tableBody = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
    const breastfeedingChartCtx = document.getElementById("breastfeedingChart").getContext("2d");
    const breastfeedingTimesChartCtx = document.getElementById("breastfeedingTimesChart").getContext("2d");
    const sleepStatusChartCtx = document.getElementById("sleepStatusChart").getContext("2d");
    const accumulatedSleepChartCtx = document.getElementById("accumulatedSleepChart").getContext("2d");
    const formattedSleepTextDiv = document.getElementById("formattedSleepText");
    const sleepNotesTableBody = document.getElementById("sleepNotesTable").getElementsByTagName("tbody")[0];

    // Clear previous results
    formattedTextDiv.innerHTML = "";
    tableBody.innerHTML = "";
    formattedSleepTextDiv.innerHTML = "";
    sleepNotesTableBody.innerHTML = "";

    lastAnalyzedRawData = rawData;

    processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx, sleepStatusChartCtx, accumulatedSleepChartCtx, formattedSleepTextDiv, sleepNotesTableBody);
}

function analyzeJson() {
    const textArea = document.getElementById("jsonInput");
    const fileInput = document.getElementById("jsonFile");
    let rawData = textArea.value;

    // If a file is selected, read it
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            rawData = e.target.result;
            analyzeRawData(rawData);
        };
        reader.readAsText(file);
        return; // Exit early, processing will happen in onload
    }

    // If no file, use textarea content
    analyzeRawData(rawData);
}

function processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx, sleepStatusChartCtx, accumulatedSleepChartCtx, formattedSleepTextDiv, sleepNotesTableBody) {
    try {
        const data = JSON.parse(rawData);
        const normalizeString = (value) => String(value || "").trim().toLowerCase();
        const breastfeedingSessions = buildBreastfeedingSessions(data);
        const breastfeedingOverlapIntervals = buildBreastfeedingOverlapIntervals(data);

        // Format the data and display in text
        let formattedText = formatBreastfeedingEvents(breastfeedingSessions);
        formattedTextDiv.innerHTML = formattedText;

        // Initialize data structures for charts
        const breastfeedingPerDay = {};
        const breastfeedingPerHour = {};
        const breastfeedingPerDayPerHour = {};

        data.forEach(item => {
            const date = new Date(item.time * 1000);
            const formattedDate = date.toLocaleDateString("de-DE");
            const hour = date.getHours();
            const itemType = normalizeString(item.type);
            const itemNotes = normalizeString(item.notes);

            // Populate table with all data types
            const row = tableBody.insertRow();
            row.insertCell(0).textContent = date.toLocaleDateString("de-DE") + " " + date.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
            row.insertCell(1).textContent = item.type || "";
            row.insertCell(2).textContent = item.notes || "";

            if (itemType === "note" && (itemNotes === "schläft" || itemNotes === "schlaeft" || itemNotes === "wach")) {
                const sleepRow = sleepNotesTableBody.insertRow();
                sleepRow.insertCell(0).textContent = date.toLocaleDateString("de-DE") + " " + date.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
                sleepRow.insertCell(1).textContent = item.type || "";
                sleepRow.insertCell(2).textContent = item.notes || "";
            }

            // Conditions for Breastfeeding Chart Data
            if (item.type === "BREASTFEEDING_LEFT_NIPPLE" || item.type === "BREASTFEEDING_RIGHT_NIPPLE") {
                if (!breastfeedingPerDay[formattedDate]) {
                    breastfeedingPerDay[formattedDate] = 0;
                }
                breastfeedingPerDay[formattedDate]++;

                if (!breastfeedingPerHour[hour]) {
                    breastfeedingPerHour[hour] = 0;
                }
                breastfeedingPerHour[hour]++;

                // New data structure for daily hourly patterns
                if (!breastfeedingPerDayPerHour[formattedDate]) {
                    breastfeedingPerDayPerHour[formattedDate] = {};
                }
                if (!breastfeedingPerDayPerHour[formattedDate][hour]) {
                    breastfeedingPerDayPerHour[formattedDate][hour] = 0;
                }
                breastfeedingPerDayPerHour[formattedDate][hour]++;
            }
        });

        // Create Breastfeeding Chart (Occurrences per Day)
        const breastfeedingDates = getVisibleDateKeys(Object.keys(breastfeedingPerDay));
        const breastfeedingCounts = breastfeedingDates.map(date => breastfeedingPerDay[date]);

        if (breastfeedingChartInstance) {
            breastfeedingChartInstance.destroy();
        }
        breastfeedingChartInstance = new Chart(breastfeedingChartCtx, {
            type: 'bar',
            data: {
                labels: breastfeedingDates,
                datasets: [{
                    label: 'Breastfeeding Occurrences per Day',
                    data: breastfeedingCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Create Breastfeeding Times Chart (Occurrences per Hour - Aggregated)
        const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 hours
        const breastfeedingHourlyCounts = hours.map(hour => breastfeedingPerHour[hour] || 0);

        if (breastfeedingTimesChartInstance) {
            breastfeedingTimesChartInstance.destroy();
        }
        breastfeedingTimesChartInstance = new Chart(breastfeedingTimesChartCtx, {
            type: 'line',
            data: {
                labels: hours.map(h => h + ":00"),
                datasets: [{
                    label: 'Breastfeeding Occurrences per Hour (All Days)',
                    data: breastfeedingHourlyCounts,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Create Daily Breastfeeding Patterns Chart
        const dailyPatternsChartCtx = document.getElementById("dailyPatternsChart").getContext("2d");
        const dates = getVisibleDateKeys(Object.keys(breastfeedingPerDayPerHour));
        const colors = [
            'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)', 'rgba(83, 102, 255, 1)', 'rgba(255, 99, 255, 1)',
            'rgba(99, 255, 132, 1)', 'rgba(255, 132, 99, 1)', 'rgba(132, 99, 255, 1)',
            'rgba(255, 255, 99, 1)', 'rgba(99, 255, 255, 1)'
        ];

        const datasets = dates.map((date, index) => {
            const hourlyData = hours.map(hour => breastfeedingPerDayPerHour[date][hour] || 0);
            return {
                label: date,
                data: hourlyData,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
                borderWidth: 2,
                fill: false,
                tension: 0.4
            };
        });

        if (dailyPatternsChartInstance) {
            dailyPatternsChartInstance.destroy();
        }
        dailyPatternsChartInstance = new Chart(dailyPatternsChartCtx, {
            type: 'line',
            data: {
                labels: hours.map(h => h + ":00"),
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Breastfeeding Patterns (Occurrences per Hour by Day)'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Breastfeeding Events'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });

        // SLEEP ANALYSIS
        // Filter sleep events (type note and notes: "schläft"/"schlaeft"/"wach")
        const sleepEvents = data
            .filter(item => {
                const itemType = normalizeString(item.type);
                const itemNotes = normalizeString(item.notes);
                return itemType === "note" && (itemNotes === "schläft" || itemNotes === "schlaeft" || itemNotes === "wach");
            })
            .sort((a, b) => a.time - b.time);
        
        // Process sleep sessions
        const sleepSessionsByDate = {};
        const accumulatedSleepByDate = {};
        let sleepStartTime = null;

        sleepEvents.forEach(event => {
            const date = new Date(event.time * 1000);
            const dateStr = date.toLocaleDateString("de-DE");
            const eventNotes = normalizeString(event.notes);
            
            if (eventNotes === "schläft" || eventNotes === "schlaeft") {
                sleepStartTime = date;
            } else if (eventNotes === "wach" && sleepStartTime) {
                // Calculate sleep duration
                const sleepDuration = date - sleepStartTime;
                const sleepDurationHours = sleepDuration / (1000 * 60 * 60);
                
                // Store session
                if (!sleepSessionsByDate[dateStr]) {
                    sleepSessionsByDate[dateStr] = [];
                    accumulatedSleepByDate[dateStr] = 0;
                }
                
                sleepSessionsByDate[dateStr].push({
                    start: sleepStartTime,
                    end: date,
                    duration: sleepDurationHours
                });
                
                accumulatedSleepByDate[dateStr] += sleepDurationHours;
                sleepStartTime = null;
            }
        });

        // Create Sleep Status Chart (Sleep/Awake per Hour by Day)
        const sleepDates = getVisibleDateKeys(Object.keys(sleepSessionsByDate));
        
        const sleepDatasets = sleepDates.map((date, index) => {
            const hourlyData = Array(24).fill(0);
            
            sleepSessionsByDate[date].forEach(session => {
                const startDate = new Date(session.start);
                const endDate = new Date(session.end);
                
                let currentHour = startDate.getHours();
                const endHour = endDate.getHours();
                
                // Mark hours when sleeping
                if (startDate.getDate() === endDate.getDate()) {
                    // All within same day
                    for (let h = currentHour; h <= endHour; h++) {
                        hourlyData[h] = 1;
                    }
                } else {
                    // Sleep spans across days
                    for (let h = currentHour; h < 24; h++) {
                        hourlyData[h] = 1;
                    }
                }
            });
            
            const colors = [
                'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 205, 86, 1)',
                'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
                'rgba(199, 199, 199, 1)', 'rgba(83, 102, 255, 1)', 'rgba(255, 99, 255, 1)',
                'rgba(99, 255, 132, 1)', 'rgba(255, 132, 99, 1)', 'rgba(132, 99, 255, 1)'
            ];
            
            return {
                label: date,
                data: hourlyData,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length].replace('1)', '0.3)'),
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                stepped: true
            };
        });

        if (sleepStatusChartInstance) {
            sleepStatusChartInstance.destroy();
        }
        sleepStatusChartInstance = new Chart(sleepStatusChartCtx, {
            type: 'line',
            data: {
                labels: hours.map(h => h + ":00"),
                datasets: sleepDatasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sleep Status per Day (1 = Sleeping, 0 = Awake)'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1.2,
                        title: {
                            display: true,
                            text: 'Status (0 = Awake, 1 = Sleeping)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day'
                        }
                    }
                }
            }
        });

        // Create Accumulated Sleep Chart
        const sleepDatesForAccumulated = getVisibleDateKeys(Object.keys(accumulatedSleepByDate));
        const sleepHours = sleepDatesForAccumulated.map(date => accumulatedSleepByDate[date]);

        if (accumulatedSleepChartInstance) {
            accumulatedSleepChartInstance.destroy();
        }
        accumulatedSleepChartInstance = new Chart(accumulatedSleepChartCtx, {
            type: 'bar',
            data: {
                labels: sleepDatesForAccumulated,
                datasets: [{
                    label: 'Accumulated Sleep Time (Hours)',
                    data: sleepHours,
                    backgroundColor: 'rgba(100, 200, 100, 0.6)',
                    borderColor: 'rgba(100, 200, 100, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours of Sleep'
                        }
                    }
                }
            }
        });

        // Format sleep sessions text
        const formattedSleepText = formatSleepSessions(sleepSessionsByDate, breastfeedingOverlapIntervals);
        formattedSleepTextDiv.innerHTML = formattedSleepText;

        // Collapse input section now that data is loaded
        document.dispatchEvent(new Event('analyzeComplete'));

    } catch (e) {
        alert("Invalid JSON. Please check your input.");
    }
}

function formatDurationLabel(durationMinutes) {
    const durationHours = Math.floor(durationMinutes / 60);
    const remainingMinutes = durationMinutes % 60;

    return durationHours > 0
        ? `${durationHours}h ${remainingMinutes.toString().padStart(2, "0")}min`
        : `${remainingMinutes}min`;
}

const BREASTFEEDING_START_TYPES = ["BREASTFEEDING_LEFT_NIPPLE", "BREASTFEEDING_RIGHT_NIPPLE"];
const BREASTFEEDING_END_TYPE = "BREASTFEEDING_BOTH_NIPPLE";
const DEFAULT_BREASTFEEDING_DURATION_MINUTES = 20;
const MAX_INFERRED_BREASTFEEDING_DURATION_MINUTES = 45;

function buildBreastfeedingSessions(data) {
    const allBreastfeedingEvents = data
        .filter(item => BREASTFEEDING_START_TYPES.includes(item.type) || item.type === BREASTFEEDING_END_TYPE)
        .sort((a, b) => a.time - b.time);

    const sessions = [];
    
    for (let i = 0; i < allBreastfeedingEvents.length; i++) {
        const event = allBreastfeedingEvents[i];
        
        // Only process start events (LEFT_NIPPLE or RIGHT_NIPPLE)
        if (!BREASTFEEDING_START_TYPES.includes(event.type)) {
            continue;
        }
        
        // Find the next BOTH_NIPPLE event
        let endEvent = null;
        for (let j = i + 1; j < allBreastfeedingEvents.length; j++) {
            if (allBreastfeedingEvents[j].type === BREASTFEEDING_END_TYPE) {
                endEvent = allBreastfeedingEvents[j];
                break;
            }
        }
        
        sessions.push({
            type: event.type,
            start: new Date(event.time * 1000),
            end: endEvent ? new Date(endEvent.time * 1000) : null
        });
    }
    
    return sessions;
}

function buildBreastfeedingOverlapIntervals(data) {
    const defaultDurationMs = DEFAULT_BREASTFEEDING_DURATION_MINUTES * 60000;
    const maxInferredDurationMs = MAX_INFERRED_BREASTFEEDING_DURATION_MINUTES * 60000;
    
    const allBreastfeedingEvents = data
        .filter(item => BREASTFEEDING_START_TYPES.includes(item.type) || item.type === BREASTFEEDING_END_TYPE)
        .sort((a, b) => a.time - b.time);

    const intervals = [];
    
    for (let i = 0; i < allBreastfeedingEvents.length; i++) {
        const event = allBreastfeedingEvents[i];
        
        // Only process start events (LEFT_NIPPLE or RIGHT_NIPPLE)
        if (!BREASTFEEDING_START_TYPES.includes(event.type)) {
            continue;
        }
        
        const start = new Date(event.time * 1000);
        let durationMs = defaultDurationMs;
        let endDate = new Date(start.getTime() + durationMs);
        
        // Find the next BOTH_NIPPLE event
        for (let j = i + 1; j < allBreastfeedingEvents.length; j++) {
            if (allBreastfeedingEvents[j].type === BREASTFEEDING_END_TYPE) {
                const nextEventMs = allBreastfeedingEvents[j].time * 1000;
                const inferredDurationMs = Math.max(0, nextEventMs - start.getTime());
                durationMs = Math.min(inferredDurationMs, maxInferredDurationMs) || defaultDurationMs;
                endDate = new Date(start.getTime() + durationMs);
                break;
            }
        }
        
        intervals.push({
            start,
            end: endDate
        });
    }

    return mergeIntervals(intervals);
}

function mergeIntervals(intervals) {
    if (intervals.length === 0) {
        return [];
    }

    const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);
    const mergedIntervals = [sortedIntervals[0]];

    for (let i = 1; i < sortedIntervals.length; i++) {
        const currentInterval = sortedIntervals[i];
        const lastMergedInterval = mergedIntervals[mergedIntervals.length - 1];

        if (currentInterval.start.getTime() <= lastMergedInterval.end.getTime()) {
            lastMergedInterval.end = new Date(Math.max(lastMergedInterval.end.getTime(), currentInterval.end.getTime()));
            continue;
        }

        mergedIntervals.push({
            start: currentInterval.start,
            end: currentInterval.end
        });
    }

    return mergedIntervals;
}

// Function to process and format breastfeeding events
function formatBreastfeedingEvents(events) {
    let formattedEvents = "";
    let previousEndTime = null;
    let currentDate = null;

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const startTime = event.start;
        const endTime = event.end;

        // Write the date if it's different from the current date
        if (startTime.toDateString() !== currentDate) {
            currentDate = startTime.toDateString();
            formattedEvents += `${currentDate}\n`;
            previousEndTime = null; // Reset previous end time for new date
        }

        // Check if there is a gap of more than 1 hour
        //if (previousEndTime && (startTime - previousEndTime) > 3600000) {
        //    formattedEvents += "\n"; // Add a blank line for a large gap
        //}

        // Format the event
        const type = event.type === "BREASTFEEDING_RIGHT_NIPPLE" ? "r" : 
                     event.type === "BREASTFEEDING_LEFT_NIPPLE" ? "l" : "";
        formattedEvents += `${type}:${startTime.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' })}`;
        if (endTime) {
            formattedEvents += ` - ${endTime.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' })}`;
            const durationMinutes = Math.round((endTime - startTime) / 60000);
            formattedEvents += ` (${formatDurationLabel(durationMinutes)})`;
        }
        formattedEvents += "\n";

        previousEndTime = startTime; // Update the previous end time
    }

    return formattedEvents;
}

function calculateOverlapMinutes(rangeStart, rangeEnd, intervals) {
    return intervals.reduce((totalMinutes, interval) => {
        if (!interval.end || interval.end <= rangeStart || interval.start >= rangeEnd) {
            return totalMinutes;
        }

        const overlapStart = Math.max(rangeStart.getTime(), interval.start.getTime());
        const overlapEnd = Math.min(rangeEnd.getTime(), interval.end.getTime());

        if (overlapEnd <= overlapStart) {
            return totalMinutes;
        }

        return totalMinutes + ((overlapEnd - overlapStart) / 60000);
    }, 0);
}

// Function to format sleep sessions
function formatSleepSessions(sleepSessionsByDate, breastfeedingOverlapIntervals) {
    let formattedSessions = "";
    const dates = Object.keys(sleepSessionsByDate).sort((a, b) => parseDeDateString(a) - parseDeDateString(b));

    dates.forEach(date => {
        formattedSessions += `${date}\n`;
        let totalSleepMinutes = 0;
        let totalOverlapMinutes = 0;
        
        sleepSessionsByDate[date].forEach(session => {
            const startTime = session.start.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
            const endTime = session.end.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
            const durationMinutes = Math.round((session.end - session.start) / 60000);
            const overlapMinutes = calculateOverlapMinutes(session.start, session.end, breastfeedingOverlapIntervals);

            totalSleepMinutes += durationMinutes;
            totalOverlapMinutes += overlapMinutes;
            
            formattedSessions += `${startTime} - ${endTime} (${formatDurationLabel(durationMinutes)})\n`;
        });

        formattedSessions += `Summe Schlaf: ${formatDurationLabel(Math.round(totalSleepMinutes))}\n`;

        if (totalOverlapMinutes > 0) {
            const netSleepMinutes = Math.max(0, totalSleepMinutes - totalOverlapMinutes);
            formattedSessions += `Schlaf ohne Stillzeit: ${formatDurationLabel(Math.round(netSleepMinutes))}\n`;
        }
        
        formattedSessions += "\n";
    });

    return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${formattedSessions}</pre>`;
}

// ── Secure credential storage (localStorage + Web Crypto AES-256-GCM) ─────────
//
// Security model: the password is encrypted with AES-256-GCM before being
// stored in localStorage.  Because this is a purely client-side app there is
// no server-side secret, so the encryption key is stored alongside the
// ciphertext.  This means a determined attacker with DevTools access can
// recover the password; the goal is protection against:
//   • casual localStorage inspection / browser history exports
//   • the password appearing in plaintext in bug reports or screenshots
//   • the old cookie approach which sent credentials with every HTTP request

const STORAGE_KEY_URL      = "webdav_url";
const STORAGE_KEY_USERNAME = "webdav_username";
const STORAGE_KEY_FILEPATH = "webdav_filepath";
const STORAGE_KEY_ENC_PWD  = "webdav_enc_password";
const STORAGE_KEY_ENC_KEY  = "webdav_enc_key";
const STORAGE_KEY_ENC_IV   = "webdav_enc_iv";

// Legacy cookie names – used only to migrate and then erase old plaintext cookies
const LEGACY_COOKIE_NAMES = ["webdav_url", "webdav_username", "webdav_password", "webdav_filepath"];

function _bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function _base64ToBuf(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function encryptPassword(password) {
    const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(password)
    );
    const rawKey = await crypto.subtle.exportKey("raw", key);
    return {
        ciphertext: _bufToBase64(cipherBuf),
        key:        _bufToBase64(rawKey),
        iv:         _bufToBase64(iv)
    };
}

async function decryptPassword(ciphertext, keyB64, ivB64) {
    const key = await crypto.subtle.importKey(
        "raw",
        _base64ToBuf(keyB64),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );
    const plainBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: _base64ToBuf(ivB64) },
        key,
        _base64ToBuf(ciphertext)
    );
    return new TextDecoder().decode(plainBuf);
}

// ── WebDAV / Nextcloud helpers ────────────────────────────────────────────────

async function saveWebDavCredentials(serverUrl, username, password, filePath) {
    localStorage.setItem(STORAGE_KEY_URL,      serverUrl);
    localStorage.setItem(STORAGE_KEY_USERNAME, username);
    localStorage.setItem(STORAGE_KEY_FILEPATH, filePath);

    const { ciphertext, key, iv } = await encryptPassword(password);
    localStorage.setItem(STORAGE_KEY_ENC_PWD, ciphertext);
    localStorage.setItem(STORAGE_KEY_ENC_KEY, key);
    localStorage.setItem(STORAGE_KEY_ENC_IV,  iv);
}

function clearWebDavCredentials() {
    [STORAGE_KEY_URL, STORAGE_KEY_USERNAME, STORAGE_KEY_FILEPATH,
     STORAGE_KEY_ENC_PWD, STORAGE_KEY_ENC_KEY, STORAGE_KEY_ENC_IV
    ].forEach(k => localStorage.removeItem(k));
}

function _clearLegacyCookies() {
    LEGACY_COOKIE_NAMES.forEach(name => {
        document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
    });
}

async function loadWebDavCredentials() {
    // Erase any plaintext cookies left over from the previous implementation
    _clearLegacyCookies();

    const url      = localStorage.getItem(STORAGE_KEY_URL)      || "";
    const username = localStorage.getItem(STORAGE_KEY_USERNAME) || "";
    const filePath = localStorage.getItem(STORAGE_KEY_FILEPATH) || "";
    const encPwd   = localStorage.getItem(STORAGE_KEY_ENC_PWD);
    const encKey   = localStorage.getItem(STORAGE_KEY_ENC_KEY);
    const encIv    = localStorage.getItem(STORAGE_KEY_ENC_IV);

    if (!url && !username && !filePath) return;

    document.getElementById("webdavUrl").value      = url;
    document.getElementById("webdavUsername").value = username;
    document.getElementById("webdavFilePath").value = filePath;
    document.getElementById("webdavRemember").checked = true;

    if (encPwd && encKey && encIv) {
        try {
            const password = await decryptPassword(encPwd, encKey, encIv);
            document.getElementById("webdavPassword").value = password;
        } catch (err) {
            // Decryption failed (e.g. storage was tampered with) – leave field empty
            console.error("WebDAV: failed to decrypt stored password:", err);
        }
    }
}

function setWebDavStatus(message, type) {
    const el = document.getElementById("webdavStatus");
    el.textContent = message;
    el.className = "webdav-status " + type;
}

async function fetchFromNextcloud() {
    const serverUrl = document.getElementById("webdavUrl").value.trim().replace(/\/+$/, "");
    const username  = document.getElementById("webdavUsername").value.trim();
    const password  = document.getElementById("webdavPassword").value;
    const filePath  = document.getElementById("webdavFilePath").value.trim().replace(/^\/+/, "");
    const remember  = document.getElementById("webdavRemember").checked;

    if (!serverUrl || !username || !password || !filePath) {
        setWebDavStatus("Please fill in all Nextcloud connection fields.", "error");
        return;
    }

    // Only allow HTTPS to prevent credentials being sent in plaintext
    if (!serverUrl.startsWith("https://")) {
        setWebDavStatus("Only HTTPS Nextcloud URLs are supported to protect your credentials.", "error");
        return;
    }

    if (remember) {
        await saveWebDavCredentials(serverUrl, username, password, filePath);
    } else {
        clearWebDavCredentials();
    }

    // RFC 7617: the username must not contain a colon
    if (username.includes(":")) {
        setWebDavStatus("Username must not contain a colon character.", "error");
        return;
    }

    const encodedFilePath = filePath.split("/").map(encodeURIComponent).join("/");
    const webdavUrl = `${serverUrl}/remote.php/dav/files/${encodeURIComponent(username)}/${encodedFilePath}`;

    // btoa only handles Latin-1; encode non-ASCII chars first so the
    // Authorization header is well-formed for any username/password.
    const credentials = btoa(
        unescape(encodeURIComponent(username)) + ":" + unescape(encodeURIComponent(password))
    );

    setWebDavStatus("Fetching file from Nextcloud…", "loading");

    try {
        const response = await fetch(webdavUrl, {
            method: "GET",
            credentials: "omit",
            headers: {
                "Authorization": `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            setWebDavStatus(
                `Failed to fetch file: ${response.status} ${response.statusText}. ` +
                "Check URL, credentials and file path. " +
                "Also make sure your Nextcloud server allows CORS requests from this origin.",
                "error"
            );
            return;
        }

        const rawData = await response.text();

        analyzeRawData(rawData);

        setWebDavStatus("File fetched and analyzed successfully.", "success");
    } catch (err) {
        setWebDavStatus(
            `Error fetching from Nextcloud: ${err.message}. ` +
            "Make sure your Nextcloud server allows CORS requests from this page.",
            "error"
        );
    }
}

// Auto-load saved WebDAV connection on page load
document.addEventListener("DOMContentLoaded", loadWebDavCredentials);
document.addEventListener("DOMContentLoaded", function() {
    const showAllDaysToggle = document.getElementById("showAllDaysToggle");
    if (!showAllDaysToggle) {
        return;
    }

    showAllDaysToggle.checked = false;
    showAllDaysToggle.addEventListener("change", function() {
        updateChartDayRange(showAllDaysToggle.checked);
    });
});