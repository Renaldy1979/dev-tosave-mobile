import { useEffect, useState } from "react";
import { View } from "react-native";
import { Heart, X } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { duration } from "@/theme/motion";

/**
 * CollectionPanel (componentes.md §1.3).
 *
 * Aparece na tela de detalhe quando o carro está na coleção. Mostra
 * "Na sua coleção" com a quantidade, badge "Repetido" quando qty > 1,
 * QuantityStepper e link "Remover da coleção" (abre ConfirmDialog).
 *
 * Animação de altura/opacidade (320 ms) ao montar/desmontar. `mounted`
 * controla o ciclo de vida: o painel só sai da árvore JS depois da
 * animação de saída terminar (via `scheduleOnRN`).
 */
type Props = {
  visible: boolean;
  quantity: number;
  carTitle: string;
  onChange: (next: number) => void;
  onRemove: () => Promise<void> | void;
};

const PANEL_MAX_HEIGHT = 200;

export function CollectionPanel({ visible, quantity, carTitle, onChange, onRemove }: Props) {
  const { c } = useTheme();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // `mounted` é true sempre que o painel está visível ou animando para
  // sair. Permite a animação de saída terminar antes de desmontar.
  const [mounted, setMounted] = useState(visible);
  const opacity = useSharedValue(visible ? 1 : 0);
  // `progress` 0 = fechado, 1 = aberto. Animamos maxHeight e opacity a
  // partir deste progress (sem scaleY para não distorcer o conteúdo).
  const progress = useSharedValue(visible ? 1 : 0);

  // Sincroniza a prop `visible` com a animação. Dispara a animação de
  // saída, e quando termina chama `setMounted(false)`.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: duration.slow,
        easing: Easing.out(Easing.ease),
      });
      opacity.value = withTiming(1, { duration: duration.slow });
    } else {
      progress.value = withTiming(
        0,
        { duration: duration.fast, easing: Easing.out(Easing.ease) },
        (finished) => {
          "worklet";
          if (finished) scheduleOnRN(setMounted, false);
        }
      );
      opacity.value = withTiming(0, { duration: duration.fast });
    }
    // progress e opacity são SharedValues estáveis — não precisam entrar
    // nas deps. Só `visible` reage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    maxHeight: progress.value * PANEL_MAX_HEIGHT,
  }));

  if (!mounted) return null;

  return (
    <>
      <Animated.View style={containerStyle} className="mx-4 mt-2">
        <View className="rounded-lg bg-surface-2 border border-border p-3 gap-3">
          {/* Linha 1: coração + "Na sua coleção" + quantidade */}
          <View className="flex-row items-center">
            <View
              className="rounded-md items-center justify-center bg-flame-soft"
              style={{ width: 36, height: 36 }}
            >
              <Heart color={c("flame")} size={18} strokeWidth={1.75} fill={c("flame")} />
            </View>
            <Text variant="body" className="font-sans-medium ml-3 flex-1">
              Na sua coleção
            </Text>
            <Text
              variant="display-md"
              tone="accent"
              className="font-display-black"
            >
              ×{quantity}
            </Text>
            {quantity > 1 ? (
              <View className="ml-2">
                <Badge variant="flame" size="sm">
                  Repetido
                </Badge>
              </View>
            ) : null}
          </View>

          {/* Linha 2: stepper + remover */}
          <View className="flex-row items-center justify-between">
            <QuantityStepper
              value={quantity}
              variant="secondary"
              onChange={onChange}
              onRemoveRequest={() => setConfirmOpen(true)}
            />
            <Button
              label="Remover da coleção"
              variant="ghost"
              size="sm"
              leftIcon={X}
              onPress={() => setConfirmOpen(true)}
            />
          </View>
        </View>
      </Animated.View>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Remover da coleção?"
        description={`${carTitle} sai da sua coleção.`}
        onConfirm={async () => {
          await onRemove();
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
