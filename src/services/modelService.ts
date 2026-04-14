// src/services/modelService.ts
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import * as jpeg from 'jpeg-js';
import { toByteArray } from 'base64-js';
import { UNIFIED_CLASSES, CLASS_NAMES, MALIGNANT_INDICES, QUALITY_THRESHOLDS } from '../config/classes';

let session: InferenceSession | null = null;

/**
 * Initialize the ONNX session
 */
export const initModel = async () => {
  if (session) return;
  try {
    // ONNX C++ backend requires a real physical file path, so we must extract 
    // it from the Android APK assets into the app's document directory first.
    const modelPath = RNFS.DocumentDirectoryPath + '/model.onnx';
    
    const exists = await RNFS.exists(modelPath);
    if (!exists) {
      console.log("Copying ONNX model from assets to local storage...");
      await RNFS.copyFileAssets('model.onnx', modelPath);
    }

    session = await InferenceSession.create(modelPath);
    console.log("Model loaded successfully from:", modelPath);
  } catch (e) {
    console.error("Failed to load ONNX model", e);
    throw e;
  }
};

/**
 * Normalizes an image, evaluates quality, and runs inference.
 */
export const runInference = async (imageUri: string) => {
  if (!session) await initModel();

  // 1. Read Image
  const base64Str = await RNFS.readFile(imageUri, 'base64');
  const buffer = toByteArray(base64Str);
  const rawImageData = jpeg.decode(buffer, { useTArray: true });
  const { width, height, data } = rawImageData;

  // We expect a 260x260 image. If not, ideally it should be resized beforehand.
  if (width !== 260 || height !== 260) {
    throw new Error(`Image must be resized to 260x260. Got ${width}x${height}`);
  }

  // 2. Compute Quality Metrics (Brightness & Laplacian Variance)
  let sumIntensity = 0;
  const intensities = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const intensity = 0.299 * r + 0.587 * g + 0.114 * b;
    sumIntensity += intensity;
    intensities[i] = intensity;
  }
  const meanBrightness = sumIntensity / (width * height);

  if (meanBrightness < QUALITY_THRESHOLDS.MIN_BRIGHTNESS || meanBrightness > QUALITY_THRESHOLDS.MAX_BRIGHTNESS) {
    throw new Error(`Quality Check Failed: Poorly lit image (Brightness: ${meanBrightness.toFixed(2)})`);
  }

  // Laplacian Variance (excluding 1px border)
  let sumLaplacian = 0;
  let sumLaplacianSq = 0;
  const lapCount = (width - 2) * (height - 2);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const center = intensities[idx];
      const lap = 4 * center 
                  - intensities[idx - 1] 
                  - intensities[idx + 1] 
                  - intensities[idx - width] 
                  - intensities[idx + width];
      sumLaplacian += lap;
      sumLaplacianSq += lap * lap;
    }
  }
  const meanLap = sumLaplacian / lapCount;
  const varianceLap = (sumLaplacianSq / lapCount) - (meanLap * meanLap);

  if (varianceLap < QUALITY_THRESHOLDS.MIN_LAPLACIAN_VARIANCE) {
    throw new Error(`Quality Check Failed: Image is too blurry (Laplacian Variance: ${varianceLap.toFixed(2)})`);
  }

  // 3. Preprocess to Float32Array [1, 3, 260, 260] (NCHW)
  const tensorData = new Float32Array(1 * 3 * 260 * 260);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIdx = (y * width + x) * 4;
      const r = data[pixelIdx] / 255.0;
      const g = data[pixelIdx + 1] / 255.0;
      const b = data[pixelIdx + 2] / 255.0;

      const normR = (r - mean[0]) / std[0];
      const normG = (g - mean[1]) / std[1];
      const normB = (b - mean[2]) / std[2];

      tensorData[0 * 260 * 260 + y * 260 + x] = normR;
      tensorData[1 * 260 * 260 + y * 260 + x] = normG;
      tensorData[2 * 260 * 260 + y * 260 + x] = normB;
    }
  }

  // 4. Run Inference
  const inputTensor = new Tensor('float32', tensorData, [1, 3, 260, 260]);
  const inputName = session!.inputNames[0];
  const feeds: Record<string, Tensor> = {};
  feeds[inputName] = inputTensor;

  const outputData = await session!.run(feeds);
  const outputName = session!.outputNames[0];
  const outputTensor = outputData[outputName];
  const logits = outputTensor.data as Float32Array;

  // 5. Apply Softmax
  const maxLogit = Math.max(...Array.from(logits));
  const exponentials = Array.from(logits).map(l => Math.exp(l - maxLogit));
  const sumExps = exponentials.reduce((a, b) => a + b, 0);
  const probabilities = exponentials.map(e => e / sumExps);

  // 6. Get Top-3 Predictions
  const predictions = probabilities
    .map((prob, index) => ({
      index,
      className: CLASS_NAMES[UNIFIED_CLASSES[index]],
      probability: prob,
      isMalignant: MALIGNANT_INDICES.has(index)
    }))
    .sort((a, b) => b.probability - a.probability);

  const top3 = predictions.slice(0, 3);
  const referToClinic = top3.some(p => p.isMalignant);

  return {
    top3,
    referToClinic,
    qualityMetrics: { brightness: meanBrightness, blurVariance: varianceLap }
  };
};
