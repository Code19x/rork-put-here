import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Animated, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  currentValue?: string;
  onValueChange?: (text: string) => void;
  size?: number;
  color?: string;
}

const STT_URL = 'https://toolkit.rork.com/stt/transcribe/';

const CHUNK_INTERVAL_MS = 3000;
const SILENCE_TIMEOUT_MS = 2000;

const FILLER_PHRASES = [
  'thank you for watching',
  'thanks for watching',
  'please subscribe',
  'like and subscribe',
  'don\'t forget to subscribe',
  'see you next time',
  'bye bye',
  'goodbye',
];

function cleanTranscription(text: string): string {
  let cleaned = text.trim();
  for (const filler of FILLER_PHRASES) {
    const regex = new RegExp('\\s*' + filler + '\\s*\\.?\\s*', 'i');
    cleaned = cleaned.replace(regex, '').trim();
  }
  return cleaned;
}

export default function VoiceInput({
  onTranscription,
  currentValue,
  onValueChange,
  size = 20,
  color = Colors.primary,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const baseTextRef = useRef('');
  const accumulatedTextRef = useRef('');
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isChunkingRef = useRef(false);
  const webStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRealtime = currentValue !== undefined && onValueChange !== undefined;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback((onSilence: () => void) => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      console.log('Silence detected, auto-stopping recording');
      onSilence();
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    if (pulseLoop.current) {
      pulseLoop.current.stop();
      pulseLoop.current = null;
    }
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const transcribeAudio = useCallback(async (formData: FormData): Promise<string> => {
    try {
      const response = await fetch(STT_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`STT request failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.text && data.text.trim()) {
        console.log('Transcription result:', data.text);
        return data.text.trim();
      }
      return '';
    } catch (error) {
      console.log('Transcription error:', error);
      return '';
    }
  }, []);

  const updateFieldWithAccumulated = useCallback(() => {
    if (isRealtime && onValueChange) {
      const base = baseTextRef.current;
      const acc = accumulatedTextRef.current;
      const newValue = base ? `${base} ${acc}` : acc;
      onValueChange(newValue);
    }
  }, [isRealtime, onValueChange]);

  const stopChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  const startRecordingNative = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Microphone access is required for voice input.');
        return;
      }

      if (isRealtime) {
        baseTextRef.current = currentValue ?? '';
        accumulatedTextRef.current = '';
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      recordingRef.current = recording;
      setIsRecording(true);
      startPulse();

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('Recording started (native)');

      resetSilenceTimer(() => {
        stopRecordingNativeRef.current?.();
      });

      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering != null && status.metering > -40) {
          resetSilenceTimer(() => {
            stopRecordingNativeRef.current?.();
          });
        }
      });
      recording.setProgressUpdateInterval(300);

      if (isRealtime) {
        chunkTimerRef.current = setInterval(async () => {
          if (isChunkingRef.current) return;
          isChunkingRef.current = true;

          try {
            const currentRecording = recordingRef.current;
            if (!currentRecording) {
              isChunkingRef.current = false;
              return;
            }

            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();
            recordingRef.current = null;

            const newRecordingResult = await Audio.Recording.createAsync({
              android: {
                extension: '.m4a',
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
                sampleRate: 44100,
                numberOfChannels: 1,
                bitRate: 128000,
              },
              ios: {
                extension: '.wav',
                outputFormat: Audio.IOSOutputFormat.LINEARPCM,
                audioQuality: Audio.IOSAudioQuality.HIGH,
                sampleRate: 44100,
                numberOfChannels: 1,
                bitRate: 128000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
              },
              web: {
                mimeType: 'audio/webm',
                bitsPerSecond: 128000,
              },
            });
            recordingRef.current = newRecordingResult.recording;

            if (uri) {
              const fileType = Platform.OS === 'ios' ? 'wav' : 'm4a';
              const mimeType = Platform.OS === 'ios' ? 'audio/wav' : 'audio/m4a';
              const audioFile = { uri, name: `recording.${fileType}`, type: mimeType };
              const formData = new FormData();
              formData.append('audio', audioFile as unknown as Blob);

              const rawText = await transcribeAudio(formData);
              const text = cleanTranscription(rawText);
              if (text) {
                accumulatedTextRef.current = accumulatedTextRef.current
                  ? `${accumulatedTextRef.current} ${text}`
                  : text;
                updateFieldWithAccumulated();
              }
            }
          } catch (err) {
            console.log('Chunk recording error:', err);
          } finally {
            isChunkingRef.current = false;
          }
        }, CHUNK_INTERVAL_MS);
      }
    } catch (error) {
      console.log('Start recording error:', error);
      Alert.alert('Error', 'Could not start recording.');
    }
  }, [startPulse, isRealtime, currentValue, transcribeAudio, updateFieldWithAccumulated, resetSilenceTimer]);

  const stopRecordingNativeRef = useRef<(() => void) | null>(null);

  const stopRecordingNative = useCallback(async () => {
    clearSilenceTimer();
    stopChunkTimer();
    isChunkingRef.current = false;

    try {
      const recording = recordingRef.current;
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      stopPulse();

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('Recording stopped, URI:', uri);

      if (uri) {
        const fileType = Platform.OS === 'ios' ? 'wav' : 'm4a';
        const mimeType = Platform.OS === 'ios' ? 'audio/wav' : 'audio/m4a';
        const audioFile = { uri, name: `recording.${fileType}`, type: mimeType };
        const formData = new FormData();
        formData.append('audio', audioFile as unknown as Blob);

        if (isRealtime) {
          setIsProcessing(true);
          const rawText = await transcribeAudio(formData);
          const text = cleanTranscription(rawText);
          if (text) {
            accumulatedTextRef.current = accumulatedTextRef.current
              ? `${accumulatedTextRef.current} ${text}`
              : text;
            updateFieldWithAccumulated();
          }
          setIsProcessing(false);
        } else {
          setIsProcessing(true);
          const rawText = await transcribeAudio(formData);
          const text = cleanTranscription(rawText);
          if (text) {
            onTranscription(text);
          } else {
            Alert.alert('No speech detected', 'Please try again and speak clearly.');
          }
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.log('Stop recording error:', error);
      setIsRecording(false);
      stopPulse();
      setIsProcessing(false);
    }
  }, [stopPulse, stopChunkTimer, clearSilenceTimer, transcribeAudio, isRealtime, onTranscription, updateFieldWithAccumulated]);

  useEffect(() => {
    stopRecordingNativeRef.current = stopRecordingNative;
  }, [stopRecordingNative]);

  const startRecordingWebSpeech = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log('Web Speech API not available, falling back to MediaRecorder');
      return false;
    }

    try {
      if (isRealtime) {
        baseTextRef.current = currentValue ?? '';
        accumulatedTextRef.current = '';
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      let webSilenceTimer: ReturnType<typeof setTimeout> | null = null;

      const resetWebSilenceTimer = () => {
        if (webSilenceTimer) clearTimeout(webSilenceTimer);
        webSilenceTimer = setTimeout(() => {
          console.log('Web speech silence detected, auto-stopping');
          try { recognition.stop(); } catch (e) {}
        }, SILENCE_TIMEOUT_MS);
      };

      resetWebSilenceTimer();

      recognition.onresult = (event: any) => {
        let interim = '';
        resetWebSilenceTimer();
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        if (isRealtime && onValueChange) {
          const base = baseTextRef.current;
          const currentText = cleanTranscription(finalTranscript + interim);
          const newValue = base ? `${base} ${currentText}` : currentText;
          onValueChange(newValue);
          accumulatedTextRef.current = finalTranscript + interim;
        }
      };

      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsRecording(false);
          stopPulse();
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        if (webSilenceTimer) clearTimeout(webSilenceTimer);
        const cleanedFinal = cleanTranscription(finalTranscript);
        if (isRealtime && onValueChange) {
          const base = baseTextRef.current;
          if (cleanedFinal) {
            const newValue = base ? `${base} ${cleanedFinal}` : cleanedFinal;
            onValueChange(newValue);
          }
        } else if (cleanedFinal) {
          onTranscription(cleanedFinal);
        }
        speechRecognitionRef.current = null;
        setIsRecording(false);
        stopPulse();
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsRecording(true);
      startPulse();
      console.log('Web Speech API started');
      return true;
    } catch (error) {
      console.log('Web Speech API error:', error);
      return false;
    }
  }, [isRealtime, currentValue, onValueChange, onTranscription, startPulse, stopPulse]);

  const startRecordingWebFallback = useCallback(async () => {
    try {
      if (isRealtime) {
        baseTextRef.current = currentValue ?? '';
        accumulatedTextRef.current = '';
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      webStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      webChunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          webChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(webChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        setIsProcessing(true);
        const rawText = await transcribeAudio(formData);
        const text = cleanTranscription(rawText);
        if (text) {
          if (isRealtime) {
            accumulatedTextRef.current = text;
            updateFieldWithAccumulated();
          } else {
            onTranscription(text);
          }
        } else {
          Alert.alert('No speech detected', 'Please try again and speak clearly.');
        }
        setIsProcessing(false);
      };

      recorder.start();
      webRecorderRef.current = recorder;
      setIsRecording(true);
      startPulse();
      console.log('Recording started (web fallback)');
    } catch (error) {
      console.log('Web recording error:', error);
      Alert.alert('Error', 'Could not access microphone. Please check your browser permissions.');
    }
  }, [startPulse, transcribeAudio, isRealtime, currentValue, onTranscription, updateFieldWithAccumulated]);

  const startRecordingWeb = useCallback(async () => {
    const usedSpeechApi = startRecordingWebSpeech();
    if (!usedSpeechApi) {
      await startRecordingWebFallback();
    }
  }, [startRecordingWebSpeech, startRecordingWebFallback]);

  const stopRecordingWeb = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      setIsRecording(false);
      stopPulse();
      console.log('Web Speech API stopped');
      return;
    }

    const recorder = webRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      webRecorderRef.current = null;
    }
    if (webStreamRef.current) {
      webStreamRef.current.getTracks().forEach(track => track.stop());
      webStreamRef.current = null;
    }
    setIsRecording(false);
    stopPulse();
    console.log('Recording stopped (web)');
  }, [stopPulse]);

  const toggleRecording = useCallback(async () => {
    if (isProcessing) return;

    if (isRecording) {
      if (Platform.OS === 'web') {
        stopRecordingWeb();
      } else {
        await stopRecordingNative();
      }
    } else {
      if (Platform.OS === 'web') {
        await startRecordingWeb();
      } else {
        await startRecordingNative();
      }
    }
  }, [isRecording, isProcessing, startRecordingNative, stopRecordingNative, startRecordingWeb, stopRecordingWeb]);

  useEffect(() => {
    return () => {
      stopChunkTimer();
      clearSilenceTimer();
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, [stopChunkTimer, clearSilenceTimer]);

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={color} />
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        onPress={toggleRecording}
        style={[
          styles.container,
          isRecording && styles.containerRecording,
        ]}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="voice-input-btn"
      >
        {isRecording ? (
          <Square color="#fff" size={size - 4} fill="#fff" />
        ) : (
          <Mic color={color} size={size} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  containerRecording: {
    backgroundColor: '#E53935',
  },
});
