// Function to process and format events data
function formatBreastfeedingEvents(events) {
  // Utility function to parse date-time
  const parseDateTime = (dateTime) => new Date(dateTime);

  // Utility function to calculate difference in hours
  const getHoursDifference = (start, end) => Math.abs((end - start) / (1000 * 60 * 60));

  // Replace types with 'r', 'l', or skip if not breastfeeding
  events = events
    .filter(event => event.type.startsWith("BREASTFEEDING"))
    .map(event => ({
      type: event.type === "BREASTFEEDING_RIGHT_NIPPLE" ? "r" :
            event.type === "BREASTFEEDING_LEFT_NIPPLE" ? "l" :
            "",
      startTime: parseDateTime(event.startTime),
    }))
    .filter(event => event.type); // Remove entries without 'r' or 'l'

  let output = "";
  let lastEventTime = null;
  let lastEventDate = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const nextEvent = events[i + 1]; // Lookahead for end time
    const nextDayCheck = event.startTime.toDateString() !== lastEventDate;

    if (nextDayCheck) {
      output += event.startTime.toDateString() + "\n";
      lastEventDate = event.startTime.toDateString();
      lastEventTime = null; // Reset lastEventTime to separate different days
    }

    const endTime = nextEvent && nextEvent.type === "" ? nextEvent.startTime : null;
    const formattedEvent = `${event.type}:${event.startTime} + realExamToe.FormatTest

Correctly phrased completion of the above snippet will be below