// client/src/components/AudioPlayer.js
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';
import { Colors } from '../styles/colors';
import Svg, { Path, Polyline, Circle, Defs, LinearGradient, Stop, Filter, FeGaussianBlur } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Cyberpunk Style 1: Smooth Neon Waves (flowing sine curves with glow)
const generateWaveformStyle1 = (numPoints = 120, height = 60) => {
  const points = [];
  const randomPhase = Math.random() * Math.PI * 2;
  const randomFreq = 2 + Math.random() * 2;
  for (let i = 0; i < numPoints; i++) {
    const x = i / numPoints;
    const wave = Math.sin(x * Math.PI * randomFreq + randomPhase) * Math.cos(x * Math.PI * (randomFreq * 0.7) + randomPhase);
    points.push(height / 2 + wave * (height * 0.35));
  }
  return points;
};

// Cyberpunk Style 2: Symmetrical Mountain Peaks (sharp, clean triangular peaks)
const generateWaveformStyle2 = (numPoints = 80, height = 60) => {
  const points = [];
  const randomAmplitude = 0.3 + Math.random() * 0.3;
  const randomOffset = Math.random() * 0.5;
  for (let i = 0; i < numPoints; i++) {
    const x = i / numPoints;
    const peakCount = 4 + Math.floor(Math.random() * 3);
    const localX = (x * peakCount + randomOffset) % 1;
    const peak = localX < 0.5 ? localX * 2 : (1 - localX) * 2;
    points.push(height / 2 - (peak - 0.5) * (height * randomAmplitude));
  }
  return points;
};

// Cyberpunk Style 3: Double Helix (intertwined curves, elegant and dynamic)
const generateWaveformStyle3 = (numPoints = 100, height = 60) => {
  const points = [];
  const randomFreq1 = 3 + Math.random() * 2;
  const randomFreq2 = 2 + Math.random() * 1.5;
  const randomPhase = Math.random() * Math.PI * 2;
  for (let i = 0; i < numPoints; i++) {
    const x = i / numPoints;
    const helix1 = Math.sin(x * Math.PI * randomFreq1 + randomPhase) * (0.4 + Math.random() * 0.2);
    const helix2 = Math.cos(x * Math.PI * randomFreq2 + randomPhase) * (0.3 + Math.random() * 0.15);
    const combined = helix1 + helix2;
    points.push(height / 2 + combined * (height * 0.35));
  }
  return points;
};

// Cyberpunk Style 4: Frequency Visualizer (modern equalizer with smooth transitions)
const generateWaveformStyle4 = (numPoints = 60, height = 60) => {
  const points = [];
  const randomFreq = 2 + Math.random() * 1.5;
  const randomPhase = Math.random() * Math.PI * 2;
  const randomShift = Math.random() * 0.3;
  for (let i = 0; i < numPoints; i++) {
    const x = i / numPoints;
    const freq = Math.sin(x * Math.PI * randomFreq + randomPhase + x * (2 + Math.random() * 1)) * (1 - Math.abs(x - 0.5) * (0.3 + Math.random() * 0.2));
    const baseline = Math.cos(x * Math.PI + randomPhase) * (0.2 + Math.random() * 0.15);
    points.push(height / 2 - (freq + baseline) * (height * (0.3 + randomShift)));
  }
  return points;
};

// Cyberpunk Style 5: Quantum Particles (organic scattered peaks with flow)
const generateWaveformStyle5 = (numPoints = 110, height = 60) => {
  const points = [];
  const randomPhase1 = Math.random() * Math.PI * 2;
  const randomPhase2 = Math.random() * Math.PI * 2;
  const randomPhase3 = Math.random() * Math.PI * 2;
  for (let i = 0; i < numPoints; i++) {
    const x = i / numPoints;
    const particle1 = Math.sin(x * Math.PI * (5 + Math.random() * 1.5) + randomPhase1) * (0.5 + Math.random() * 0.2);
    const particle2 = Math.sin(x * Math.PI * (3 + Math.random() * 1) + randomPhase2) * (0.35 + Math.random() * 0.15);
    const particle3 = Math.cos(x * Math.PI * (2 + Math.random() * 0.8) + randomPhase3) * (0.2 + Math.random() * 0.1);
    const combined = (particle1 + particle2 + particle3) / 2;
    points.push(height / 2 + combined * (height * 0.35));
  }
  return points;
};

