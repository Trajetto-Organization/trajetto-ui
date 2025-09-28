// Smart photo requirements based on backend logic - Same as mobile
const getPhotoRequirements = (formData: any) => {
  const requirements = {
    // Always required
    current_mileage: { required: true, reason: "Proteção legal" },
    fuel_level_adequate: { required: true, reason: "Proteção legal" },
    tires_condition: { required: true, reason: "Proteção legal" },

    // Required if not OK
    brakes_working: {
      required: !formData.brakes_working,
      reason: "Segurança crítica - obrigatório se não OK",
    },
    headlights_working: {
      required: !formData.headlights_working,
      reason: "Segurança crítica - obrigatório se não OK",
    },
    taillights_working: {
      required: !formData.taillights_working,
      reason: "Segurança crítica - obrigatório se não OK",
    },
    turn_signals_working: {
      required: !formData.turn_signals_working,
      reason: "Segurança crítica - obrigatório se não OK",
    },
    steering_wheel_condition: {
      required: formData.steering_wheel_condition !== "good",
      reason: "Segurança crítica - obrigatório se não OK",
    },
    battery_condition: {
      required: formData.battery_condition !== "good",
      reason: "Segurança crítica - obrigatório se não OK",
    },
    bumpers_condition: {
      required: formData.bumpers_condition !== "good",
      reason: "Segurança crítica - obrigatório se não OK",
    },
    windshield_condition: {
      required: formData.windshield_condition !== "good",
      reason: "Segurança crítica - obrigatório se não OK",
    },
    mirrors_condition: {
      required: formData.mirrors_condition !== "good",
      reason: "Segurança crítica - obrigatório se não OK",
    },
    spare_tire_condition: {
      required: formData.spare_tire_condition !== "good",
      reason: "Segurança crítica - obrigatório se não OK",
    },

    // Technical checks - required if not OK
    oil_level_adequate: {
      required: !formData.oil_level_adequate,
      reason: "Verificação técnica - obrigatório se não OK",
    },
    radiator_water_adequate: {
      required: !formData.radiator_water_adequate,
      reason: "Verificação técnica - obrigatório se não OK",
    },
    brake_fluid_adequate: {
      required: !formData.brake_fluid_adequate,
      reason: "Verificação técnica - obrigatório se não OK",
    },

    // Internal items - required if not OK
    seatbelts_working: {
      required: !formData.seatbelts_working,
      reason: "Itens internos - obrigatório se não OK",
    },
    dashboard_working: {
      required: !formData.dashboard_working,
      reason: "Itens internos - obrigatório se não OK",
    },
    clutch_working: {
      required: !formData.clutch_working,
      reason: "Itens internos - obrigatório se não OK",
    },
  };

  return requirements;
};

// Helper function to validate form completeness
export const validateChecklistForm = (
  formValues: Record<string, any>,
  checklistFiles: Record<string, File[]>,
) => {
  // Required form fields
  const requiredFields = [
    "checklist_date",
    "current_mileage",
    "tires_condition",
    "fuel_level_adequate",
    "headlights_working",
    "taillights_working",
    "turn_signals_working",
    "bumpers_condition",
    "windshield_condition",
    "mirrors_condition",
    "seatbelts_working",
    "dashboard_working",
    "brakes_working",
    "clutch_working",
    "oil_level_adequate",
    "radiator_water_adequate",
    "brake_fluid_adequate",
    "steering_wheel_condition",
    "battery_condition",
    "driver_license_valid",
    "vehicle_documents_valid",
    "insurance_valid",
    "fire_extinguisher_valid",
    "warning_triangle_present",
    "jack_present",
    "spare_tire_condition",
    "overall_condition",
  ];

  // Check if all required fields are filled
  const missingFields = requiredFields.filter((field) => {
    const value = formValues[field];
    return value === undefined || value === null || value === "";
  });

  // Check required photos
  const photoRequirements = getPhotoRequirements(formValues);
  const requiredPhotoFields = Object.entries(photoRequirements)
    .filter(([_, req]) => req.required)
    .map(([field, _]) => field);

  const missingPhotos = requiredPhotoFields.filter(
    (field) => !checklistFiles[field] || checklistFiles[field].length === 0,
  );

  return {
    isValid: missingFields.length === 0 && missingPhotos.length === 0,
    missingFields,
    missingPhotos,
  };
};

// Enhanced photo requirements validation for UPDATE considering existing photos
export const validateUpdatePhotoRequirements = (
  formValues: Record<string, any>,
  checklistFiles: Record<string, File[]>,
  existingPhotos: string[] = [],
  photosToRemove: string[] = [],
) => {
  const photoRequirements = getPhotoRequirements(formValues);
  const requiredPhotoFields = Object.entries(photoRequirements)
    .filter(([_, req]) => req.required)
    .map(([field, _]) => field);

  const missingPhotos = requiredPhotoFields.filter((field) => {
    // Check if field has new photos
    const hasNewPhotos =
      checklistFiles[field] && checklistFiles[field].length > 0;

    // Check if field has existing photos that won't be removed
    const existingFieldPhotos = existingPhotos.filter(
      (photoUrl) =>
        photoUrl.includes(field) && !photosToRemove.includes(photoUrl),
    );
    const hasRemainingExistingPhotos = existingFieldPhotos.length > 0;

    // Field is valid if it has either new photos OR remaining existing photos
    return !hasNewPhotos && !hasRemainingExistingPhotos;
  });

  return {
    isValid: missingPhotos.length === 0,
    missingPhotos,
    requiredFields: requiredPhotoFields,
  };
};

export { getPhotoRequirements };
