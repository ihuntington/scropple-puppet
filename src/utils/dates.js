function getDaysInMonths(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDayOfMonth = new Date(0);
    lastDayOfMonth.setFullYear(year, month + 1, 0);
    lastDayOfMonth.setHours(0, 0, 0, 0);
    return lastDayOfMonth.getDate();
}

module.exports = {
    getDaysInMonths,
};