import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getAllContacts,
  getNameAndPhotoById,
  insertSyncContact,
} from '../storage/sqllite/authentication/UsersContactsList';
import { axiosConn } from '../storage/helper/Config';

// ---- Basic contact retrieval and filtering ----

export const getContacts = async () => {
  try {
    const contacts = await getAllContacts();
    const sortedContacts = contacts.sort((a: any, b: any) => {
      const nameA = a.praman_patrika || '';
      const nameB = b.praman_patrika || '';
      const isAAlphabet = /^[A-Za-z]/.test(nameA);
      const isBAlphabet = /^[A-Za-z]/.test(nameB);

      if (isAAlphabet !== isBAlphabet) {
        return isAAlphabet ? -1 : 1;
      }
      return 0;
    });

    return sortedContacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
};

export const filterContacts = (
  contacts: any[],
  searchQuery: string | number | undefined,
  currentUserId: string | number | undefined,
) => {
  if (!contacts) {
    return [];
  }

  const filtered = contacts.filter(
    (contact: any) => contact.ekatma_chinha !== currentUserId,
  );

  if (!searchQuery) {
    return filtered;
  }

  const lowerCaseQuery = String(searchQuery).toLowerCase();

  return filtered.filter((contact: any) => {
    const pramanPatrikaMatch = contact?.praman_patrika
      ?.toLowerCase()
      ?.includes(lowerCaseQuery);
    const durasamparkaMatch = contact?.durasamparka_sankhya
      ?.toString()
      ?.includes(lowerCaseQuery);
    const upayogakartaNamaMatch = contact?.upayogakarta_nama
      ?.toLowerCase()
      ?.includes(lowerCaseQuery);

    return pramanPatrikaMatch || durasamparkaMatch || upayogakartaNamaMatch;
  });
};

export const filterContactsByDemographics = (
  contacts: any[],
  {
    vayahMin,
    vayahMax,
    gender,
  }: { vayahMin?: number; vayahMax?: number; gender?: string } = {},
) => {
  if (!contacts) return [];

  const getAgeFromDOB = (dob?: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  return contacts.filter(contact => {
    const contactAge = getAgeFromDOB(contact?.janma_tithi);
    const contactGender = contact?.linga?.toLowerCase();

    const inAgeRange =
      contactAge !== null &&
      (!isNaN(vayahMin as any) || !isNaN(vayahMax as any)) &&
      ((vayahMin == null && vayahMax == null) ||
        (vayahMin != null &&
          vayahMax == null &&
          contactAge >= Number(vayahMin)) ||
        (vayahMin == null &&
          vayahMax != null &&
          contactAge <= Number(vayahMax)) ||
        (vayahMin != null &&
          vayahMax != null &&
          contactAge >= Number(vayahMin) &&
          contactAge <= Number(vayahMax)));

    const genderMatch = gender && contactGender === gender.toLowerCase();

    // require both gender and age match if provided
    if (gender && (vayahMin != null || vayahMax != null))
      return inAgeRange && genderMatch;
    if (gender) return genderMatch;
    if (vayahMin != null || vayahMax != null) return inAgeRange;
    return true;
  });
};

export const separateContacts = (contacts: any[]) => {
  return {
    contactsOnSamvadini: contacts?.filter(
      contact => contact.samvadini_patrika_samarthah,
    ),
    contactsToInvite: contacts?.filter(
      contact =>
        !contact.samvadini_patrika_samarthah &&
        contact.praman_patrika?.trim() !== '',
    ),
  };
};

export const fetchNameAndPhotoById = async (ekatma_chinha: string) => {
  try {
    const result = await getNameAndPhotoById(ekatma_chinha);
    return result;
  } catch (error) {
    console.error('Error in fetchNameAndPhotoById service:', error);
    throw error;
  }
};

let isSyncRunning = false;

export async function upsertContactsToServer(formattedContacts: any[]) {
  try {
    const uniqueId = await AsyncStorage.getItem('uniqueId');
    if (!uniqueId) {
      throw new Error('uniqueId not found in storage');
    }

    const phoneNumbers = (formattedContacts || [])
      .map(c => c?.phoneNumber || c?.phone)
      .filter(Boolean)
      .map(n => ({ number: String(n).trim() }))
      .filter(obj => obj.number.length > 0);

    if (!phoneNumbers.length) {
      return { skipped: true };
    }

    const payload = { userId: uniqueId, phoneNumbers };
    const { data } = await axiosConn(
      'POST',
      'contacts/upsert',
      payload,
    );
    return data;
  } catch (err) {
    // Surface minimal error; callers may choose to ignore
    throw err;
  }
}

// ---- Full phonebook sync and upsert helpers ----

export const syncContacts = async (
  batchSize = 300,
  refreshCallback: (() => Promise<void> | void) | null = null,
) => {
  console.log('syncContactsaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  if (isSyncRunning) {
    console.log('Sync already in progress, skipping...');
    return [];
  }
  console.log(refreshCallback, 'refreshCallback');

  try {
    isSyncRunning = true;
    const hasPermission =
      Platform.OS === 'android'
        ? (await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          )) ||
          (await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          )) === PermissionsAndroid.RESULTS.GRANTED
        : (await Contacts.checkPermission()) === 'authorized' ||
          (await Contacts.requestPermission()) === 'authorized';

    if (!hasPermission) {
      return [];
    }

    const contacts = await Contacts.getAll();
    const formattedContacts = contacts.reduce(
      (acc: any[], { phoneNumbers, displayName, givenName }) => {
        const raw = phoneNumbers?.[0]?.number;
        if (!raw) {
          return acc;
        }
        const clean = raw.replace(/\D/g, '');
        const phoneNumber = clean.slice(-10);
        if (phoneNumber.length !== 10) {
          return acc;
        }
        acc.push({
          phoneNumber,
          name: displayName || givenName || '',
          countryCode:
            raw.startsWith('+') && clean.length > 10
              ? `+${clean.slice(0, -10)}`
              : '+91',
        });
        return acc;
      },
      [],
    );

    if (!formattedContacts.length) {
      return [];
    }

    const batches = Array.from(
      { length: Math.ceil(formattedContacts.length / batchSize) },
      (_, i) =>
        formattedContacts.slice(i * batchSize, (i + 1) * batchSize),
    );
console.log(formattedContacts,"bbbbbbbbbbbbbbbbbbbbbbb")
    const currentUserUniqueId = await AsyncStorage.getItem('uniqueId');

    const syncBatch = async (batch: any[], i: number) => {
      try {
        const payload: any = { contacts: batch.map(c => c.phoneNumber) };
        if (currentUserUniqueId) {
          payload.uniqueId = currentUserUniqueId;
        }
        const {
          data: { data },
        } = await axiosConn('post', 'contact-sync', payload);
        const result = data.map((s: any) => ({
          isRegistered: s.isRegistered || false,
          countryCode:
            batch.find(c => c.phoneNumber === s.phoneNumber)?.countryCode ||
            '+91',
          name:
            batch.find(c => c.phoneNumber === s.phoneNumber)?.name || '',
          phoneNumber: s.phoneNumber,
          uid: s.ekatma_chinha || null,
          parichayapatra: s.parichayapatra || null,
          chatId: s.chatId || null,
          janma_tithi: s.janma_tithi || null,
          linga: s.linga || null,
          upayogakarta_nama: s.upayogakarta_nama || '',
        }));
        return result;
      } catch (e: any) {
        console.error(`Batch ${i + 1} error: ${e.message}`);
        return [];
      }
    };

    const results = await Promise.all(batches.map(syncBatch));
    const serverContacts = results.flat();

    await insertSyncContact(serverContacts);

    // Also upsert full phonebook to backend (Mongo) in required format
    try {
      const uniqueId = await AsyncStorage.getItem('uniqueId');
      if (uniqueId) {
        await upsertContactsToServer(formattedContacts);
      } else {
        console.log(
          'Skipping server contacts upsert: user is not logged in (no uniqueId).',
        );
      }
    } catch (e: any) {
      console.warn(
        'Upsert contacts to server failed:',
        e?.message || e,
      );
    }

    // Call refresh callback if provided (to update context)
    if (refreshCallback && typeof refreshCallback === 'function') {
      console.log(refreshCallback, 'refreshCallback innnnnnnn');
      await refreshCallback();
    }

    return serverContacts;
  } catch (e: any) {
    console.error(`Sync error: ${e.message}`);
    return [];
  } finally {
    isSyncRunning = false;
  }
};

