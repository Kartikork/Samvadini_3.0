import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, View, Text, Image, Animated, 
  PanResponder, Dimensions, Easing, Vibration, TouchableOpacity
} from 'react-native';
import { useBossBaby } from './BossBabyContext';

// Avatar assets live in ../Assets (talkingtom uses same images) — we pick them by id
const CHARACTER_AVATARS = {
  1: require('../baby_indian_figure.png'),
  2: require('../princess.png'),
  3: require('../rider.png'),
  4: require('../elephant.png'),
  5: require('../book.png'),   // Book avatar
  6: require('../tree.png'),   // Tree avatar
};

// Optional: header/shutter assets can be added under this folder with matching filenames.
// If you add custom shutter/header images, update these require()s; otherwise we fallback to defaults.

const CHARACTER_SHUTTER_CONFIG = {
  1: { color: '#95a5a6', sign: 'DO AS THE BOSS SAYS' },
  2: { color: '#f8c9f5', sign: 'KNEEL BEFORE THE PRINCESS' },
  3: { color: '#43e97b', sign: 'READY TO RIDE' },
  4: { color: '#a18cd1', sign: 'TRUNK CALLS' },
  5: { color: '#a18cd1', sign: 'READ WITH ME' },   // Book
  6: { color: '#134e5e', sign: 'GROW TOGETHER' }, // Tree
};

const { width, height } = Dimensions.get('window');

