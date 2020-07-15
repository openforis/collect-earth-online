export const monthlyMapping = {
    "1": "January",
    "2": "February",
    "3": "March",
    "4": "April",
    "5": "May",
    "6": "June",
    "7": "July",
    "8": "August",
    "9":  "September",
    "10": "October",
    "11": "November",
    "12": "December",
};

export function formatDateISO(date) {
    const month = date.getMonth() + 1; // getMonth() is zero-based
    const day = date.getDate();

    return [
        date.getFullYear(),
        (month > 9 ? "" : "0") + month,
        (day > 9 ? "" : "0") + day,
    ].join("-");
}
