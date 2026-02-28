import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { CategoryPicker } from './category-chip';
import { geocodeAddress } from '@/services/geocoding';
import type { Category, PlaceInsert } from '@/types';

interface PlaceFormProps {
  initialValues?: Partial<PlaceInsert>;
  onSubmit: (data: PlaceInsert) => Promise<void>;
  submitLabel?: string;
}

export function PlaceForm({ initialValues, onSubmit, submitLabel = 'Save' }: PlaceFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [address, setAddress] = useState(initialValues?.address ?? '');
  const [category, setCategory] = useState<Category>(initialValues?.category ?? 'other');
  const [tags, setTags] = useState(initialValues?.tags?.join(', ') ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [radius, setRadius] = useState(initialValues?.radius ?? 150);
  const [latitude, setLatitude] = useState(initialValues?.latitude ?? 0);
  const [longitude, setLongitude] = useState(initialValues?.longitude ?? 0);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({});

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setIsGeocoding(true);
    setGeocodeError(null);

    const result = await geocodeAddress(address);
    if (result) {
      setLatitude(result.latitude);
      setLongitude(result.longitude);
    } else {
      setGeocodeError('Address not found. Try a more specific address.');
    }
    setIsGeocoding(false);
  };

  const validate = (): boolean => {
    const newErrors: { name?: string; address?: string } = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Auto-geocode if no coordinates yet
      let finalLat = latitude;
      let finalLon = longitude;
      if (finalLat === 0 && finalLon === 0) {
        const result = await geocodeAddress(address);
        if (result) {
          finalLat = result.latitude;
          finalLon = result.longitude;
        }
      }

      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        category,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        notes: notes.trim(),
        radius,
        latitude: finalLat,
        longitude: finalLon,
        sourceType: initialValues?.sourceType ?? 'manual',
        sourceUrl: initialValues?.sourceUrl ?? null,
        imageUrl: initialValues?.imageUrl ?? null,
        isActive: initialValues?.isActive ?? true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <TextInput
        label="Name *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        error={!!errors.name}
        style={styles.input}
      />
      {errors.name && <HelperText type="error">{errors.name}</HelperText>}

      <View style={styles.addressRow}>
        <TextInput
          label="Address *"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          error={!!errors.address}
          style={[styles.input, styles.addressInput]}
          onBlur={handleGeocode}
        />
        <Button
          mode="outlined"
          onPress={handleGeocode}
          loading={isGeocoding}
          disabled={isGeocoding || !address.trim()}
          style={styles.geocodeButton}
          compact
        >
          Geocode
        </Button>
      </View>
      {errors.address && <HelperText type="error">{errors.address}</HelperText>}
      {geocodeError && <HelperText type="error">{geocodeError}</HelperText>}
      {latitude !== 0 && longitude !== 0 && (
        <HelperText type="info">
          Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </HelperText>
      )}

      <Text variant="labelLarge" style={styles.sectionLabel}>
        Category
      </Text>
      <CategoryPicker value={category} onChange={setCategory} />

      <TextInput
        label="Tags (comma-separated)"
        value={tags}
        onChangeText={setTags}
        mode="outlined"
        style={styles.input}
        placeholder="e.g. brunch, terrace, date night"
      />

      <TextInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.sectionLabel}>
        Notification radius: {radius}m
      </Text>
      <Slider
        value={radius}
        onValueChange={setRadius}
        minimumValue={50}
        maximumValue={500}
        step={10}
        minimumTrackTintColor="#6200EE"
        maximumTrackTintColor="#E0E0E0"
        thumbTintColor="#6200EE"
        style={styles.slider}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.submitButton}
      >
        {submitLabel}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressInput: {
    flex: 1,
  },
  geocodeButton: {
    marginTop: 8,
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  slider: {
    marginHorizontal: 8,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 32,
  },
});
