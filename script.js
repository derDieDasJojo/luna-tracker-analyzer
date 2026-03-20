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