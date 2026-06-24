/**
 * Há conteúdo rolável além da borda direita do container?
 * Usado para mostrar o degradê de "tem mais, role" só quando faz sentido.
 */
export function temConteudoADireita(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  margem = 4
): boolean {
  return scrollLeft + clientWidth < scrollWidth - margem;
}
