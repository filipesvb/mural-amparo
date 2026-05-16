// Mesmo conjunto de caracteres da regex de menção (utils/mentions.ts):
// ASCII, 2–30, letras/números/_. Hashtags não são validadas contra nada —
// todo #tag vira link (diferente de @menção, que checa o perfil).
export const HASHTAG_REGEX = /#([A-Za-z0-9_]{2,30})/g;

// A tag é case-insensitive: #Feira e #feira são a mesma. O slug/URL e a
// comparação usam a forma minúscula.
export function canonicalTag(tag: string): string {
  return tag.toLowerCase();
}

// Padrão POSIX para o operador imatch (~*) do PostgREST: casa o #tag exato
// terminando em fim-de-palavra (\M), então #feira não pega #feirao nem
// #feira_x. A tag já é validada como [A-Za-z0-9_], sem metacaracteres.
export function hashtagMatchPattern(tag: string): string {
  return `#${canonicalTag(tag)}\\M`;
}