// Classic Style 1: Smooth Sine-like Wave
const generateClassicStyle1 = (numPoints = 100, height = 60) => {
  const points = [];
  const baseFrequency = Math.random() * 0.1 + 0.05;
  const amplitudeFactor = Math.random() * 0.4 + 0.6;

  for (let i = 0; i < numPoints; i++) {
    const x = i / numPoints;
    let y = Math.sin(x * Math.PI * 2 * (2 + Math.random() * 2)) * (height * 0.2);
    y += Math.sin(x * Math.PI * 2 * (5 + Math.random() * 3)) * (height * 0.1);
    y += Math.random() * (height * 0.1) - (height * 0.05);

    y = y * amplitudeFactor + height / 2;
    y = Math.max(height * 0.1, Math.min(height * 0.9, y));
    points.push(y);
  }
  return points;
};

// Classic Style 2: Bar Graph / Equalizer Style
const generateClassicStyle2 = (numPoints = 20, height = 60) => {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    points.push(Math.random() * (height * 0.7) + (height * 0.15));
  }
  return points;
};

// Classic Style 3: Dotted Line / Particle Wave
const generateClassicStyle3 = (numPoints = 50, height = 60) => {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    points.push(Math.random() * (height * 0.6) + (height * 0.2));
  }
  return points;
};

// Classic Style 4: Jagged / Abstract Line
const generateClassicStyle4 = (numPoints = 100, height = 60) => {
  const points = [];
  let currentY = height / 2;
  const maxChange = height * 0.1;

  for (let i = 0; i < numPoints; i++) {
    currentY += (Math.random() * maxChange * 2) - maxChange;
    currentY = Math.max(height * 0.1, Math.min(height * 0.9, currentY));
    points.push(currentY);
  }
  return points;
};

const waveformGenerators = [
  generateWaveformStyle1,
  generateWaveformStyle2,
  generateWaveformStyle3,
  generateWaveformStyle4,
  generateWaveformStyle5,
];

const classicGenerators = [
  generateClassicStyle1,
  generateClassicStyle2,
  generateClassicStyle3,
  generateClassicStyle4,
];

