export const formatChatDate = (dateString) => {
    if (!dateString) return '';

    const inputDate = new Date(dateString);
    const now = new Date();

    // Start of today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of yesterday
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    // Format time (12-hour format)
    const formatTime = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours === 0 ? 12 : hours;

        return `${hours}:${minutes} ${ampm}`;
    };

    // Today
    if (inputDate >= todayStart) {
        return `Today ${formatTime(inputDate)}`;
    }

    // Yesterday
    if (inputDate >= yesterdayStart && inputDate < todayStart) {
        return `Yesterday ${formatTime(inputDate)}`;
    }

    // Older dates → DD/MM/YYYY hh:mm AM/PM
    const day = inputDate.getDate().toString().padStart(2, '0');
    const month = (inputDate.getMonth() + 1).toString().padStart(2, '0');
    const year = inputDate.getFullYear();

    return `${day}/${month}/${year}`;
};
