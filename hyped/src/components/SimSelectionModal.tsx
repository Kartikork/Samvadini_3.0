import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Text,
} from 'react-native';
import DeviceBindingService from '../services/DeviceBindingService';

export interface SimInfo {
  simId: string;
  simIdHash: string;
  phoneNumber: string;
  carrierName: string;
  slotIndex: number;
}

interface SimSelectionModalProps {
  visible: boolean;
  onSelectSim: (sim: SimInfo) => void;
  onClose: () => void;
}

export default function SimSelectionModal({
  visible,
  onSelectSim,
  onClose,
}: SimSelectionModalProps) {
  const [sims, setSims] = useState<SimInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) loadSims();
  }, [visible]);

  const loadSims = async () => {
    try {
      setLoading(true);
      setError(null);
      const simsList = await DeviceBindingService.getAllSims();
      setSims(simsList);
    } catch (err: any) {
      setError(err.message || 'Failed to load SIM cards');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSim = (sim: SimInfo) => {
    onSelectSim(sim);
    onClose();
  };

  const renderSimItem = ({ item }: { item: SimInfo }) => {
    const displayNumber = item.phoneNumber || 'No number available';
    const displayName = item.carrierName || `SIM ${item.slotIndex + 1}`;
    return (
      <TouchableOpacity
        style={styles.simItem}
        onPress={() => handleSelectSim(item)}
        activeOpacity={0.7}
      >
        <View style={styles.simInfo}>
          <Text style={styles.simName}>{displayName}</Text>
          <Text style={styles.simNumber}>{displayNumber}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select SIM Card</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#028BD3" />
              <Text style={styles.loadingText}>Loading SIM cards...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadSims} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : sims.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No SIM cards found</Text>
            </View>
          ) : (
            <FlatList
              data={sims}
              renderItem={renderSimItem}
              keyExtractor={(item) => `${item.simId}-${item.slotIndex}`}
              style={styles.simList}
              contentContainerStyle={styles.simListContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 24,
    color: '#666',
  },
  simList: {
    maxHeight: 400,
  },
  simListContent: {
    paddingBottom: 10,
  },
  simItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  simInfo: {
    flex: 1,
  },
  simName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 5,
  },
  simNumber: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 20,
    color: '#028BD3',
    marginLeft: 10,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#028BD3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
});
