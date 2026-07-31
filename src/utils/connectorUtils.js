export const ConnectorIcons = {
    'CCS 2': require('../assets/icons/ic_chargers/ccs_combo_2.webp'),
    'CCS2': require('../assets/icons/ic_chargers/ccs_combo_2.webp'),
    'CCS 1': require('../assets/icons/ic_chargers/ccs_combo_1.webp'),
    'CCS1': require('../assets/icons/ic_chargers/ccs_combo_1.webp'),
    'Type 2': require('../assets/icons/ic_chargers/type_2.webp'),
    'Type2': require('../assets/icons/ic_chargers/type_2.webp'),
    'Type 1': require('../assets/icons/ic_chargers/type_1.webp'),
    'Type1': require('../assets/icons/ic_chargers/type_1.webp'),
    'CHAdeMO': require('../assets/icons/ic_chargers/chademo.webp'),
    'GB/T': require('../assets/icons/ic_chargers/gb_t.webp'),
    'GBT': require('../assets/icons/ic_chargers/gb_t.webp'),
    'AC': require('../assets/icons/ic_chargers/ac_dc.webp'), // Fallback for Generic AC
    'DC': require('../assets/icons/ic_chargers/ac_dc.webp'), // Fallback for Generic DC
    'Default': require('../assets/icons/ic_chargers/ac_dc.webp'), // Fallback
};

export const getConnectorIcon = (type) => {
    if (!type) return ConnectorIcons['Default'];

    // Normalize string
    const normalized = type.toString().trim();

    // Direct Match
    if (ConnectorIcons[normalized]) return ConnectorIcons[normalized];

    // Fuzzy Match
    const upper = normalized.toUpperCase();
    if (upper.includes('CCS') && upper.includes('2')) return ConnectorIcons['CCS 2'];
    if (upper.includes('CCS') && upper.includes('1')) return ConnectorIcons['CCS 1'];
    if (upper.includes('TYPE') && upper.includes('2')) return ConnectorIcons['Type 2'];
    if (upper.includes('TYPE') && upper.includes('1')) return ConnectorIcons['Type 1'];
    if (upper.includes('CHADEMO')) return ConnectorIcons['CHAdeMO'];
    if (upper.includes('GB')) return ConnectorIcons['GB/T'];

    return ConnectorIcons['Default'];
};
