import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus, Audio } from "expo-av";

const PIN_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3";

const SPLASH_VIDEO_URL =
  "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/or4rw71ctk8qcxv8u1lc6";



interface VideoSplashScreenProps {
  onFinish: () => void;
}

export default function VideoSplashScreen({ onFinish }: VideoSplashScreenProps) {
  const videoRef = useRef<Video>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [hasError, setHasError] = useState(false);
  const { width, height } = useWindowDimensions();
  const videoSize = Math.min(width, height) * 0.8;
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundPlayedRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadSound = async () => {
      try {
        if (Platform.OS !== "web") {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: PIN_SOUND_URL },
          { shouldPlay: false, volume: 0.5 }
        );
        if (isMounted) {
          soundRef.current = sound;
          console.log("Splash pin sound loaded");
        } else {
          await sound.unloadAsync();
        }
      } catch (e) {
        console.log("Splash sound load error:", e);
      }
    };
    void loadSound();
    return () => {
      isMounted = false;
      const s = soundRef.current;
      if (s) {
        s.unloadAsync().catch((err) => console.log("Splash sound unload error:", err));
        soundRef.current = null;
      }
    };
  }, []);

  const playPinSound = useCallback(async () => {
    if (soundPlayedRef.current) return;
    soundPlayedRef.current = true;
    try {
      const s = soundRef.current;
      if (s) {
        await s.setPositionAsync(0);
        await s.playAsync();
        console.log("Splash pin sound played");
      }
    } catch (e) {
      console.log("Splash sound play error:", e);
    }
  }, []);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          console.log("Video splash error:", status.error);
          setHasError(true);
          onFinish();
        }
        return;
      }

      if (status.isPlaying && status.positionMillis > 200 && !soundPlayedRef.current) {
        void playPinSound();
      }

      if (status.didJustFinish) {
        void playPinSound();
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }
    },
    [fadeAnim, onFinish, playPinSound]
  );

  const handleError = useCallback(
    (error: string) => {
      console.log("Video splash load error:", error);
      setHasError(true);
      onFinish();
    },
    [onFinish]
  );

  if (hasError) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} testID="video-splash-screen">
      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          source={{ uri: SPLASH_VIDEO_URL }}
          style={{ width: videoSize, height: videoSize }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleError}
        />
      </View>
      <View style={styles.overlay} pointerEvents="none" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#F5F0EB",
  },
  videoWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
});
