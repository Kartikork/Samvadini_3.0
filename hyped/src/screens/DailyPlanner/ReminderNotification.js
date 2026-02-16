import React, { useEffect } from 'react';
import notifee, {
    TriggerType,
    AuthorizationStatus,
    EventType,
    AndroidImportance,
} from '@notifee/react-native';

async function requestNotificationPermission() {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
}

const ReminderNotification = () => {
    useEffect(() => {
        const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
            if (type === EventType.PRESS) {
                console.log('User tapped notification:', detail.notification);
            }
        });
        requestNotificationPermission();
        return () => {
            unsubscribe();
        };
    }, []);
    return null;
};

export async function scheduleReminder(payload) {
    let settings = await notifee.getNotificationSettings();
    let hasPermission = settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    if (!hasPermission) {
        hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.log('Permissions denied - cannot schedule');
            return;
        }
    }
    const channelId = await notifee.createChannel({
        id: 'reminders',
        name: 'Reminders',
        sound: 'default',
        vibration: true,
        importance: AndroidImportance.HIGH,
    });

    const earlyMinutes = parseInt(payload.earlyReminder) || 15;

    if (payload.repeat === 'Once') {
        const eventDate = combineDateAndTime(payload.date, payload.startTime);
        await scheduleForDate(eventDate, payload, channelId, earlyMinutes);
    } else if (payload.repeat === 'Weekly') {
        for (const day of payload.weekly) {
            const eventDate = getNextWeekday(day, payload.startTime);
            if (!eventDate) {
                console.log('Skipping invalid weekday:', day);
                continue;
            }
            await scheduleForDate(eventDate, payload, channelId, earlyMinutes);
        }
    } else if (payload.repeat === 'Monthly') {
        for (const day of payload.monthly) {
            const eventDate = getNextMonthlyDate(parseInt(day), payload.startTime);
            if (!eventDate) {
                console.log('Skipping invalid monthly date:', day);
                continue;
            }
            await scheduleForDate(eventDate, payload, channelId, earlyMinutes);
        }
    }
}

async function scheduleForDate(eventDate, payload, channelId, earlyMinutes) {
    if (eventDate.getTime() <= Date.now()) {
        console.log('Event date is in the past, skipping:', eventDate);
        return;
    }

    const mainTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: eventDate.getTime(),
    };

    await notifee.createTriggerNotification(
        {
            title: `Event: ${payload.title}`,
            body: payload.description,
            android: {
                channelId,
                smallIcon: 'ic_notification',
            },
            ios: { sound: 'default' },
        },
        mainTrigger
    );

    const earlyDate = new Date(eventDate.getTime() - earlyMinutes * 60 * 1000);
    if (earlyDate.getTime() > Date.now()) {
        const earlyTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: earlyDate.getTime(),
        };

        await notifee.createTriggerNotification(
            {
                title: `Reminder: ${payload.title}`,
                body: `${earlyMinutes} minutes until your event!`,
                android: {
                    channelId,
                    smallIcon: 'ic_notification',
                },
                ios: { sound: 'default' },
            },
            earlyTrigger
        );
    }
}

function combineDateAndTime(dateString, timeString) {
    timeString = sanitizeTimeString(timeString);
    const [hourMinute, period] = timeString.split(' ');
    const [hour, minute] = hourMinute.split(':').map(Number);
    let h = hour;
    if (period.toUpperCase() === 'PM' && hour !== 12) {
        h = hour + 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        h = 0;
    }
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, h, minute, 0);
    return date;
}

function getNextWeekday(dayName, timeString) {
    timeString = sanitizeTimeString(timeString);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const todayIndex = today.getDay();
    const targetIndex = daysOfWeek.indexOf(dayName);

    if (targetIndex === -1) {
        console.log('Invalid weekday name:', dayName);
        return null;
    }

    let daysToAdd = (targetIndex + 7 - todayIndex) % 7;

    if (daysToAdd === 0) {
        if (hasTimePassed(today, timeString)) {
            daysToAdd = 7;
        }
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);

    const [hourMinute, period] = timeString.split(' ');
    const [hour, minute] = hourMinute.split(':').map(Number);
    let h = hour;
    if (period.toUpperCase() === 'PM' && hour !== 12) {
        h = hour + 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        h = 0;
    }
    targetDate.setHours(h);
    targetDate.setMinutes(minute);
    targetDate.setSeconds(0);
    return targetDate;
}

function hasTimePassed(today, timeString) {
    timeString = sanitizeTimeString(timeString);
    const [hourMinute, period] = timeString.split(' ');
    const [hour, minute] = hourMinute.split(':').map(Number);
    let h = hour;
    if (period.toUpperCase() === 'PM' && hour !== 12) {
        h = hour + 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        h = 0;
    }

    if (h < today.getHours()) return true;
    if (h === today.getHours() && minute <= today.getMinutes()) return true;
    return false;
}

function getNextMonthlyDate(day, timeString) {
    timeString = sanitizeTimeString(timeString);
    const today = new Date();
    let month = today.getMonth();
    let year = today.getFullYear();

    if (today.getDate() > day || (today.getDate() === day && hasTimePassed(today, timeString))) {
        month += 1;
        if (month > 11) {
            month = 0;
            year += 1;
        }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (day > daysInMonth) {
        console.log('Invalid date, skipping:', day);
        return null;
    }

    const targetDate = new Date(year, month, day);
    const [hourMinute, period] = timeString.split(' ');
    const [hour, minute] = hourMinute.split(':').map(Number);
    let h = hour;
    if (period.toUpperCase() === 'PM' && hour !== 12) {
        h = hour + 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        h = 0;
    }
    targetDate.setHours(h);
    targetDate.setMinutes(minute);
    targetDate.setSeconds(0);
    return targetDate;
}

function sanitizeTimeString(timeString) {
    if (!timeString) return '';
    return timeString.replace(/\u202F|\u00A0/g, ' ').trim();
}

export default ReminderNotification;
