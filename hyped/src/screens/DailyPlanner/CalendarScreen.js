import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/Ionicons";

export default function CalendarScreen() {
  const [selected, setSelected] = useState("2025-11-21");

  const [currentMonth, setCurrentMonth] = useState("2025-11-01");

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const getMonthName = (dateString) => {
    const date = new Date(dateString);
    return monthNames[date.getMonth()];
  };

  const getYear = (dateString) => {
    return new Date(dateString).getFullYear();
  };

  const goNextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date.toISOString().split("T")[0]);
  };

  const goPrevMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date.toISOString().split("T")[0]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.arrowBtn} onPress={goPrevMonth}>
          <Icon name="chevron-back-outline" size={24} color="#000" />
        </TouchableOpacity>
        <View>
          <Text style={styles.monthText}>{getMonthName(currentMonth)}</Text>
          <Text style={styles.yearText}>{getYear(currentMonth)}</Text>
        </View>
        <TouchableOpacity style={styles.arrowBtn} onPress={goNextMonth}>
          <Icon name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <Calendar
        current={currentMonth}
        hideArrows={true}
        hideExtraDays={true}
        firstDay={1}
        markingType={"custom"}
        markedDates={{
          [selected]: {
            customStyles: {
              container: styles.selectedDate,
              text: styles.selectedDateText,
              paddingBottom: 0
            },
          },
        }}

        onMonthChange={(month) => {
          setCurrentMonth(`${month.year}-${String(month.month).padStart(2, "0")}-01`);
        }}

        onDayPress={(day) => setSelected(day.dateString)}
        theme={{
          textMonthFontSize: 1,
          monthTextColor: "transparent",
          textDayFontSize: 16,
          textDayHeaderFontSize: 14,
          todayTextColor: "#000",
          dayTextColor: "#7d7d7d",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {   
    backgroundColor: "#fff",
    width:"100%",
    marginTop: 10,
  },

  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthText: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  yearText: {
    fontSize: 14,
    color: "#8c8c8c",
    textAlign: "center",
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: "#F6F6F6",
    borderRadius: 10,
  },

  selectedDate: {
    backgroundColor: "#7E38FF",
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDateText: {
    color: "#fff",
    fontWeight: "700",
  },
});
