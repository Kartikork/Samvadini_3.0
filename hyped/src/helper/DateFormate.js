import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export function getEventTimeLeft(startAt, endAt) {
    if (!startAt) return '';

    const now = dayjs().tz('Asia/Kolkata');

    const startDateTime = dayjs(startAt, 'DD/MM/YYYY hh:mm A')
        .tz('Asia/Kolkata');

    const endDateTime = endAt
        ? dayjs(endAt, 'DD/MM/YYYY hh:mm A').tz('Asia/Kolkata')
        : null;

    if (endDateTime && now.isAfter(startDateTime) && now.isBefore(endDateTime)) {
        return 'In Progress';
    }

    const diffInMinutes = startDateTime.diff(now, 'minute');
    if (diffInMinutes <= -1) {
        return 'Event passed';
    }

    const diffInDays = startDateTime.startOf('day').diff(now.startOf('day'), 'day');

    if (diffInDays > 1) {
        return `${diffInDays} days left`;
    } else if (diffInDays === 1) {
        return `1 day left`;
    } else {
        return `Today ${startDateTime.format('hh:mm A')}`;
    }
}

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

export const generateUID = () => {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomValue = Array.from({ length: 5 }, () =>
        Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, "0")
    ).join("");
    const counter = Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0");

    return `${timestamp}${randomValue}${counter}`;
};

export const formatDatewithTime = (dateString) => {
    const inputDate = dayjs(dateString);
    const now = dayjs();

    const diffInDays = now.diff(inputDate, 'day');
    const diffInWeeks = now.diff(inputDate, 'week');

    // Same day - show only time
    if (diffInDays === 0) {
        return inputDate.format('h:mm A');
    }
    // Yesterday - show "Yesterday" + time
    else if (diffInDays === 1) {
        return `Yesterday ${inputDate.format('h:mm A')}`;
    }
    // Same week (2-6 days ago) - show day name + time
    else if (diffInWeeks === 0 && diffInDays < 7) {
        return `${inputDate.format('dddd')} ${inputDate.format('h:mm A')}`;
    }
    // Last week (7-13 days ago) - show day name + time
    else if (diffInWeeks === 1 && diffInDays < 14) {
        return `${inputDate.format('h:mm A')}`;
    }
    // Older than 2 weeks - show Indian date format (DD/MM/YYYY) + time
    else {
        return `${inputDate.format('DD/MM/YYYY')} ${inputDate.format('h:mm A')}`;
    }
};