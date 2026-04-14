import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import { initModel, runInference } from './src/services/modelService';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);

  useEffect(() => {
    // Warm up and initialize ONNX on boot
    const bootModel = async () => {
      try {
        await initModel();
        setModelReady(true);
      } catch (e) {
        Alert.alert("Initialization Error", "Failed to load offline model. Ensure model.onnx is in assets.");
      }
    };
    bootModel();
  }, []);

  const handleImagePicker = async (type: 'camera' | 'gallery') => {
    const options = { mediaType: 'photo' as const, quality: 1 };
    
    let response: ImagePickerResponse;
    if (type === 'camera') {
      response = await launchCamera(options);
    } else {
      response = await launchImageLibrary(options);
    }

    if (response.didCancel || !response.assets || response.assets.length === 0) return;
    
    const uri = response.assets[0].uri;
    if (!uri) return;

    setSelectedImageUri(uri);
    setResults(null);
    processImage(uri);
  };

  const processImage = async (uri: string) => {
    if (!modelReady) {
      Alert.alert("Model not ready", "The classification model is still initializing.");
      return;
    }

    setLoading(true);
    try {
      // Resize to 260x260 for EfficientNet-B2
      const resizedImage = await ImageResizer.createResizedImage(
        uri,
        260,
        260,
        'JPEG',
        100,
        0,
        undefined,
        false,
        { mode: 'stretch' }
      );
      
      const inferenceResult = await runInference(resizedImage.uri);
      setResults(inferenceResult);
    } catch (err: any) {
      Alert.alert("Analysis Error", err.message || "Failed to analyze image.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FC" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <Text style={styles.appTitle}>DermaScreen</Text>
          <Text style={styles.appSubtitle}>Offline Dermatological AI</Text>
        </View>

        {!modelReady ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Initializing Model Engine...</Text>
          </View>
        ) : (
          <View style={styles.contentBox}>
            
            {/* Image Display */}
            <View style={styles.imageContainer}>
              {selectedImageUri ? (
                <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderText}>Tap below to select an image</Text>
                </View>
              )}
            </View>

            {/* Inference Results or Loading */}
            {loading ? (
              <View style={styles.inferenceLoading}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.inferenceText}>Analyzing lesional morphology...</Text>
              </View>
            ) : results ? (
              <View style={styles.resultsContainer}>
                {results.referToClinic && (
                  <View style={styles.alertBox}>
                    <Text style={styles.alertTitle}>⚠️ URGENT</Text>
                    <Text style={styles.alertDesc}>Malignancy traits detected in top predictions. Immediate clinical evaluation is strongly recommended.</Text>
                  </View>
                )}
                
                <Text style={styles.resultsTitle}>Prediction Confidence</Text>
                {results.top3.map((pred: any, i: number) => (
                  <View key={i} style={[styles.predictionRow, pred.isMalignant && styles.rowMalignant]}>
                    <Text style={styles.className}>{pred.className}</Text>
                    <View style={styles.probBarContainer}>
                      <View style={[styles.probBar, { width: `${pred.probability * 100}%`, backgroundColor: pred.isMalignant ? '#FF3B30' : '#34C759' }]} />
                    </View>
                    <Text style={styles.probText}>{(pred.probability * 100).toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => handleImagePicker('camera')}>
                <Text style={styles.btnText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleImagePicker('gallery')}>
                <Text style={styles.btnTextSecondary}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  headerBox: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2C3E50',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  loadingBox: {
    marginTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: '#7F8C8D',
    fontSize: 16,
  },
  contentBox: {
    width: '100%',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#EAECEF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  placeholderText: {
    color: '#95A5A6',
    fontSize: 16,
    textAlign: 'center',
  },
  inferenceLoading: {
    padding: 30,
    alignItems: 'center',
  },
  inferenceText: {
    marginTop: 15,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  resultsContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  alertBox: {
    backgroundColor: '#FFF0F0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  alertTitle: {
    color: '#FF3B30',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  alertDesc: {
    color: '#D32F2F',
    fontSize: 13,
    lineHeight: 18,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowMalignant: {
  },
  className: {
    flex: 1,
    fontSize: 14,
    color: '#34495E',
    fontWeight: '500',
  },
  probBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F3F5',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  probBar: {
    height: '100%',
    borderRadius: 4,
  },
  probText: {
    width: 45,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#2C3E50',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  btnTextSecondary: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  }
});
