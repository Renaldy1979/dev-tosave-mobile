import { Stack } from "expo-router";

/**
 * Pilha própria da aba Mais (`docs/briefings/navegacao-mais.md`): a
 * lista (`index`) e as telas que não estão na barra inferior. A aba
 * Mais continua ativa e o voltar retorna para a lista — comportamento
 * padrão de uma Stack aninhada numa Tab do expo-router.
 */
export default function MaisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="series" />
      <Stack.Screen name="troca" />
      <Stack.Screen name="estatisticas" />
      <Stack.Screen name="notificacoes" />
      <Stack.Screen name="perfil" />
    </Stack>
  );
}
