/**
 * Junção N:N entre carros e atributos.
 *
 * Mantida como tabela própria (em vez de um array dentro de `Car`) para
 * espelhar o modelo relacional do portal web e simplificar o filtro da
 * Busca (multi-seleção com AND entre atributos).
 */
export interface CarAttributeLink {
  carId: string;
  attributeId: string;
}

export const carAttributesMock: CarAttributeLink[] = [
  // HW J-Imports — a maioria é Real Riders; alguns têm atributos especiais.
  { carId: "car-datsun-510", attributeId: "attr-real-riders" },
  { carId: "car-datsun-510", attributeId: "attr-thunt-2024" },

  { carId: "car-nissan-skyline-r34", attributeId: "attr-real-riders" },
  { carId: "car-nissan-skyline-r34", attributeId: "attr-treasure-hunt" },

  { carId: "car-toyota-supra-a80", attributeId: "attr-real-riders" },
  { carId: "car-toyota-supra-a80", attributeId: "attr-super-treasure-hunt" },
  { carId: "car-toyota-supra-a80", attributeId: "attr-premium" },

  { carId: "car-mazda-rx7-fd", attributeId: "attr-real-riders" },
  { carId: "car-mazda-rx7-fd", attributeId: "attr-conv" },

  { carId: "car-honda-civic-eg", attributeId: "attr-real-riders" },

  { carId: "car-subaru-impreza-wrx", attributeId: "attr-real-riders" },

  { carId: "car-mitsubishi-lancer-evo", attributeId: "attr-real-riders" },

  // Car Culture — Real Riders + Premium (tampas removíveis) por padrão.
  { carId: "car-mazda-mx5-na", attributeId: "attr-real-riders" },
  { carId: "car-mazda-mx5-na", attributeId: "attr-premium" },
  { carId: "car-mazda-mx5-na", attributeId: "attr-conv" },

  { carId: "car-nissan-fairlady-z", attributeId: "attr-real-riders" },
  { carId: "car-nissan-fairlady-z", attributeId: "attr-premium" },

  { carId: "car-bmw-e30-m3", attributeId: "attr-real-riders" },
  { carId: "car-bmw-e30-m3", attributeId: "attr-premium" },

  { carId: "car-porsche-911-rs", attributeId: "attr-real-riders" },
  { carId: "car-porsche-911-rs", attributeId: "attr-premium" },
  { carId: "car-porsche-911-rs", attributeId: "attr-treasure-hunt" },

  { carId: "car-ford-mustang-mach-e", attributeId: "attr-real-riders" },
  { carId: "car-ford-mustang-mach-e", attributeId: "attr-premium" },

  // Fast Wedge — Tem a si mesmos como atributo de série (Fast Wedge).
  { carId: "car-lancia-stratos", attributeId: "attr-fast-wedge" },
  { carId: "car-lancia-stratos", attributeId: "attr-real-riders" },

  { carId: "car-ferri-512-bb", attributeId: "attr-fast-wedge" },

  { carId: "car-de-tomaso-pantera", attributeId: "attr-fast-wedge" },

  // Matchbox Collectors — Zamac + tampas removíveis.
  { carId: "car-rangie-classic", attributeId: "attr-zamac" },
  { carId: "car-jeep-wrangler", attributeId: "attr-zamac" },
  { carId: "car-land-rover-defender", attributeId: "attr-zamac" },

  // RLC Exclusive.
  { carId: "car-mustang-boss-302", attributeId: "attr-rlc-exclusive" },
  { carId: "car-mustang-boss-302", attributeId: "attr-real-riders" },

  { carId: "car-datsun-240z-rlc", attributeId: "attr-rlc-exclusive" },
  { carId: "car-datsun-240z-rlc", attributeId: "attr-real-riders" },

  // Tomica Premium — Zamac.
  { carId: "car-tomica-lambo-countach", attributeId: "attr-zamac" },
  { carId: "car-tomica-tesla-model-3", attributeId: "attr-zamac" },

  // Mini GT — alguns com Chase e Real Riders.
  { carId: "car-minigt-rwb-porsche", attributeId: "attr-real-riders" },
  { carId: "car-minigt-rwb-porsche", attributeId: "attr-chase" },

  { carId: "car-minigt-typer-r34", attributeId: "attr-real-riders" },
  { carId: "car-minigt-typer-r34", attributeId: "attr-super-treasure-hunt" },

  { carId: "car-minigt-corvette-c8", attributeId: "attr-real-riders" },
];
