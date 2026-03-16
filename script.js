function analyzeJson() {
    const textArea = document.getElementById("jsonInput");
    const formattedTextDiv = document.getElementById("formattedText");
    const tableBody = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
    const breastfeedingChartCtx = document.getElementById("breastfeedingChart").getContext("2d");
    const breastfeedingTimesChartCtx = document.getElementById("breastfeedingTimesChart").getContext("2d");

    // Clear previous results
    formattedTextDiv.innerHTML = "";
    tableBody.innerHTML = "";

    const rawData = textArea.value;

    try {
        const data = JSON.parse(rawData);

        // Format the data and display in text
        let formattedText = data.map(item => {
            const date = new Date(item.time * 1000);
            const formattedDate = date.toLocaleDateString("de-DE") + " " + date.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
            return `Time: ${formattedDate}, Type: ${item.type}, Signature: ${item.signature}`;
        }).join("<br>");
        formattedTextDiv.innerHTML = formattedText;

        // Initialize data structures for charts
        const breastfeedingPerDay = {};
        const breastfeedingPerHour = {};

        data.forEach(item => {
            const date = new Date(item.time * 1000);
            const formattedDate = date.toLocaleDateString("de-DE");
            const hour = date.getHours();

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
            } else {
                // Populate table with other data types
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = date.toLocaleDateString("de-DE") + " " + date.toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' });
                row.insertCell(1).textContent = item.type;
                row.insertCell(2).textContent = item.signature;
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