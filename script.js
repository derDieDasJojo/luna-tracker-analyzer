function analyzeJson() {
    const textArea = document.getElementById("jsonInput");
    const fileInput = document.getElementById("jsonFile");
    const formattedTextDiv = document.getElementById("formattedText");
    const tableBody = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
    const breastfeedingChartCtx = document.getElementById("breastfeedingChart").getContext("2d");
    const breastfeedingTimesChartCtx = document.getElementById("breastfeedingTimesChart").getContext("2d");

    // Clear previous results
    formattedTextDiv.innerHTML = "";
    tableBody.innerHTML = "";

    let rawData = textArea.value;

    // If a file is selected, read it
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            rawData = e.target.result;
            processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx);
        };
        reader.readAsText(file);
        return; // Exit early, processing will happen in onload
    }

    // If no file, use textarea content
    processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx);
}

function processData(rawData, formattedTextDiv, tableBody, breastfeedingChartCtx, breastfeedingTimesChartCtx) {
    try {
        const data = JSON.parse(rawData);

        // Format the data and display in text
        let formattedText = formatBreastfeedingEvents(data);
        formattedTextDiv.innerHTML = formattedText;

        // Initialize data structures for charts
        const breastfeedingPerDay = {};
        const breastfeedingPerHour = {};

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

        // Create Breastfeeding Times Chart (Occurrences per Hour)
        const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 hours
        const breastfeedingHourlyCounts = hours.map(hour => breastfeedingPerHour[hour] || 0);

        new Chart(breastfeedingTimesChartCtx, {
            type: 'line',
            data: {
                labels: hours.map(h => h + ":00"),
                datasets: [{
                    label: 'Breastfeeding Occurrences per Hour',
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

    } catch (e) {
        alert("Invalid JSON. Please check your input.");
    }
}

// Function to process and format breastfeeding events
function formatBreastfeedingEvents(data) {
    const events = data.filter(item => item.type.startsWith("BREASTFEEDING"));
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