const AudioPlayer = ({ audioBase64, playerName, timestamp }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const [waveformPoints, setWaveformPoints] = useState([]);
  const [playbackCount, setPlaybackCount] = useState(0); // Track playbacks to alternate styles

  // Deterministic waveform style based on player name hash
  // Same player always gets the same style across all audios
  const getWaveformStyleIndex = (name) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      const char = (name || '').charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % waveformGenerators.length;
  };

  const waveformStyleIndex = getWaveformStyleIndex(playerName);

  // Determine if this playback should use cyberpunk (odd) or classic (even) style
  const useCyberpunk = playbackCount % 2 === 0; // 0th play = cyberpunk, 1st = classic, 2nd = cyberpunk, etc.

  useEffect(() => {
    // Set the waveform for this player's assigned style
    const generator = useCyberpunk 
      ? waveformGenerators[waveformStyleIndex]
      : classicGenerators[waveformStyleIndex % classicGenerators.length];
    setWaveformPoints(generator());

    return () => {
      if (sound) {
        sound.release();
      }
    };
  }, [waveformStyleIndex, useCyberpunk]);

  const playAudio = () => {
    if (sound && sound.isPlaying()) {
      sound.stop(() => setIsPlaying(false));
      return;
    }

    if (sound) {
      setIsLoading(true);
      sound.play((success) => {
        if (success) {
          console.log('successfully finished playing');
        } else {
          console.log('playback failed due to audio decoding errors');
        }
        setIsPlaying(false);
        setIsLoading(false);
        sound.release();
        setSound(null);
        // Increment counter and regenerate waveform with alternating style
        setPlaybackCount(prev => {
          const nextCount = prev + 1;
          const nextUseCyberpunk = nextCount % 2 === 0;
          const generator = nextUseCyberpunk 
            ? waveformGenerators[waveformStyleIndex]
            : classicGenerators[waveformStyleIndex % classicGenerators.length];
          setWaveformPoints(generator());
          return nextCount;
        });
      });
      setIsPlaying(true);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      
      // --- ADD THIS CHECK ---
      if (!audioBase64) {
        console.error('Audio data is missing');
        setIsLoading(false);
        return;
      }
      // ----------------------

      const audioBuffer = Buffer.from(audioBase64.split(',')[1], 'base64')
      const tempFilePath = `${RNFS.DocumentDirectoryPath}/${playerName}-${timestamp}.mp3`;

      RNFS.writeFile(tempFilePath, audioBuffer.toString('base64'), 'base64')
        .then(() => {
          const newSound = new Sound(tempFilePath, '', (error) => {
            if (error) {
              console.error('failed to load the sound', error);
              setIsLoading(false);
              return;
            }
            setSound(newSound);
            setIsLoading(false);
            newSound.play((success) => {
              if (success) {
                console.log('successfully finished playing');
              } else {
                console.log('playback failed due to audio decoding errors');
              }
              setIsPlaying(false);
              newSound.release();
              setSound(null);
              RNFS.unlink(tempFilePath).catch(err => console.error('Error deleting temp file:', err));
              // Increment counter and regenerate waveform with alternating style
              setPlaybackCount(prev => {
                const nextCount = prev + 1;
                const nextUseCyberpunk = nextCount % 2 === 0;
                const generator = nextUseCyberpunk 
                  ? waveformGenerators[waveformStyleIndex]
                  : classicGenerators[waveformStyleIndex % classicGenerators.length];
                setWaveformPoints(generator());
                return nextCount;
              });
            });
            setIsPlaying(true);
          });
        })
        .catch(error => {
          console.error('Error writing temp audio file:', error);
          setIsLoading(false);
        });
    }
  };

  const renderWaveform = () => {
    if (waveformPoints.length === 0) return null;

    const width = 200;
    const height = 60;
    const pointWidth = width / waveformPoints.length;

    // Vivid cyberpunk neon color palettes - BRIGHT and SATURATED (for cyberpunk styles)
    const cyberpunkPalettes = [
      { start: '#FF00FF', mid: '#FF0066', end: '#9933FF' },       // Style 1: Magenta→Pink→Purple
      { start: '#00FFFF', mid: '#FF00FF', end: '#FF0080' },       // Style 2: Cyan→Magenta→Hot Pink
      { start: '#39FF14', mid: '#FF1493', end: '#8F00FF' },       // Style 3: Neon Green→Pink→Purple
      { start: '#FF006E', mid: '#FF0099', end: '#6A0DAD' },       // Style 4: Red→Hot Pink→Purple
      { start: '#FFFF00', mid: '#FF00FF', end: '#0099FF' },       // Style 5: Yellow→Magenta→Cyan
    ];

    // Classic muted color palettes - subtle and softer (for classic styles)
    const classicPalettes = [
      { start: Colors.accent, mid: '#FF6B9D', end: Colors.accent },        // Classic 1: Accent-based
      { start: '#4ECDC4', mid: '#45B7AA', end: '#4ECDC4' },                 // Classic 2: Teal
      { start: '#95E1D3', mid: '#7BCCB1', end: '#95E1D3' },                 // Classic 3: Mint
      { start: '#FFB6C1', mid: '#FF9FB2', end: '#FFB6C1' },                 // Classic 4: Light Pink
    ];

    const palette = useCyberpunk 
      ? cyberpunkPalettes[waveformStyleIndex]
      : classicPalettes[waveformStyleIndex % classicPalettes.length];
    const gradId = `grad${waveformStyleIndex}_${useCyberpunk ? 'cyber' : 'classic'}_${Date.now()}`; // Unique ID per render

    // Use the waveform style assigned to this player
    // For cyberpunk styles: use bright vibrant visualization
    // For classic styles: use simpler, softer visualization
    if (useCyberpunk) {
      switch (waveformStyleIndex) {
      case 0: // Style 1: Smooth Neon Waves
        let pathD_waves = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_waves += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_waves`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_waves} fill="none" stroke={`url(#${gradId}_waves)`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
          </Svg>
        );
      case 1: // Style 2: Symmetrical Mountain Peaks
        let pathD_peaks = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_peaks += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_peaks`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_peaks} fill="none" stroke={`url(#${gradId}_peaks)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="miter" opacity="1" />
          </Svg>
        );
      case 2: // Style 3: Double Helix
        let pathD_helix = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_helix += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_helix`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_helix} fill="none" stroke={`url(#${gradId}_helix)`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
          </Svg>
        );
      case 3: // Style 4: Frequency Visualizer
        let pathD_freq = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_freq += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_freq`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_freq} fill="none" stroke={`url(#${gradId}_freq)`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
          </Svg>
        );
      case 4: // Style 5: Quantum Particles
        let pathD_quantum = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_quantum += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_quantum`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_quantum} fill="none" stroke={`url(#${gradId}_quantum)`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
          </Svg>
        );
      default:
        return null;
    }
    } else {
      // Classic styles - simpler, softer visualization
      const classicStyleIndex = waveformStyleIndex % classicGenerators.length;
      switch (classicStyleIndex) {
      case 0: // Classic 1: Smooth Sine Wave
        let pathD_classic1 = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_classic1 += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_classic1`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_classic1} fill="none" stroke={`url(#${gradId}_classic1)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="1" />
          </Svg>
        );
      case 1: // Classic 2: Equalizer Bars
        let pathD_classic2 = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_classic2 += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_classic2`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_classic2} fill="none" stroke={`url(#${gradId}_classic2)`} strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" opacity="1" />
          </Svg>
        );
      case 2: // Classic 3: Dotted Particles
        let pathD_classic3 = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_classic3 += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_classic3`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_classic3} fill="none" stroke={`url(#${gradId}_classic3)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2,2" opacity="1" />
          </Svg>
        );
      case 3: // Classic 4: Jagged Abstract
        let pathD_classic4 = `M0,${waveformPoints[0]}`;
        waveformPoints.forEach((point, index) => {
          const x = index * pointWidth;
          pathD_classic4 += `L${x},${point}`;
        });
        return (
          <Svg height={height} width={width} style={styles.waveformContainer}>
            <Defs>
              <LinearGradient id={`${gradId}_classic4`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={palette.start} stopOpacity="1" />
                <Stop offset="50%" stopColor={palette.mid} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.end} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={pathD_classic4} fill="none" stroke={`url(#${gradId}_classic4)`} strokeWidth="2.5" strokeLinecap="butt" strokeLinejoin="miter" opacity="1" />
          </Svg>
        );
      default:
        return null;
    }
    }
  };

  return (
    <View style={styles.audioItem}>
      <Text style={styles.playerName}>{playerName}</Text>
      <TouchableOpacity onPress={playAudio} style={styles.playButton} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name={isPlaying ? 'stop-circle' : 'play-circle'} size={26} color="#fff" />
        )}
      </TouchableOpacity>
      {renderWaveform()}
    </View>
  );
};

const styles = StyleSheet.create({
  audioItem: {
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  playButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
  },
  waveformContainer: {
    marginLeft: 10,
  }
});

export default AudioPlayer;