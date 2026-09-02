const CATEGORY_EXPERIENCE_POLICY = Object.freeze({
  FOOD_BEVERAGE: Object.freeze({
    presets: ['DINING_JOURNEY'],
    navigationModes: ['CONTEXTUAL'],
    detailPresentations: ['MORPH', 'DISH_DOSSIER'],
    commitStyles: ['MATERIAL', 'PAPER_RIP'],
    persistentTray: true,
    context: Object.freeze({ tableNumber: true, serviceMode: true, passenger: false }),
  }),
  RESTAURANT: Object.freeze({
    presets: ['DINING_JOURNEY'],
    navigationModes: ['CONTEXTUAL'],
    detailPresentations: ['MORPH', 'DISH_DOSSIER'],
    commitStyles: ['MATERIAL', 'PAPER_RIP'],
    persistentTray: true,
    context: Object.freeze({ tableNumber: true, serviceMode: true, passenger: false }),
  }),
  RETAIL: Object.freeze({
    presets: ['SHOP_FLOOR'],
    navigationModes: ['CONTEXTUAL', 'AISLE_TRAVERSE'],
    detailPresentations: ['MORPH', 'PRODUCT_DOSSIER'],
    commitStyles: ['MATERIAL', 'LIFT_INTO_TRAY'],
    persistentTray: true,
    context: Object.freeze({ tableNumber: false, serviceMode: false, passenger: false }),
  }),
  HOSPITALITY: Object.freeze({
    presets: ['BUILDING_WALK'],
    navigationModes: ['CONTEXTUAL', 'FLOOR_TRAVERSE'],
    detailPresentations: ['MORPH', 'ROOM_DOSSIER'],
    commitStyles: ['MATERIAL'],
    persistentTray: false,
    context: Object.freeze({ tableNumber: false, serviceMode: false, passenger: false }),
  }),
  HOTEL: Object.freeze({
    presets: ['BUILDING_WALK'],
    navigationModes: ['CONTEXTUAL', 'FLOOR_TRAVERSE'],
    detailPresentations: ['MORPH', 'ROOM_DOSSIER'],
    commitStyles: ['MATERIAL'],
    persistentTray: false,
    context: Object.freeze({ tableNumber: false, serviceMode: false, passenger: false }),
  }),
  LOGISTICS: Object.freeze({
    presets: ['TRAVEL_JOURNEY'],
    navigationModes: ['CONTEXTUAL', 'JOURNEY_TIMELINE'],
    detailPresentations: ['MORPH', 'SEAT_DOSSIER'],
    commitStyles: ['MATERIAL'],
    persistentTray: false,
    context: Object.freeze({ tableNumber: false, serviceMode: false, passenger: true }),
  }),
  TRANSIT: Object.freeze({
    presets: ['TRAVEL_JOURNEY'],
    navigationModes: ['CONTEXTUAL', 'JOURNEY_TIMELINE'],
    detailPresentations: ['MORPH', 'SEAT_DOSSIER'],
    commitStyles: ['MATERIAL'],
    persistentTray: false,
    context: Object.freeze({ tableNumber: false, serviceMode: false, passenger: true }),
  }),
  DEFAULT: Object.freeze({
    presets: ['SERVICE_JOURNEY'],
    navigationModes: ['CONTEXTUAL'],
    detailPresentations: ['MORPH', 'SERVICE_DOSSIER'],
    commitStyles: ['MATERIAL'],
    persistentTray: false,
    context: Object.freeze({ tableNumber: false, serviceMode: false, passenger: false }),
  }),
});

export function experiencePolicyForCategory(category) {
  return CATEGORY_EXPERIENCE_POLICY[String(category || '').trim().toUpperCase()] || CATEGORY_EXPERIENCE_POLICY.DEFAULT;
}

export { CATEGORY_EXPERIENCE_POLICY };