// Le logo CagnottePro (public/logo.png) est un badge complet — icône +
// nom + accroche déjà intégrés à l'image — contrairement à l'ancien
// pictogramme abstrait qui nécessitait un libellé texte à côté. Il n'y a
// donc plus de variante "avec/sans texte" : seule la taille d'affichage
// varie selon le contexte (barre latérale, en-tête mobile, écrans de
// connexion...).
export function Logo({ size = 34 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="CagnottePro" width={size} height={size} className="flex-shrink-0 rounded-full" />
  );
}
