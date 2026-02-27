import React, { useState } from 'react';

const PrivacyPolicy: React.FC = () => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    // Try to close the window (works if opened by script)
    window.close();
    
    // If window didn't close (e.g., opened in new tab), show message
    setTimeout(() => {
      if (!window.closed) {
        // Window is still open, user can see the message
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="space-y-12">
          <div className="space-y-4 border-b border-border pb-8">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Mentions légales
            </h1>
            <p className="text-pretty text-lg text-muted-foreground sm:text-xl">
              Politique de confidentialité et informations légales de KinshipEdu
            </p>
          </div>

          <section className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              1. Données personnelles
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p className="text-pretty">
                Le site internet{' '}
                <span className="font-semibold text-foreground">kinshipedu.fr</span> et
                tous ses sous-domaines respectent la vie privée de leurs utilisateurs et
                se conforment aux lois en vigueur sur la protection de la vie privée et
                des libertés individuelles. Les informations personnelles des
                utilisateurs sont collectées avec leur accord et ne sont transmises à
                aucun tiers.
              </p>
              <p className="text-pretty">
                La SAS KINSHIP se conforme aux dispositions des articles 38 et suivants
                de la loi 78-17 du 6 janvier 1978 relative à l'informatique, aux
                fichiers et aux libertés ainsi qu'au Règlement Européen sur la Protection
                des Données (RGPD) entré en application au 25 mai 2018.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              2. Cookie de navigation
            </h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Le site KinshipEdu.fr ne fait pas l'objet de ce type de suivi.
            </p>
          </section>

          <section className="space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              3. Informations administratives
            </h2>

            <div className="space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm sm:p-10">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Propriétaire
                </h3>
                <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <p className="font-semibold text-foreground">
                    KINSHIP - SAS au capital de 20.000 €
                  </p>
                  <p>RCS MARSEILLE 920 958 479 000 16</p>
                  <p>Siège social : 35 C boulevard Augustin Cieussa 13007 MARSEILLE</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Responsable de publication
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  François DUPONT - Gérant - 35 C boulevard Augustin Cieussa 13007
                  MARSEILLE
                </p>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Délégué à la protection des données
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <a
                    href="mailto:contact@kinshipedu.fr"
                    className="font-medium text-primary transition-colors hover:text-accent hover:underline"
                  >
                    contact@kinshipedu.fr
                  </a>
                </p>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Hébergeur du Nom de domaine
                </h3>
                <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <p className="font-semibold text-foreground">
                    OVH - SAS au capital de 10 000 000 €
                  </p>
                  <p>RCS Roubaix – Tourcoing 424 761 419 00045</p>
                  <p>Siège social : 2 rue Kellermann - 59100 Roubaix - France</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Hébergeur des données
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Clever cloud SAS - 3 rue Allier 44000 NANTES
                </p>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Développement et administration des sites
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Équipe technique KINSHIP
                </p>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-card-foreground">
                  Coordonnées de contact
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <a
                    href="mailto:contact@kinshipedu.fr"
                    className="font-medium text-primary transition-colors hover:text-accent hover:underline"
                  >
                    contact@kinshipedu.fr
                  </a>
                </p>
              </div>
            </div>
          </section>

          <footer className="border-t border-border pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </footer>

          {/* Accept button section */}
          <div className="border-t border-border pt-8 text-center">
            {!accepted ? (
              <button
                onClick={handleAccept}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-hover-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                style={{
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280';
                }}
              >
                J'accepte
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Merci. Vous pouvez fermer cet onglet.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PrivacyPolicy;