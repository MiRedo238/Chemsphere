// src/backend/seed.js
import { createUser, insertUserProfile } from './api/users.js'
import { insertChemicals } from './api/chemicals.js'
import { insertEquipment } from './api/equipment.js'
import { insertUsageLogs } from './api/usageLogs.js'
import { insertAuditLogs } from './api/auditLogs.js'

async function seedDatabase() {
  try {
    // Create Auth Users
    const adminAuth = await createUser({ email: 'admin@lab.com', password: 'admin123', role: 'admin' })
    const studentAuth = await createUser({ email: 'student@lab.com', password: 'student123', role: 'user' })

    // Insert user profiles
    const users = await insertUserProfile({
      id: adminAuth.user.id,
      username: 'admin',
      email: 'admin@lab.com',
      role: 'admin',
      active: true
    })
    const students = await insertUserProfile({
      id: studentAuth.user.id,
      username: 'student_user',
      email: 'student@lab.com',
      role: 'user',
      active: true
    })

    // Insert chemicals
    const chemicals = await insertChemicals([
      {
        name: 'Ethanol', batch_number: 'ETH-001', brandname: 'Sigma Aldrich', volume_per_unit: 500, initial_quantity: 10, current_quantity: 8, expiration_date: '2026-02-15', date_of_arrival: '2024-05-01', safety_class: 'flammable', location: 'Cabinet A1', ghs_symbols: ['Flame'], created_by: users[0].id
      },
      {
        name: 'Hydrochloric Acid', batch_number: 'HCL-045', brandname: 'Merck', volume_per_unit: 1000, initial_quantity: 5, current_quantity: 3, expiration_date: '2025-12-30', date_of_arrival: '2024-07-10', safety_class: 'corrosive', location: 'Cabinet B3', ghs_symbols: ['Corrosion'], created_by: users[0].id
      },
      {
        name: 'Sodium Hydroxide', batch_number: 'NAOH-109', brandname: 'Fisher Scientific', volume_per_unit: 250, initial_quantity: 8, current_quantity: 6, expiration_date: '2025-10-01', date_of_arrival: '2024-09-12', safety_class: 'corrosive', location: 'Cabinet C1', ghs_symbols: ['Corrosion'], created_by: users[0].id
      },
      {
        name: 'Acetone', batch_number: 'ACE-110', brandname: 'BDH Chemicals', volume_per_unit: 500, initial_quantity: 12, current_quantity: 10, expiration_date: '2027-01-05', date_of_arrival: '2024-04-20', safety_class: 'flammable', location: 'Cabinet A2', ghs_symbols: ['Flame'], created_by: users[0].id
      },
      {
        name: 'Hydrogen Peroxide', batch_number: 'HP-023', brandname: 'LabTech', volume_per_unit: 250, initial_quantity: 4, current_quantity: 2, expiration_date: '2025-01-12', date_of_arrival: '2023-12-10', safety_class: 'reactive', location: 'Refrigerator 1', ghs_symbols: ['Exclamation Mark'], created_by: users[0].id
      },
      {
        name: 'Sulfuric Acid', batch_number: 'H2SO4-055', brandname: 'Chem-Lab', volume_per_unit: 500, initial_quantity: 6, current_quantity: 5, expiration_date: '2026-06-15', date_of_arrival: '2024-02-01', safety_class: 'toxic', location: 'Cabinet B1', ghs_symbols: ['Skull and Crossbones'], created_by: users[0].id
      },
      {
        name: 'Ammonium Nitrate', batch_number: 'NH4N-011', brandname: 'Sigma Aldrich', volume_per_unit: 100, initial_quantity: 3, current_quantity: 3, expiration_date: '2025-04-22', date_of_arrival: '2024-01-10', safety_class: 'reactive', location: 'Cabinet D2', ghs_symbols: ['Exploding Bomb'], created_by: users[0].id
      },
      {
        name: 'Phenol', batch_number: 'PHEN-002', brandname: 'Merck', volume_per_unit: 250, initial_quantity: 2, current_quantity: 1, expiration_date: '2025-08-01', date_of_arrival: '2023-11-22', safety_class: 'toxic', location: 'Cabinet B4', ghs_symbols: ['Skull and Crossbones'], created_by: users[0].id
      }
    ])

    // Insert equipment
    const equipment = await insertEquipment([
      {
        name: 'Centrifuge', model: 'SpinFast 3000', serial_id: 'EQ-001', status: 'Available', location: 'Lab Room 2', purchase_date: '2022-06-01', warranty_expiration: '2025-06-01', last_maintenance: '2025-02-10', next_maintenance: '2026-02-10', created_by: users[0].id
      },
      {
        name: 'Microscope', model: 'OptiView X5', serial_id: 'EQ-002', status: 'Under Maintenance', location: 'Lab Room 1', purchase_date: '2021-09-10', warranty_expiration: '2024-09-10', last_maintenance: '2025-03-12', next_maintenance: '2026-03-12', created_by: users[0].id
      },
      {
        name: 'pH Meter', model: 'PH-Pro 100', serial_id: 'EQ-003', status: 'Available', location: 'Lab Room 3', purchase_date: '2023-01-05', warranty_expiration: '2026-01-05', last_maintenance: '2025-01-10', next_maintenance: '2025-07-10', created_by: users[0].id
      },
      {
        name: 'Analytical Balance', model: 'Precision 200', serial_id: 'EQ-004', status: 'Broken', location: 'Lab Room 2', purchase_date: '2020-10-15', warranty_expiration: '2023-10-15', last_maintenance: '2024-09-15', next_maintenance: '2025-09-15', created_by: users[0].id
      },
      {
        name: 'Hot Plate Stirrer', model: 'HeatMix 50', serial_id: 'EQ-005', status: 'Available', location: 'Lab Room 1', purchase_date: '2022-12-02', warranty_expiration: '2025-12-02', last_maintenance: '2025-04-01', next_maintenance: '2026-04-01', created_by: users[0].id
      },
      {
        name: 'Fume Hood', model: 'SafeAir 900', serial_id: 'EQ-006', status: 'Available', location: 'Lab Room 4', purchase_date: '2021-02-12', warranty_expiration: '2024-02-12', last_maintenance: '2025-03-05', next_maintenance: '2026-03-05', created_by: users[0].id
      }
    ])

    // Insert usage logs
    const logs = await insertUsageLogs([
      {
        user_id: students[0].id, item_type: 'chemical', item_id: chemicals[0].id, used_quantity: 1, remaining_quantity: 7, location: 'Cabinet A1', notes: 'Used for solvent cleaning'
      },
      {
        user_id: students[0].id, item_type: 'chemical', item_id: chemicals[3].id, used_quantity: 0.5, remaining_quantity: 9.5, location: 'Cabinet A2', notes: 'Used for chromatography test'
      },
      {
        user_id: students[0].id, item_type: 'equipment', item_id: equipment[0].id, used_quantity: null, remaining_quantity: null, location: 'Lab Room 2', notes: 'Used for centrifugation experiment'
      }
    ])

    // Insert audit logs
    await insertAuditLogs([
      { user_id: users[0].id, action: 'INSERT', target: 'chemicals', metadata: { count: 8 } },
      { user_id: users[0].id, action: 'INSERT', target: 'equipment', metadata: { count: 6 } },
      { user_id: students[0].id, action: 'INSERT', target: 'usage_logs', metadata: { count: 3 } }
    ])

    console.log('🎉 Seeding complete!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
  }
}

seedDatabase()
