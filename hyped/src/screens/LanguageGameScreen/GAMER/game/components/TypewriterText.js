import React, { useState, useEffect, useImperativeHandle, forwardRef,useRef,useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

const TypewriterText = forwardRef(({ text, speed = 30, onComplete, style }, ref) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let currentIndex = 0;
    
    const typeNextCharacter = () => {
      if (!isMounted) return;
      
      if (currentIndex < text.length) {
        setDisplayedText(prev => prev + text[currentIndex]);
        currentIndex++;
        animationRef.current = setTimeout(typeNextCharacter, speed);
      } else {
        setIsTyping(false);
        setIsComplete(true);
        onComplete?.();
      }
    };

    if (isTyping) {
      typeNextCharacter();
    }

    return () => {
      isMounted = false;
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [text, speed, isTyping, onComplete]);

  const handlePress = () => {
    if (isTyping) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      setDisplayedText(text);
      setIsTyping(false);
      setIsComplete(true);
      onComplete?.();
    } else if (isComplete) {
      return true;
    }
    return false;
  };

  const reset = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);
  }, []);

  useImperativeHandle(ref, () => ({
    skipToEnd: () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      setDisplayedText(text);
      setIsTyping(false);
      setIsComplete(true);
      onComplete?.();
    },
    reset,
    isTyping: () => isTyping,
    isComplete: () => isComplete
  }), [text, isTyping, isComplete, reset, onComplete]);

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      style={[styles.container, style]}
      onPress={handlePress}
    >
      <Text style={[styles.text, style]}>
        {displayedText}
        <Text style={[styles.cursor, { opacity: isTyping ? 1 : 0 }]}>|</Text>
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  cursor: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

TypewriterText.displayName = 'TypewriterText';

export default TypewriterText;
