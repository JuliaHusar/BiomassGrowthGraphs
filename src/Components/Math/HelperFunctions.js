export function convertToDate(dateString) {
    const dateObject = new Date(dateString);
    return dateObject.toLocaleDateString('en-US', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric'
    });
}
export function convertToHour(dateString) {
    const dateObject = new Date(dateString);
    return dateObject.toLocaleDateString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
}
export function datesWithinRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {

        dates.push(new Date(d).toDateString());
    }
    return dates;
}

export function aggregateDataIntoDayParts(dataType, granularity, date, data) {
    const filteredDates = data.filter((dataPoint) => {
        console.log(dataPoint)
        const sensorDate = new Date(dataPoint.LocalTime)
        const datePassed = date.toDateString();
        return sensorDate === datePassed;
    });
    console.log(filteredDates);
}