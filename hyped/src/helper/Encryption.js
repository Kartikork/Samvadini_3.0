import RsaNative from 'react-native-rsa-native';
// import { Encryption_Keys } from '../utils/KeyHelper';
import Toast from 'react-native-toast-message';

const Encryption_Keys = [
  {
    privateKey: `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----
`,
    publicKey: `-----BEGIN RSA PUBLIC KEY-----
MIICCgKCAgEAtjUoP5fgnNiGFgN7d/4fOlUDdnfThhFtB6j6zdwEBdhXV2dcb14T
Ye45tKW5gSoDr0sqbsmYIDDbcPaEpAiERNqJ4npukvt6xuV9w0BrQ6dZVhFKuzVR
Cgz1aFvMnv8i5y3j0FCY2bxEBFKM5Qz2s/x/x9+lz7EhHtobkt1gJjZRZnrr+ikp
1sU3SG1XTOyPFC868fUZbL6sXhm73o+VrWr1VHA1XlpiV8MPS80eMSSckbjq9A8K
4uIPdMrX6Yf4RH+3XBTySaxnqx59C0W1ToGYrKlp/9nCZu94rZvdCejsXeZi2/+I
F9oY0OREu/hRPVU2QNvbI+Bz8M+QR5O7gonwO3lN01rlkh839+B564IQuAW2vskQ
zjKS7a80gUZSbN5E+UmbqLjcYvwUoeffG6e9/jNzpJn2Hmi6YZhwbdDonqQgUS51
G/1LnXziE5iwMalRJnPg2+ezV3pGl1gQX5w4WB5EPE1CO0Lrd/K6RGq3XGbbR+YP
FBpPt/Xol7OAM2waRLFm3ffkgGmddhO6wcESlGk+zlqZowh/v7YLtgwGgSo/PuBZ
frrnCP0OIIN34y9sQIvtV505SwdraLmBup6Ia+8uigKnrU6s6nEvZ4XaB2HZLWRq
tbTGRpbYuX0oBKOqKzCJuHoDKIN68iwqcep9oj1DKV5EtaHt41mZh6UCAwEAAQ==
-----END RSA PUBLIC KEY-----
`
  }
];
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