/**
 * DateSeparator - Shows date divider between messages
 * 
 * Displays: "Today", "Yesterday", or formatted date
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DateSeparatorProps {
  timestamp: number;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ timestamp }) => {
  const dateText = formatDateSeparator(timestamp);

  return (
    <View style={styles.container}>
      <View style={styles.separator}>
        <Text style={styles.text}>{dateText}</Text>
      </View>
    </View>
  );
};

/**
 * Format date for separator
 * Returns "Today", "Yesterday", or "MMM DD, YYYY"
 */
function formatDateSeparator(timestamp: number): string {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to midnight for comparison
  const resetTime = (date: Date) => {
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const messageDateMidnight = resetTime(new Date(messageDate));
  const todayMidnight = resetTime(new Date(today));
  const yesterdayMidnight = resetTime(new Date(yesterday));

  if (messageDateMidnight.getTime() === todayMidnight.getTime()) {
    return 'Today';
  }

  if (messageDateMidnight.getTime() === yesterdayMidnight.getTime()) {
    return 'Yesterday';
  }

  // Format as "Jan 15, 2026"
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const month = months[messageDate.getMonth()];
  const day = messageDate.getDate();
  const year = messageDate.getFullYear();

  return `${month} ${day}, ${year}`;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  separator: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
});

export default React.memo(DateSeparator);

