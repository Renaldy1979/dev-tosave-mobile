import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "../ui/Text";
import { CarImage } from "../car/CarImage";

/**
 * Forma mínima aceita pela linha — `Car` (coleção) e `CarListItem`
 * (catálogo) satisfazem as duas (`serieTitle` é opcional aqui).
 */
export type PickerCar = {
  id: string;
  title: string;
  imagemThumb: string | null;
  toy: string;
  serieTitle?: string;
};

/**
 * Linha de seleção de carro (BottomSheets de "Anunciar": carro
 * ofertado e carros desejados). `selected` mostra um check à direita.
 */
export function CarPickerRow({
  car,
  selected,
  onPress,
}: {
  car: PickerCar;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${car.title}${car.serieTitle ? `, ${car.serieTitle}` : ""}${selected ? ", selecionado" : ""}`}
      onPress={onPress}
      className="flex-row items-center gap-3 px-3 py-2 rounded-lg active:bg-surface-3"
      style={{ minHeight: 56 }}
    >
      <CarImage uri={car.imagemThumb} style={{ width: 44, height: 44, borderRadius: 6 }} />
      <View className="flex-1 min-w-0">
        <Text variant="body-sm" className="font-sans-medium" numberOfLines={1}>
          {car.title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {[car.serieTitle, car.toy].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View
        className={selected ? "bg-primary" : "border border-border-strong"}
        style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
      >
        {selected ? <Check color={c("primary-fg")} size={16} strokeWidth={2} /> : null}
      </View>
    </Pressable>
  );
}