export const upsertContactsAfterLogin = async () => {
console.log('upsertContactsAfterLoginaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  try {
    // Ensure user is logged in
    const uniqueId = await AsyncStorage.getItem('uniqueId');
    if (!uniqueId) {
      console.log(
        'Skip upsertContactsAfterLogin: no uniqueId (not logged in).',
      );
      return { skipped: true };
    }

    // Ask for contact permission if needed
    const hasPermission =
      Platform.OS === 'android'
        ? (await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          )) ||
          (await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          )) === PermissionsAndroid.RESULTS.GRANTED
        : (await Contacts.checkPermission()) === 'authorized' ||
          (await Contacts.requestPermission()) === 'authorized';

    if (!hasPermission) {
      return { skipped: true };
    }

    // Read and format
    const contacts = await Contacts.getAll();
    const formattedContacts = contacts.reduce((acc: any[], { phoneNumbers }) => {
      const raw = phoneNumbers?.[0]?.number;
      if (!raw) {
        return acc;
      }
      const clean = raw.replace(/\D/g, '');
      const phoneNumber = clean.slice(-10);
      if (phoneNumber.length !== 10) {
        return acc;
      }
      acc.push({ phoneNumber });
      return acc;
    }, []);

    if (!formattedContacts.length) {
      return { empty: true };
    }

    // Upsert to server
    return await upsertContactsToServer(formattedContacts);
  } catch (e: any) {
    console.warn(
      'upsertContactsAfterLogin error:',
      e?.message || e,
    );
    return { error: true };
  }
};


