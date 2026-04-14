// src/config/classes.ts

/**
 * 16 Unified Classes in exact order as per the EfficientNet-B2 Model output.
 */
export const UNIFIED_CLASSES = [
  "MEL",       // 0 - Melanoma (Malignant)
  "BCC",       // 1 - Basal Cell Carcinoma (Malignant)
  "SCC",       // 2 - Squamous Cell Carcinoma (Malignant)
  "AK",        // 3 - Actinic Keratosis (Pre-Malignant / Malignant flag)
  "NEV",       // 4 - Melanocytic Nevus (Benign)
  "BKL",       // 5 - Benign Keratosis (Benign)
  "DF",        // 6 - Dermatofibroma (Benign)
  "VASC",      // 7 - Vascular Lesion (Benign)
  "SEK",       // 8 - Seborrheic Keratosis (Benign)
  "TINEA",     // 9 - Tinea / Ringworm (Inflammatory)
  "PSORIASIS", // 10 - Psoriasis (Inflammatory)
  "VITILIGO",  // 11 - Vitiligo (Inflammatory)
  "MELASMA",   // 12 - Melasma (Inflammatory)
  "FUNGAL",    // 13 - Fungal Infection (Inflammatory)
  "ECZEMA",    // 14 - Eczema / Dermatitis (Inflammatory)
  "URTICARIA", // 15 - Urticaria / Hives (Inflammatory)
];

/**
 * Human-readable class names for the UI.
 */
export const CLASS_NAMES: Record<string, string> = {
  "MEL": "Melanoma",
  "BCC": "Basal Cell Carcinoma",
  "SCC": "Squamous Cell Carcinoma",
  "AK": "Actinic Keratosis",
  "NEV": "Melanocytic Nevus",
  "BKL": "Benign Keratosis",
  "DF": "Dermatofibroma",
  "VASC": "Vascular Lesion",
  "SEK": "Seborrheic Keratosis",
  "TINEA": "Tinea (Ringworm)",
  "PSORIASIS": "Psoriasis",
  "VITILIGO": "Vitiligo",
  "MELASMA": "Melasma",
  "FUNGAL": "Fungal Infection",
  "ECZEMA": "Eczema / Dermatitis",
  "URTICARIA": "Urticaria (Hives)",
};

/**
 * Indices corresponding to malignant classes that require immediate clinical referral.
 * The report states any malignant class in the top-3 should flag a referral.
 * 0: MEL, 1: BCC, 2: SCC, 3: AK
 */
export const MALIGNANT_INDICES = new Set([0, 1, 2, 3]);

/**
 * Image Quality Standards
 */
export const QUALITY_THRESHOLDS = {
  MIN_LAPLACIAN_VARIANCE: 100, // For blur detection
  MIN_BRIGHTNESS: 40,
  MAX_BRIGHTNESS: 220,
};
