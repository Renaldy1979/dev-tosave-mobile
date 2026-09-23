/**
 * Atraso artificial usado pelos services da fase 1 para que as telas
 * consigam exibir o estado de carregamento (skeleton) ao montar.
 *
 * Na fase 2, quando os services passam a chamar a API real, este
 * módulo deixa de existir (ou vira no-op) — o delay passa a ser
 * intrínseco à latência da rede.
 *
 * O valor é curto o suficiente para não atrapalhar a navegação local
 * e longo o suficiente para cruzar o limiar de 150 ms usado pelos
 * skeletons do design system.
 */
const SIMULATED_LATENCY_MS = 220;

export function simulateLatency(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, SIMULATED_LATENCY_MS);
  });
}
