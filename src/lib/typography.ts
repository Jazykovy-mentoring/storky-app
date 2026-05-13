// Pomocné helpery pre slovenskú typografiu.
// Voláme pred zobrazením AI outputu, keby model náhodou vygeneroval em-dash
// alebo anglické úvodzovky.

export function fixTypography(input: string): string {
  return input
    .replace(/—/g, "–") // em-dash -> en-dash
    .replace(/"([^"]*)"/g, "„$1"); // straight quotes -> slovenské
}
