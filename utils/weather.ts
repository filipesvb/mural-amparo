// Previsão do tempo de Amparo-SP via Open-Meteo (API grátis, sem chave).
// Cache de 15min: 1 fetch a cada 15min independente do número de usuários
// (Open-Meteo permite 10k req/dia por IP no uso não-comercial).

const AMPARO_LAT = -22.7008;
const AMPARO_LONG = -46.7641;
const REVALIDATE_SECONDS = 900;

export interface CurrentWeather {
  temperature: number;
  description: string;
  min: number;
  max: number;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m: number;
    weather_code: number;
  };
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

// Códigos WMO → texto pt-BR. Cobrimos os relevantes pro clima subtropical
// de Amparo; categorias raras (neve, granizo) ficam pro caso de aparecer.
function describeWeatherCode(code: number): string {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Predominantemente claro";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Neblina";
  if (code >= 51 && code <= 57) return "Chuvisco";
  if (code >= 61 && code <= 67) return "Chuva";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Pancadas de chuva";
  if (code >= 85 && code <= 86) return "Pancadas de neve";
  if (code === 95) return "Trovoada";
  if (code === 96 || code === 99) return "Trovoada com granizo";
  return "Indisponível";
}

export async function getCurrentWeather(): Promise<CurrentWeather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${AMPARO_LAT}&longitude=${AMPARO_LONG}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=America/Sao_Paulo&forecast_days=1`;

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;
    if (!data.current || !data.daily?.temperature_2m_max?.[0]) return null;
    return {
      temperature: Math.round(data.current.temperature_2m),
      description: describeWeatherCode(data.current.weather_code),
      min: Math.round(data.daily.temperature_2m_min[0]),
      max: Math.round(data.daily.temperature_2m_max[0]),
    };
  } catch {
    return null;
  }
}
