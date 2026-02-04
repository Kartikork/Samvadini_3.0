import React, { useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  Alert,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../navigation/MainNavigator";

type CarouselNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Carousel() {
  const navigation = useNavigation<CarouselNavigationProp>();
  const flatListRef = useRef<FlatList>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const ScreenData = [
    {
      id: "1",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "Category",
      bgColor: "#AF7373",
      params: {
        screen: 'Category',
        id: 'Central Govt. Schemes, Policies',
        title: 'Central Govt. Schemes, Policies',
        name: 'govtSchemes',
      }
    },
    {
      id: "2",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "LanguageGameScreen",
      bgColor: "#5D5FEF",
      params: {
        screen: 'Category',
        id: 'Central Govt. Schemes, Policies',
        title: 'Central Govt. Schemes, Policies',
        name: 'govtSchemes',
      }
    },
    {
      id: "3",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "lingoweb",
      bgColor: "#0293A3",
      params: {
        screen: 'Category',
        id: 'Central Govt. Schemes, Policies',
        title: 'Central Govt. Schemes, Policies',
        name: 'govtSchemes',
      }
    },
    {
      id: "6",
      title: "Planner",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "DailyPlanner",
      bgColor: "#0787d2",
      params: {},
    },
    {
      id: "7",
      title: "AddReminder",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "AddReminder",
      bgColor: "#6362a7",
      params: {},
    },
    {
      id: "5",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "JobScreen",
      bgColor: "#7A76B5",
      params: {
        screen: 'JobScreen',
        id: 'Jobs, Internships, Apprenticeships',
        title: 'Jobs, Internships, Apprenticeships',
        name: 'jobs',
      }
    },
    {
      id: "8",
      title: "Business",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "Category",
      bgColor: "#EE898B",
      params: {
        screen: 'Category',
        id: 'Business, Startups, Entrepreneurship',
        title: 'Business, Startups, Entrepreneurship',
        name: 'business',
      },
    },
    {
      id: "9",
      title: "Women",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "Category",
      bgColor: "#FE4AD7",
      params: {
        screen: 'Category',
        id: 'Women empowerment, Parenting, Children care',
        title: 'Women empowerment, Parenting, Children care',
        name: 'women',
      }
    },
    {
      id: "10",
      title: "Farmers",
      image: require("../../../assets/images/Dummy.jpeg"),
      screen: "Category",
      bgColor: "#AD6B55",
      params: {
        screen: 'Category',
        id: 'Farmers, Agriculture, Rural Development',
        title: 'Farmers, Agriculture, Rural Development',
        name: 'agriculture',
      },
    },
  ];

  const width = Dimensions.get("window").width;
  const itemsPerPage = 6;
  const marginHorizontal = 5;
  const itemWidth = (width - 2 * marginHorizontal * itemsPerPage) / itemsPerPage;
  const totalItemWidth = itemWidth + 2 * marginHorizontal;
  const maxOffset = Math.max((ScreenData.length - itemsPerPage) * totalItemWidth, 0);

  const handlePrev = () => {
    const newOffset = Math.max(scrollOffset - totalItemWidth, 0);
    flatListRef.current?.scrollToOffset({ offset: newOffset, animated: true });
    setScrollOffset(newOffset);
  };

  const handleNext = () => {
    const newOffset = Math.min(scrollOffset + totalItemWidth, maxOffset);
    flatListRef.current?.scrollToOffset({ offset: newOffset, animated: true });
    setScrollOffset(newOffset);
  };

  const renderItem = ({ item }: { item: typeof ScreenData[0] }) => (
    <TouchableOpacity
      style={[
        styles.imageContainer,
        { backgroundColor: item.bgColor, width: itemWidth },
      ]}
      onPress={() => {
        if (item.id === "4") {
          Alert.alert("Attention", "This feature is coming soon...");
        } else {
          // Type assertion needed for navigation params
          (navigation as any).navigate(item.screen as any, item.params);
        }
      }}
    >
      <Image source={item.image} style={styles.image} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        data={ScreenData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      />

      <View style={styles.arrowContainer}>
        <TouchableOpacity onPress={handlePrev} style={[styles.arrowButton, styles.left]}>
          <MaterialIcons name="arrow-back-ios" size={26} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={[styles.arrowButton, styles.right]}>
          <MaterialIcons name="arrow-forward-ios" size={26} color="#555" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  imageContainer: {
    marginHorizontal: 5,
    borderRadius: 10,
    padding: 8,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 30,
    resizeMode: "contain",
  },
  arrowContainer: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  arrowButton: {
    backgroundColor: "#fff",
    borderRadius: 5,
    paddingVertical: 5,
    elevation: 3,
  },
  left: {
    position: "relative",
    top: -12,
    left: -10,
    paddingLeft: 5
  },
  right: {
    position: "relative",
    top: -12,
    right: -10
  }
});
