// src/utils/data.js

// Mock data for chemicals
export const initialChemicals = [
  {
    id: 1,
    name: 'Hydrochloric Acid',
    batchNumber: 'A424112301',
    brand: 'LabChemie',
    volume: '500g',
    initialQuantity: 50,
    currentQuantity: 35,
    expirationDate: '2024-12-31',
    dateOfArrival: '2024-01-15',
    safetyClass: 'corrosive',
    location: 'Lab A1',
    ghsSymbols: ['corrosive', 'health-hazard'],
    usageLog: [
      { date: '2024-08-15', user: 'Dr. Smith', location: 'Lab A1', quantity: 5, opened: true },
      { date: '2024-08-20', user: 'Dr. Johnson', location: 'Lab A1', quantity: 10, opened: false }
    ]
  },
  {
    id: 2,
    name: 'Ethanol',
    batchNumber: 'A424112302',
    brand: 'ChemPure',
    volume: '1L',
    initialQuantity: 100,
    currentQuantity: 80,
    expirationDate: '2025-06-30',
    dateOfArrival: '2024-02-01',
    safetyClass: 'flammable',
    location: 'Lab B2',
    ghsSymbols: ['flammable'],
    usageLog: []
  },
  {
    id: 3,
    name: 'Sodium Hydroxide',
    batchNumber: 'A424112303',
    brand: 'LabChemie',
    volume: '250g',
    initialQuantity: 25,
    currentQuantity: 5,
    expirationDate: '2024-10-15',
    dateOfArrival: '2024-03-10',
    safetyClass: 'toxic',
    location: 'Lab C3',
    ghsSymbols: ['toxic', 'health-hazard'],
    usageLog: []
  }
];

// Mock data for equipment
export const initialEquipment = [
  {
    id: 1,
    name: 'Centrifuge',
    model: 'CF-2000',
    serialId: 'CF2000-001',
    status: 'Broken',
    location: 'Lab A1',
    purchaseDate: '2023-01-15',
    warrantyExpiration: '2026-01-15',
    condition: 'Good',
    lastMaintenance: '2024-07-15',
    nextMaintenance: '2024-10-15',
    assignedUser: null,
    maintenanceLog: []
  },
  {
    id: 2,
    name: 'Microscope',
    model: 'MX-500',
    serialId: 'MX500-002',
    status: 'Available',
    location: 'Lab B2',
    purchaseDate: '2023-03-20',
    warrantyExpiration: '2025-03-20',
    condition: 'Good',
    lastMaintenance: '2024-06-10',
    nextMaintenance: '2024-12-10',
    assignedUser: 'Dr. Smith',
    maintenanceLog: []
  }
];

// Mock users
export const users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
  { id: 2, username: 'user1', password: 'user123', role: 'user', name: 'Dr. Smith' },
  { id: 3, username: 'user2', password: 'user123', role: 'user', name: 'Dr. Johnson' }
];

// Safety class color mapping - UPDATED: 'safe' changed to 'moderate-hazard'
export const safetyColors = {
  'moderate-hazard': 'safety-moderate-hazard',  // Gray - Changed from 'safe'
  'toxic': 'safety-toxic',                      // Blue - Health Hazard
  'corrosive': 'safety-corrosive',              // White with border
  'reactive': 'safety-reactive',                // Yellow
  'flammable': 'safety-flammable'               // Red
};

// Status color mapping for equipment
export const statusColors = {
  'Available': 'status-available',
  'Broken': 'status-broken',
  'Under Maintenance': 'status-maintenance'
};

// GHS symbols mapping
export const ghsSymbols = {
  'explosive': '/ghs/explosive.png',
  'flammable': '/ghs/flammable.png',
  'oxidizing': '/ghs/oxidizing.png',
  'corrosive': '/ghs/corrosive.png',
  'toxic': '/ghs/toxic.png',
  'harmful': '/ghs/harmful.png',
  'health-hazard': '/ghs/health-hazard.png',
  'environmental-hazard': '/ghs/environmental-hazard.png',
  'compressed-gas': '/ghs/compressed-gas.png'
};