const BossBabyDraggable = () => {
  // Added hide/show header icon from context
  const { isVisible, message, dismissWidget, hideHeaderIcon, showHeaderIcon, selectedCharacterId, isBossBabyEnabled, toggleBossMode } = useBossBaby();
  // --- ANIMATION VALUES ---
  const pan = useRef(new Animated.ValueXY({ x: -100, y: 0 })).current; 
  const shutterY = useRef(new Animated.Value(-height)).current;
  
  const [isTouching, setIsTouching] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false); 

  // --- THE DISMISS SEQUENCE (Triggered by Drag OR Button) ---
  const triggerGarageClose = () => {
    if (!isInteractive) return; 
    setIsInteractive(false); 
    
    // 1. VIBRATION (2 Seconds)
    Vibration.vibrate([0, 2000]);

    // Hide icon as we start the exit so header can be revealed on landing
    try { hideHeaderIcon(); } catch (e) { /* ignore */ }

    Animated.parallel([
      // Drop the Baby (Fast)
      Animated.timing(pan.y, {
        toValue: height, 
        duration: 300,
        useNativeDriver: false 
      }),
      // Slam the Garage Door Down
      Animated.spring(shutterY, {
        toValue: 0,
        speed: 15, 
        bounciness: 6,
        useNativeDriver: false
      })
    ]).start(() => {
      // 2. Wait a moment while door is closed
      setTimeout(() => {
        // 3. Soft vibration
        Vibration.vibrate(50);

        // Open Shutter
        Animated.timing(shutterY, {
          toValue: -height, 
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false
        }).start(() => {
          
          // --- HERE IS THE TRICK ---
          // Hide the header button NOW, so the baby can fly "into" its spot
          hideHeaderIcon();

          // After shutter opens, animate the baby straight up
          const currentX = (pan.x && pan.x._value) || 0;
          const targetX = currentX; 
          
          // Target Y: Adjust this value to match your Header height (approx -height/2 + 20)
          const targetY = -height / 2 + 50; 

          // Fly Up Sequence
          Animated.sequence([
            // Small anticipation dip
            Animated.timing(pan.y, {
              toValue: (pan.y && pan.y._value ? pan.y._value : 0) - 30,
              duration: 180,
              useNativeDriver: false,
            }),
            // Fly to Header
            Animated.parallel([
              Animated.timing(pan.x, {
                toValue: targetX,
                duration: 650,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              }),
              Animated.timing(pan.y, {
                toValue: targetY,
                duration: 650,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
              })
            ])
          ]).start(() => {
            // Reveal header icon shortly before unmount to create a smooth "landing" transition
            setTimeout(() => {
              try {
                showHeaderIcon();
              } catch (e) {
                // ignore
              }
            }, 120);

            // Finally unmount after a small delay
            setTimeout(() => {
              dismissWidget();
            }, 320);
          });
        });
      }, 1500); 
    });
  };



  // --- PAN RESPONDER ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isInteractive,
      onMoveShouldSetPanResponder: () => isInteractive,
      
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        setIsTouching(true);
        Vibration.vibrate(10); 
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),

      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        setIsTouching(false); 

        // Drag Logic (Pull down)
        if (gestureState.dy > 100) {
           triggerGarageClose();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false
          }).start();
        }
      }
    })
  ).current;

  // --- ENTRANCE ANIMATION ---
  useEffect(() => {
    if (isVisible) {
      pan.setValue({ x: -100, y: 0 });
      shutterY.setValue(-height);
      setIsInteractive(false);
      setIsTouching(false);

      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        speed: 12,
        bounciness: 8
      }).start(() => {
        setIsInteractive(true); 
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      
      {/* --- SHUTTER LAYER --- */}
      <Animated.View style={[styles.shutterContainer, { transform: [{ translateY: shutterY }] }]}>
        <View style={[styles.shutterBody, { backgroundColor: (CHARACTER_SHUTTER_CONFIG[selectedCharacterId] || CHARACTER_SHUTTER_CONFIG[1]).color }] }>
            {[...Array(10)].map((_, i) => <View key={i} style={styles.slat} />)}
            <View style={styles.signContainer}>
                <Text style={styles.signText}>{(CHARACTER_SHUTTER_CONFIG[selectedCharacterId] || CHARACTER_SHUTTER_CONFIG[1]).sign}</Text>
            </View>
        </View>
        <View style={styles.shutterBottomBar} />
      </Animated.View>

      {/* --- BABY WIDGET LAYER --- */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.movableWidget,
          { 
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
            scale: isTouching ? 1.1 : 1 
          }
        ]}
      >
        <View style={[styles.glowContainer, isTouching && styles.glowActive]}>
            
            {/* THE SPEECH BUBBLE */}
            <View style={styles.bubble}>
                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={triggerGarageClose}
                  hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>

                <Text style={styles.bubbleText}>{message}</Text>
                <View style={styles.triangle} />
            </View>

            <Image source={CHARACTER_AVATARS[selectedCharacterId] || CHARACTER_AVATARS[1]} style={styles.avatar} resizeMode="contain" />
            
            {isInteractive && !isTouching && (
              <Text style={styles.hintText}>Tap X to dismiss</Text>
            )}


        </View>
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 100,
  },
  movableWidget: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    zIndex: 10001,
  },
  glowContainer: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 60,
  },
  glowActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)', 
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)'
  },
  avatar: { width: 120, height: 120 },
  
  bubble: {
    backgroundColor: '#fff',
    padding: 12, 
    borderRadius: 20, 
    marginBottom: 5,
    borderWidth: 1, 
    borderColor: '#ddd',
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, 
    shadowRadius: 4.65, 
    elevation: 8,
    minWidth: 140, 
    alignItems: 'center',
    position: 'relative'
  },
  bubbleText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  
  closeBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#ff4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
    zIndex: 999
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: -1 
  },

  triangle: {
    position: 'absolute', bottom: -10, width: 0, height: 0, 
    borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10,
    borderStyle: 'solid', backgroundColor: 'transparent',
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff',
  },
  hintText: { 
    color: 'rgba(0,0,0,0.5)', 
    fontSize: 11, 
    marginTop: 5, 
    fontWeight: '700',
    textShadowColor: 'white',
    textShadowRadius: 2
  },

  shutterContainer: { position: 'absolute', top: 0, left: 0, width: width, height: height, zIndex: 10000 },
  shutterBody: { flex: 1, backgroundColor: '#95a5a6', justifyContent: 'center', alignItems: 'center' },
  shutterBottomBar: { height: 20, backgroundColor: '#7f8c8d', borderTopWidth: 2, borderColor: '#555' },
  slat: { width: '100%', height: height / 12, borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  signContainer: {
    position: 'absolute', backgroundColor: '#c0392b', paddingVertical: 10, paddingHorizontal: 30,
    borderRadius: 5, borderWidth: 2, borderColor: '#fff', transform: [{ rotate: '-5deg' }],
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 5,
  },
  signText: { color: 'white', fontWeight: 'bold', fontSize: 24, letterSpacing: 2 },
});

export default BossBabyDraggable;