import React, { useState, useEffect } from 'react';
import {
  Alert,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

const WEATHER_API_KEY = 'apikey'; // Replace with your OpenWeatherMap API key

export default function App() {
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [skinType, setSkinType] = useState<string | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [showSkinTypeSelection, setShowSkinTypeSelection] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [currentTimeType, setCurrentTimeType] = useState<'morning' | 'afternoon' | 'night' | null>(null);
  const [notificationTimes, setNotificationTimes] = useState({
    morning: null,
    afternoon: null,
    night: null,
  });

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  useEffect(() => {
    const fetchWeatherAndLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Error', 'Location permission not granted.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const address = await Location.reverseGeocodeAsync(location.coords);
        const city = address[0]?.city || 'Unknown Location';

        setLocation(city);

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${location.coords.latitude}&lon=${location.coords.longitude}&units=metric&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        Alert.alert('Error', 'Unable to fetch weather and location data.');
      }
    };
    fetchWeatherAndLocation();
  }, []);

  const getAgeGroup = (age: number) => {
    if (age < 25) return 'youth';
    if (age < 50) return 'adult';
    return 'senior';
  };

  const getWeatherRecommendations = (skinType: string, ageGroup: string) => {
    if (!weather) return ['No weather data available.'];

    const { main } = weather;
    const isHot = main.temp > 30;
    const isCold = main.temp < 15;
    const isHumid = main.humidity > 70;

    let baseRecommendations = {
      youth: ['Hydrating Serum', 'SPF 50 Sunscreen'],
      adult: ['Anti-Aging Serum', 'Daily Sunscreen'],
      senior: ['Collagen Booster', 'Rich Hydration Cream'],
    };

    let recommendations = [...baseRecommendations[ageGroup]];

    if (isHot) recommendations.push('Mattifying Moisturizer');
    if (isCold) recommendations.push('Intensive Repair Cream');
    if (isHumid) recommendations.push('Light Gel Moisturizer');

    return recommendations;
  };

  const handleNext = () => {
    if (name.trim() && /^\d+$/.test(age)) {
      setShowSkinTypeSelection(true);
    } else {
      Alert.alert('Error', 'Please complete all fields correctly.');
    }
  };

  const handleSkinTypeSelection = (type: string) => {
    setSkinType(type);
    const ageGroup = getAgeGroup(parseInt(age, 10));
    const weatherBasedRecommendations = getWeatherRecommendations(type, ageGroup);
    setProducts(weatherBasedRecommendations);
    setRecommendations(weatherBasedRecommendations);

    setShowSummary(true);
  };

  const handleSetNotifications = () => {
    setCurrentTimeType('morning'); // Start with morning
  };

  const handleSetTime = (timeType: 'morning' | 'afternoon' | 'night', value: string) => {
    setNotificationTimes((prev) => ({
      ...prev,
      [timeType]: value,
    }));

    // Schedule notification
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      const trigger = new Date();
      trigger.setHours(hours, minutes, 0, 0);
      if (trigger < new Date()) {
        trigger.setDate(trigger.getDate() + 1);
      }

      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Skincare Reminder',
          body: `It's time for your ${timeType} skincare routine!`,
        },
        trigger,
      });
    }

    // Move to the next step
    if (timeType === 'morning') setCurrentTimeType('afternoon');
    else if (timeType === 'afternoon') setCurrentTimeType('night');
    else setCurrentTimeType(null); // End sequence
  };

  const handleSkipTime = (timeType: 'morning' | 'afternoon' | 'night') => {
    setNotificationTimes((prev) => ({
      ...prev,
      [timeType]: null,
    }));

    // Move to the next step
    if (timeType === 'morning') setCurrentTimeType('afternoon');
    else if (timeType === 'afternoon') setCurrentTimeType('night');
    else setCurrentTimeType(null); // End sequence
  };

  const handleRestart = () => {
    setName('');
    setAge('');
    setSkinType(null);
    setProducts([]);
    setRecommendations([]);
    setShowSkinTypeSelection(false);
    setShowSummary(false);
    setShowNotificationSettings(false);
    setNotificationTimes({ morning: null, afternoon: null, night: null });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Weather and Skincare App</Text>

      {!showSkinTypeSelection ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={(text) => setName(text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            keyboardType="numeric"
            value={age}
            onChangeText={(text) => /^\d*$/.test(text) && setAge(text)}
          />
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </>
      ) : showSummary ? (
        <>
          <Text style={styles.subtitle}>Summary</Text>
          <Text>
            Based on your location ({location}) and temperature (
            {weather?.main?.temp}°C), along with the personal details you entered, here are your results:
          </Text>
          <Text>Name: {name}</Text>
          <Text>Age: {age}</Text>
          <Text>Skin Type: {skinType}</Text>
          <Text style={styles.subtitle}>Recommendations:</Text>
          {recommendations.map((product, index) => (
            <Text key={index}>- {product}</Text>
          ))}

          <TouchableOpacity style={styles.button} onPress={handleSetNotifications}>
            <Text style={styles.buttonText}>Set Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleRestart}>
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Select Your Skin Type:</Text>
          <Picker
            selectedValue={skinType}
            style={styles.picker}
            onValueChange={(value: string) => handleSkinTypeSelection(value)}
          >
            <Picker.Item label="Select Skin Type" value="" />
            <Picker.Item label="Dry" value="dry" />
            <Picker.Item label="Oily" value="oily" />
            <Picker.Item label="Sensitive" value="sensitive" />
            <Picker.Item label="Normal" value="normal" />
          </Picker>
        </>
      )}

      {currentTimeType && (
        <>
          <Text style={styles.subtitle}>Set {currentTimeType} Notification Time:</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${currentTimeType} time (e.g., 08:00)`}
            onChangeText={(text) => handleSetTime(currentTimeType, text)}
          />
          <TouchableOpacity style={styles.button} onPress={() => handleSkipTime(currentTimeType)}>
            <Text style={styles.buttonText}>Skip</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f3f4f6',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0077cc',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 15,
    color: '#005b9f',
    textAlign: 'center',
  },
  input: {
    width: '90%',
    height: 50,
    borderColor: '#cccccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingLeft: 15,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  picker: {
    width: '90%',
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 15,
    borderColor: '#cccccc',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#0077cc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
