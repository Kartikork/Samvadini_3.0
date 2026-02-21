import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  BackHandler, // Added BackHandler
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height, width } = Dimensions.get('window');

export const FOOD_ITEMS = [
  { id: 1, name: 'Burger', icon: 'hamburger', color: '#ff9f43', reward: 15, hungerVal: 25 },
  { id: 2, name: 'Pizza', icon: 'pizza', color: '#ff4757', reward: 20, hungerVal: 35 },
  { id: 3, name: 'Fries', icon: 'french-fries', color: '#f1c40f', reward: 10, hungerVal: 15 },
  { id: 4, name: 'Apple', icon: 'food-apple', color: '#ff6b6b', reward: 5, hungerVal: 10 },
  { id: 5, name: 'Broccoli', icon: 'leaf', color: '#2ecc71', reward: 5, hungerVal: 15 },
  { id: 6, name: 'Ice Cream', icon: 'ice-cream', color: '#74b9ff', reward: 12, hungerVal: 10 },
  { id: 7, name: 'Cake', icon: 'cake-variant', color: '#ff9ff3', reward: 25, hungerVal: 30 },
  { id: 8, name: 'Milk', icon: 'baby-bottle', color: '#dfe6e9', reward: 8, hungerVal: 15 },
];

const DraggableFood = ({ item, quantity, coins, onDrop }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const hasStock = quantity > 0;
  // const hasMoney = coins >= item.cost; // Removed money check
  const canInteract = hasStock; // && hasMoney;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        if (!hasStock) { alert("Out of stock!"); return; }
        // if (!hasMoney) { alert("Not enough coins!"); return; }

        Animated.spring(scale, { toValue: 1.2, useNativeDriver: false }).start();
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (e, gesture) => {
        if (canInteract) {
          pan.x.setValue(gesture.dx);
          pan.y.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();

        if (canInteract && gesture.moveY < height * 0.65) {
          onDrop(item);
          pan.setValue({ x: 0, y: 0 });
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
        Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start();
      }
    })
  ).current;

  return (
    <View style={styles.plateWrapper}>
      <View style={styles.plateShape} />
      <Animated.View
        style={{
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scale }],
          zIndex: 999,
          opacity: hasStock ? 1 : 0.5
        }}
        {...panResponder.panHandlers}
      >
        <View style={{ alignItems: 'center' }}>
          <Icon name={item.icon} size={45} color={item.color} style={styles.foodShadow} />
          <View style={[styles.qtyBadge, !hasStock && { backgroundColor: '#b2bec3' }]}>
            <Text style={styles.qtyText}>{quantity}</Text>
          </View>
          <View style={[styles.priceTag, { backgroundColor: '#2ecc71' }]}>
            <Text style={styles.priceText}>+{item.reward}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const KitchenScreen = ({ onBack, onFeed, coins, inventory, selectedCharacter }) => {

  const [sessionHunger, setSessionHunger] = useState(0);

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const babyScale = useRef(new Animated.Value(1)).current;
  const [floatText, setFloatText] = useState(null);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (sessionHunger >= 100) {
      const timer = setTimeout(() => {
        onBack();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionHunger, onBack]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // --- Hardware Back Handler ---
  useEffect(() => {
    const backAction = () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBack]);
  // ---------------------------

  const handleSuccessfulFeed = (item) => {

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSessionHunger(prev => {
      const newVal = prev + item.hungerVal;
      return newVal > 100 ? 100 : newVal;
    });

    Animated.sequence([
      Animated.timing(babyScale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(babyScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setFloatText(`+${item.reward}`);
    floatAnim.setValue(0);
    Animated.timing(floatAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start(() => {
      setFloatText(null);
    });

    onFeed(item);
  };

  const getBarColor = () => {
    if (sessionHunger < 30) return '#ff4757';
    if (sessionHunger < 70) return '#ffa502';
    return '#2ed573';
  };

  return (
    <View style={styles.roomContainer}>

      {/* --- BACK BUTTON REMOVED (BackHandler used) --- */}

      {/* --- BACK BUTTON REMOVED (BackHandler used) --- */}

      {/* --- HUNGER PROGRESS BAR (Uses sessionHunger now) --- */}
      <View style={styles.hungerBarContainer}>
        <View style={styles.hungerIconBubble}>
          <Icon name="silverware-fork-knife" size={20} color="#fff" />
        </View>
        <View style={styles.hungerTrack}>
          <View
            style={[
              styles.hungerFill,
              {
                width: `${sessionHunger}%`,
                backgroundColor: getBarColor()
              }
            ]}
          />
        </View>
        <Text style={styles.hungerText}>{Math.round(sessionHunger)}%</Text>
      </View>

      {/* --- TOP RIGHT COIN DISPLAY --- */}
      <View style={styles.headerContainer}>
        <View style={styles.coinWrapper}>
          <Icon name="cash" size={24} color="#FFD700" />
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>

        {floatText && (
          <Animated.Text style={[styles.deductionText, {
            color: '#2ecc71', // Green for earning
            opacity: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{
              translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) // Float UP
            }]
          }]}>
            {floatText}
          </Animated.Text>
        )}
      </View>

      {/* Wall & Decor */}
      <View style={styles.wall}>
        <View style={styles.windowFrame}>
          <LinearGradient colors={['#81ecec', '#74b9ff']} style={styles.windowGlass}>
            <View style={styles.cloud} />
          </LinearGradient>
          <View style={styles.windowSill} />
        </View>

        <View style={styles.fridge}>
          <View style={styles.fridgeHandle} />
          <View style={styles.fridgeLine} />
        </View>
      </View>

      <View style={styles.floor} />

      {/* Character */}
      <Animated.View style={[
        styles.characterContainer,
        { transform: [{ translateY: bounceAnim }, { scale: babyScale }] }
      ]}>
        <Image
          source={selectedCharacter.image}
          style={styles.character}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Table & Food */}
      <View style={styles.tableContainer}>
        <View style={styles.tableTop}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled={true}
          >
            {FOOD_ITEMS.map((item) => (
              <DraggableFood
                key={item.id}
                item={item}
                quantity={inventory[item.id] || 0}
                coins={coins}
                onDrop={handleSuccessfulFeed}
              />
            ))}
          </ScrollView>
        </View>
        <View style={styles.tableEdge} />
        <LinearGradient colors={['rgba(0,0,0,0.2)', 'transparent']} style={styles.tableShadow} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  roomContainer: { flex: 1, backgroundColor: '#7bed9f' },
  wall: { flex: 3 },
  floor: { flex: 1, backgroundColor: '#e67e22', borderTopWidth: 5, borderTopColor: '#d35400' },

  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 101,
    elevation: 10,
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },

  hungerBarContainer: {
    position: 'absolute',
    top: 55,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  hungerIconBubble: {
    backgroundColor: '#ff6b6b',
    padding: 4,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fff'
  },
  hungerTrack: {
    width: 120,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe6e9'
  },
  hungerFill: {
    height: '100%',
    borderRadius: 6
  },
  hungerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 8,
    minWidth: 35
  },

  headerContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  coinWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    right: -10,
    top: -30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  coinText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 5,
  },
  deductionText: {
    color: '#ff6b6b',
    fontWeight: '900',
    fontSize: 24,
    marginTop: 5,
    marginRight: 15,
    textShadowColor: 'white',
    textShadowRadius: 2,
  },
  windowFrame: { position: 'absolute', top: 120, left: 30, width: 130, height: 130, backgroundColor: '#f5f6fa', borderWidth: 5, borderColor: '#dcdde1', borderRadius: 5, zIndex: 0 },
  windowGlass: { flex: 1, margin: 5, borderRadius: 2 },
  windowSill: { position: 'absolute', bottom: -10, left: -10, width: 140, height: 15, backgroundColor: '#dcdde1', borderRadius: 5 },
  fridge: { position: 'absolute', top: 100, right: -40, width: 140, height: 400, backgroundColor: '#fff', borderRadius: 30, borderWidth: 2, borderColor: '#dfe6e9' },
  fridgeHandle: { position: 'absolute', left: 20, top: 150, width: 10, height: 60, backgroundColor: '#b2bec3', borderRadius: 5 },
  fridgeLine: { position: 'absolute', left: 0, top: 120, width: '100%', height: 2, backgroundColor: '#dfe6e9' },
  characterContainer: { position: 'absolute', bottom: 110, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  character: { width: 280, height: 350 },
  tableContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, zIndex: 20, justifyContent: 'flex-end' },
  tableTop: { height: 100, backgroundColor: '#dff9fb', justifyContent: 'center' },
  tableEdge: { height: 20, backgroundColor: '#c7ecee', borderBottomWidth: 1, borderBottomColor: '#95afc0' },
  tableShadow: { height: 20 },
  scrollContent: { paddingHorizontal: 20, alignItems: 'center', paddingBottom: 10 },
  plateWrapper: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  plateShape: { position: 'absolute', bottom: 15, width: 90, height: 25, borderRadius: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#b2bec3', elevation: 2 },
  foodShadow: { textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 2 },
  qtyBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff6b6b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center', borderWidth: 2, borderColor: '#fff', elevation: 5 },
  qtyText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  priceTag: { position: 'absolute', bottom: -15, backgroundColor: '#6c5ce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, elevation: 5 },
  priceText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
});

export default KitchenScreen;