export function convertToDate(dateString) {
    const dateObject = new Date(dateString);
    return dateObject.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
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