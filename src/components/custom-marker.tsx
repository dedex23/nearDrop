import { View, StyleSheet } from 'react-native';
import { CategoryIcon } from '@/components/category-icon';

type Props = {
  color: string;
  icon: string;
};

export function CustomMarkerView({ color, icon }: Props) {
  return (
    <View style={[styles.marker, { backgroundColor: color }]}>
      <CategoryIcon icon={icon} size={16} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
