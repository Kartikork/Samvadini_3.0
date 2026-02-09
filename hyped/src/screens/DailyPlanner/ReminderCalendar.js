import { Linking, Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const openPlayStore = async (packageName) => {
    try {
        await Linking.openURL(`market://details?id=${packageName}`);
    } catch {
        await Linking.openURL(`https://play.google.com/store/apps/details?id=${packageName}`);
    }
};

const convertWeekdaysToBYDAY = (days) => {
    const dayMap = {
        Sunday: 'SU',
        Monday: 'MO',
        Tuesday: 'TU',
        Wednesday: 'WE',
        Thursday: 'TH',
        Friday: 'FR',
        Saturday: 'SA',
    };
    return days.map(day => dayMap[day]).filter(Boolean).join(',');
};

const AddReminderCalendar = async ({
    title,
    description,
    startTime,
    date,
    earlyReminder,
    recurrence,
    mediaAttachment = null,
    onSuccess = () => { },
    onError = () => { },
}) => {
    if (Platform.OS !== 'android') return;

    const googleCalendarPackage = 'com.google.android.calendar';
    const formattedTitle = title;
    let formattedDescription = description;

    const dateStr = date || dayjs().format('YYYY-MM-DD');
    const startDateTime = dayjs(`${dateStr} ${startTime}`, 'YYYY-MM-DD hh:mm A');
    const endDateTime = startDateTime.add(1, 'hour');

    const formattedStart = startDateTime.utc().format('YYYYMMDDTHHmmss[Z]');
    const formattedEnd = endDateTime.utc().format('YYYYMMDDTHHmmss[Z]');
    const dates = `${formattedStart}/${formattedEnd}`;

    let recur = '';
    if (recurrence) {
        if (recurrence.type === 'daily') {
            recur = 'RRULE:FREQ=DAILY';
        } else if (recurrence.type === 'weekly') {
            const byDay = convertWeekdaysToBYDAY(recurrence.days);
            recur = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`;
        } else if (recurrence.type === 'monthly') {
            const byMonthDay = recurrence.days.join(',');
            recur = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${byMonthDay}`;
        } else if (recurrence.type === 'once') {
            recur = '';
        }
    }

    if (mediaAttachment) {
        try {
            const mediaDir = `${RNFS.DocumentDirectoryPath}/calendar_media`;
            if (!(await RNFS.exists(mediaDir))) {
                await RNFS.mkdir(mediaDir);
            }

            const fileName = mediaAttachment.name || `media_${Date.now()}.${mediaAttachment.type.split('/')[1]}`;
            const destinationPath = `${mediaDir}/${fileName}`;

            if (mediaAttachment.uri.startsWith('file://')) {
                await RNFS.copyFile(mediaAttachment.uri.replace('file://', ''), destinationPath);
            } else {
                await RNFS.downloadFile({ fromUrl: mediaAttachment.uri, toFile: destinationPath }).promise;
            }

            formattedDescription += `\n\nMedia: ${fileName}\nLocation: ${destinationPath}`;
        } catch (error) {
            console.error('Error handling media attachment:', error);
        }
    }

    try {
        let eventUrl = `https://www.google.com/calendar/render?action=TEMPLATE`;
        eventUrl += `&text=${encodeURIComponent(formattedTitle)}`;
        eventUrl += `&details=${encodeURIComponent(formattedDescription)}`;
        eventUrl += `&dates=${dates}`;
        if (recur) {
            eventUrl += `&recur=${encodeURIComponent(recur)}`;
        }

        const supported = await Linking.canOpenURL(eventUrl);
        if (supported) {
            await Linking.openURL(eventUrl);
            onSuccess();
        } else {
            Alert.alert(
                "Google Calendar Not Found",
                "Would you like to install Google Calendar?",
                [
                    {
                        text: "Cancel",
                        onPress: () => onError(new Error("User canceled installation")),
                        style: "cancel"
                    },
                    {
                        text: "Install",
                        onPress: async () => {
                            try {
                                await openPlayStore(googleCalendarPackage);
                                onSuccess();
                            } catch (error) {
                                onError(error);
                            }
                        }
                    }
                ]
            );
        }
    } catch (error) {
        console.error('Failed to handle calendar operation:', error);
        onError(error);
    }
};

export default AddReminderCalendar;
