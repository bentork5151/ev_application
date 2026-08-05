import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Car, Battery, Save, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';

const VEHICLE_STORAGE_KEY = '@user_vehicle_details';

export default function VehicleDetailsScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // List State
    const [vehicles, setVehicles] = useState([]);
    const [isAddingNew, setIsAddingNew] = useState(false);

    // Form State
    const [vehicleType, setVehicleType] = useState('4W'); 
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [batteryCapacity, setBatteryCapacity] = useState('');
    const [connectorType, setConnectorType] = useState('CCS 2');

    useEffect(() => {
        loadVehicleDetails();
    }, []);

    const loadVehicleDetails = async () => {
        setLoading(true);
        try {
            const stored = await AsyncStorage.getItem(VEHICLE_STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (Array.isArray(data)) {
                    setVehicles(data);
                } else if (data && data.make) {
                    const initialVehicle = { ...data, id: Date.now().toString() };
                    setVehicles([initialVehicle]);
                    await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify([initialVehicle]));
                }
            }
        } catch (e) {
            console.error("Failed to load vehicle details", e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setVehicleType('4W');
        setMake('');
        setModel('');
        setRegistrationNumber('');
        setBatteryCapacity('');
        setConnectorType('CCS 2');
        setIsAddingNew(false);
    };

    const handleSave = async () => {
        if (!make || !model || !registrationNumber) {
            showAlert("Missing Information", "Please fill in Make, Model and Registration Number.");
            return;
        }

        setSaving(true);
        try {
            const newVehicle = {
                id: Date.now().toString(),
                vehicleType,
                make,
                model,
                registrationNumber,
                batteryCapacity,
                connectorType,
                updatedAt: new Date().toISOString()
            };

            const updatedList = [...vehicles, newVehicle];
            await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updatedList));
            setVehicles(updatedList);

            setTimeout(() => {
                setSaving(false);
                showAlert("Success", "Vehicle added successfully!");
                resetForm();
            }, 500);

        } catch (e) {
            console.error("Failed to save", e);
            showAlert("Error", "Could not save details.");
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        showAlert(
            "Delete Vehicle",
            "Are you sure you want to remove this vehicle?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const updatedList = vehicles.filter(v => v.id !== id);
                            setVehicles(updatedList);
                            await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updatedList));
                        } catch (e) {
                            console.error("Failed to delete", e);
                            showAlert("Error", "Could not delete vehicle.");
                        }
                    }
                }
            ]
        );
    };

    const SelectableChip = ({ label, value, selectedValue, onSelect }) => (
        <TouchableOpacity
            style={[
                styles.chip, 
                { backgroundColor: theme.white },
                selectedValue === value && [styles.chipActive, { backgroundColor: theme.textPrimary }]
            ]}
            onPress={() => onSelect(value)}
        >
            <Text style={[
                styles.chipText, 
                { color: theme.textSecondary },
                selectedValue === value && [styles.chipTextActive, { color: theme.background }]
            ]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderVehicleList = () => (
        <View>
            {vehicles.length === 0 ? (
                <View style={styles.emptyState}>
                    <Car size={48} color={theme.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No vehicles added yet</Text>
                    <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>Add your EV details to get started</Text>
                </View>
            ) : (
                vehicles.map((item) => (
                    <View key={item.id} style={[styles.vehicleCard, { backgroundColor: theme.cardBg }]}>
                        <View style={[styles.vehicleIconContainer, { backgroundColor: theme.white }]}>
                            <Car size={22} color="#00B074" />
                        </View>
                        <View style={styles.vehicleInfo}>
                            <Text style={[styles.vehicleName, { color: theme.textPrimary }]}>{item.make} {item.model}</Text>
                            <Text style={[styles.vehicleReg, { color: theme.textSecondary }]}>{item.registrationNumber}</Text>
                            <Text style={[styles.vehicleSpecs, { color: theme.textSecondary }]}>
                                {item.vehicleType} • {item.connectorType}
                                {item.batteryCapacity ? ` • ${item.batteryCapacity} kWh` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item.id)}
                        >
                            <Trash2 size={20} color="#EF5350" />
                        </TouchableOpacity>
                    </View>
                ))
            )}

            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.cardBg }]} onPress={() => setIsAddingNew(true)}>
                <Text style={[styles.addBtnText, { color: theme.textPrimary }]}>+ Add New Vehicle</Text>
            </TouchableOpacity>
        </View>
    );

    const renderForm = () => (
        <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Vehicle Type</Text>
            <View style={styles.row}>
                <SelectableChip label="2 Wheeler" value="2W" selectedValue={vehicleType} onSelect={setVehicleType} />
                <SelectableChip label="3 Wheeler" value="3W" selectedValue={vehicleType} onSelect={setVehicleType} />
                <SelectableChip label="4 Wheeler" value="4W" selectedValue={vehicleType} onSelect={setVehicleType} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Make (Brand)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.white }]}>
                    <Car size={18} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder="e.g. Tata, Tesla, MG"
                        placeholderTextColor={theme.placeholder}
                        value={make}
                        onChangeText={setMake}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Model</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.white }]}>
                    <Car size={18} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder="e.g. Nexon EV, Model 3"
                        placeholderTextColor={theme.placeholder}
                        value={model}
                        onChangeText={setModel}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Registration Number</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.white }]}>
                    <Text style={[styles.inputIcon, { color: theme.textSecondary, fontWeight: '900', fontSize: 16 }]}>#</Text>
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder="e.g. MH 12 AB 1234"
                        placeholderTextColor={theme.placeholder}
                        value={registrationNumber}
                        onChangeText={setRegistrationNumber}
                        autoCapitalize="characters"
                    />
                </View>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Charging Specs</Text>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Battery Capacity (kWh) - Optional</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.white }]}>
                    <Battery size={18} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder="e.g. 40.5"
                        placeholderTextColor={theme.placeholder}
                        value={batteryCapacity}
                        onChangeText={setBatteryCapacity}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Connector Type</Text>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
                {['CCS 2', 'Type 2', 'CHAdeMO', 'GB/T'].map(type => (
                    <SelectableChip key={type} label={type} value={type} selectedValue={connectorType} onSelect={setConnectorType} />
                ))}
            </View>

            <View style={{ height: 32 }} />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.white }]} onPress={handleSave} disabled={saving}>
                {saving ? (
                    <ActivityIndicator color={theme.textPrimary} />
                ) : (
                    <>
                        <Save size={18} color={theme.textPrimary} style={{ marginRight: 8 }} />
                        <Text style={[styles.saveBtnText, { color: theme.textPrimary }]}>Save Vehicle</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: theme.cardBg }]}
                    onPress={() => {
                        if (isAddingNew && vehicles.length > 0) {
                            setIsAddingNew(false);
                        } else {
                            navigation.goBack();
                        }
                    }}
                >
                    <ChevronLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{isAddingNew ? 'Add Vehicle' : 'My Vehicles'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color="#00B074" style={{ marginTop: 50 }} />
                ) : isAddingNew || vehicles.length === 0 ? renderForm() : renderVehicleList()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 60
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginTop: 10,
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    chipActive: {
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    chipTextActive: {
        fontWeight: '900',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontWeight: '800',
    },
    saveBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '900',
    },
    cancelBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    cancelBtnText: {
        color: '#EF5350',
        fontSize: 15,
        fontWeight: '900'
    },
    vehicleCard: {
        borderRadius: 28,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    vehicleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleName: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4
    },
    vehicleReg: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4
    },
    vehicleSpecs: {
        fontSize: 12,
        fontWeight: '500'
    },
    deleteBtn: {
        padding: 10,
    },
    addBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    addBtnText: {
        fontSize: 15,
        fontWeight: '900'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 16
    },
    emptySubText: {
        fontSize: 13,
        marginTop: 8
    }
});
