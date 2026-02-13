import { StyleSheet } from 'react-native';

const SQUARE_SIZE = 100;
const BOARD_SIZE = SQUARE_SIZE * 3;
const STROKE_WIDTH = 30;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    marginVertical: 20,
    fontSize: 24,
    fontWeight: '600',
    color: '#444',
  },
  boardContainer: {
    position: 'relative',
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    marginBottom: 20,
  },
  board: {
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 3,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  winningLine: {
    position: 'absolute',
    height: STROKE_WIDTH,
    zIndex: 1,
    elevation: 6,
  },

  winImage: {
    position: 'absolute',
    width: '100%',
    height: 200,
    top: (BOARD_SIZE - 200) / 2,
    left: (BOARD_SIZE - 300) / 2,
    zIndex: 2,
    elevation: 7,
  },

  'line_[0,1,2]': { top: SQUARE_SIZE / 2 - STROKE_WIDTH / 2, width: '120%', left: '-10%' },
  'line_[3,4,5]': { top: SQUARE_SIZE * 1.5 - STROKE_WIDTH / 2, width: '120%', left: '-10%' },
  'line_[6,7,8]': { top: SQUARE_SIZE * 2.5 - STROKE_WIDTH / 2, width: '120%', left: '-10%' },
  
  'line_[0,3,6]': { 
    width: '120%',
    top: BOARD_SIZE / 2 - STROKE_WIDTH / 2,
    left: '-10%',
    transform: [{ rotate: '90deg' }, { translateY: SQUARE_SIZE }],
  },
  'line_[1,4,7]': {
    width: '120%',
    top: BOARD_SIZE / 2 - STROKE_WIDTH / 2,
    left: '-10%',
    transform: [{ rotate: '90deg' }],
  },
  'line_[2,5,8]': {
    width: '120%',
    top: BOARD_SIZE / 2 - STROKE_WIDTH / 2,
    left: '-10%',
    transform: [{ rotate: '90deg' }, { translateY: -SQUARE_SIZE }],
  },
  
  'line_[0,4,8]': {
    width: '142%',
    top: BOARD_SIZE / 2 - STROKE_WIDTH / 2,
    left: '-21%',
    transform: [{ rotate: '45deg' }],
  },
  'line_[2,4,6]': {
    width: '142%',
    top: BOARD_SIZE / 2 - STROKE_WIDTH / 2,
    left: '-21%',
    transform: [{ rotate: '-45deg' }],
  },
});