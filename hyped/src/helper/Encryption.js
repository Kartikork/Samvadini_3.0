import RsaNative from 'react-native-rsa-native';
import { Encryption_Keys } from '../utils/KeyHelper';
import Toast from 'react-native-toast-message';

// Generate multiple RSA key pairs
export const generateKeys = async (numberOfKeys, keySize = 2048) => {
  try {
    // make it static for debugging purpose change it later
    return Encryption_Keys;
  } catch (error) {
    console.error('Error generating keys:', error);
    throw error;
  }
};

// Encrypt a message using a public key
export const encryptMessage = async (message, publicKey) => {
  try {
    if (!message || !publicKey) {
      // Toast.show({
      //   type: 'success',
      //   text1: 'Success',
      //   text2: 'Message and public key are required for encryption',
      // });
      throw new Error('Message and public key are required for encryption');
    }
    return await RsaNative.encrypt(message, publicKey);
  } catch (error) {
    // Toast.show({
    //   type: 'success',
    //   text1: 'Success',
    //   text2: 'Error encrypting message:',
    // });
    console.error('Error encrypting message:', error);
    throw error;
  }
};

// Decrypt a message using a private key
export const decryptMessage = async (encryptedMessage, privateKey) => {
  try {
    if (!encryptedMessage || !privateKey) {
      throw new Error('Encrypted message and private key are required for decryption');
    }
    return await RsaNative.decrypt(encryptedMessage, privateKey);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw error;
  }
};