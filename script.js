function analyzeJson() {
    const textArea = document.getElementById("jsonInput");
    const fileInput = document.getElementById("jsonFile");
    const formattedTextDiv = document.getElementById("formattedText");
    const tableBody = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
    const breastfeedingChartCtx = document.getElementById("breastfeedingChart").getContext("2d");
    const breastfeedingTimesChartCtx = document.getElementById("breastfeedingTimesChart").getContext("2d");
    const sleepStatusChartCtx = document.getElementById("sleepStatusChart").getContext("2d");
    const accumulatedSleepChartCtx = document.getElementById("accumulatedSleepChart").getContext("2d");
    const formattedSleepTextDiv = document.getElementById("formattedSleepText");

    // Clear previous results
    formattedTextDiv.innerHTML = "";
    tableBody.innerHTML = "";
    formattedSleepTextDiv.innerHTML = "";

    let rawData = textArea.value;

    // If a file is selected, read it
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            rawData = e.target.result;
            processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx, sleepStatusChartCtx, accumulatedSleepChartCtx, formattedSleepTextDiv);
        };
        reader.readAsText(file);
        return; // Exit early, processing will happen in onload
    }

    // If no file, use textarea content
    processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx, sleepStatusChartCtx, accumulatedSleepChartCtx, formattedSleepTextDiv);
}

function processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx, sleepStatusChartCtx, accumulatedSleepChartCtx, formattedSleepTextDiv) {
    try {
        const data = JSON.parse(rawData);

        // Format the data and display in text
        let formattedText = formatBreastfeedingEvents(data);
        formattedTextDiv.innerHTML = formattedText;

        // Initialize data structures for charts
        const breastfeedingPerDay = {};
        const breastfeedingPerHour = {};
        const breastfeedingPerDayPerHour = {};

        data.forEach(item => {
            const date = new Date(item.time * 1000);
            const formattedDate = date.toLocaleDateString("de-DE");
            const hour = date.getHours();

            // Populate table with all data types
            const row = tableBody.insertRow();
            row.insertCell(0).textContent = date.toLocaleDateString("de-DE") + " " + date.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
            row.insertCell(1).textContent = item.type;
            row.insertCell(2).textContent = item.signature;

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
        const breastfeedingDates = Object.keys(breastfeedingPerDay);
        const breastfeedingCounts = Object.values(breastfeedingPerDay);

        new Chart(breastfeedingChartCtx, {
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

        new Chart(breastfeedingTimesChartCtx, {
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
        const dates = Object.keys(breastfeedingPerDayPerHour).sort();
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

        new Chart(dailyPatternsChartCtx, {
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
        // Filter sleep events (entries with notes: "schläft" and "wach")
        const sleepEvents = data.filter(item => item.notes && (item.notes === "schläft" || item.notes === "wach")).sort((a, b) => a.time - b.time);
        
        // Process sleep sessions
        const sleepSessionsByDate = {};
        const accumulatedSleepByDate = {};
        let sleepStartTime = null;

        sleepEvents.forEach(event => {
            const date = new Date(event.time * 1000);
            const dateStr = date.toLocaleDateString("de-DE");
            
            if (event.notes === "schläft") {
                sleepStartTime = date;
            } else if (event.notes === "wach" && sleepStartTime) {
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
        const sleepDates = Object.keys(sleepSessionsByDate).sort();
        
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

        new Chart(sleepStatusChartCtx, {
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
        const sleepDatesForAccumulated = Object.keys(accumulatedSleepByDate).sort();
        const sleepHours = Object.values(accumulatedSleepByDate);

        new Chart(accumulatedSleepChartCtx, {
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
        const formattedSleepText = formatSleepSessions(sleepSessionsByDate);
        formattedSleepTextDiv.innerHTML = formattedSleepText;

    } catch (e) {
        alert("Invalid JSON. Please check your input.");
    }
}

// Function to process and format breastfeeding events
function formatBreastfeedingEvents(data) {
    const events = data.filter(item => item.type.startsWith("BREASTFEEDING")).sort((a, b) => a.time - b.time);
    let formattedEvents = "";
    let previousEndTime = null;
    let currentDate = null;

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const nextEvent = events[i + 1];
        const startTime = new Date(event.time * 1000);
        const endTime = nextEvent ? new Date(nextEvent.time * 1000) : null;

        // Write the date if it's different from the current date
        if (startTime.toDateString() !== currentDate) {
            currentDate = startTime.toDateString();
            formattedEvents += `${currentDate}\n`;
            previousEndTime = null; // Reset previous end time for new date
        }

        // Check if there is a gap of more than 1 hour
        if (previousEndTime && (startTime - previousEndTime) > 3600000) {
            formattedEvents += "\n"; // Add a blank line for a large gap
        }

        // Format the event
        const type = event.type === "BREASTFEEDING_RIGHT_NIPPLE" ? "r" : 
                     event.type === "BREASTFEEDING_LEFT_NIPPLE" ? "l" : "";
        formattedEvents += `${type}:${startTime.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' })}`;
        if (endTime) {
            formattedEvents += ` - ${endTime.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' })}`;
        }
        formattedEvents += "\n";

        previousEndTime = startTime; // Update the previous end time
    }

    return formattedEvents;
}

// Function to format sleep sessions
function formatSleepSessions(sleepSessionsByDate) {
    let formattedSessions = "";
    const dates = Object.keys(sleepSessionsByDate).sort();

    dates.forEach(date => {
        formattedSessions += `${date}\n`;
        
        sleepSessionsByDate[date].forEach(session => {
            const startTime = session.start.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
            const endTime = session.end.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
            const durationHours = session.duration.toFixed(2);
            
            formattedSessions += `${startTime} - ${endTime} (${durationHours}h)\n`;
        });
        
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

        const formattedTextDiv       = document.getElementById("formattedText");
        const tableBody              = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
        const breastfeedingChartCtx  = document.getElementById("breastfeedingChart").getContext("2d");
        const breastfeedingTimesCtx  = document.getElementById("breastfeedingTimesChart").getContext("2d");
        const sleepStatusChartCtx    = document.getElementById("sleepStatusChart").getContext("2d");
        const accumulatedSleepCtx    = document.getElementById("accumulatedSleepChart").getContext("2d");
        const formattedSleepTextDiv  = document.getElementById("formattedSleepText");

        formattedTextDiv.innerHTML      = "";
        tableBody.innerHTML             = "";
        formattedSleepTextDiv.innerHTML = "";

        processData(
            rawData,
            formattedTextDiv,
            tableBody,
            breastfeedingChartCtx,
            breastfeedingTimesCtx,
            sleepStatusChartCtx,
            accumulatedSleepCtx,
            formattedSleepTextDiv
        );

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