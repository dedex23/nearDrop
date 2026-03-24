import { Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { isEmoji } from '@/utils/icon';

type Props = {
  icon: string;
  size: number;
  color: string;
};

export function CategoryIcon({ icon, size, color }: Props) {
  if (isEmoji(icon)) {
    return <Text style={{ fontSize: size - 2 }}>{icon}</Text>;
  }
  return (
    <MaterialCommunityIcons
      name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
      size={size}
      color={color}
    />
  );
}
