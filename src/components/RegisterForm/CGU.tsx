const CGU : React.FC = () => {

return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-pretty text-lg text-slate-600">
            Site Kinshipedu.fr
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Dernière mise à jour : 27 octobre 2023
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">
            En introduction des CGU
          </h2>
          <ul className="space-y-3 text-slate-700">
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Vous vous engagez à utiliser le site dans le cadre des lois en vigueur.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Nous nous conformons au RGPD et respectons vos données personnelles.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Nous vous garantissons la possibilité d&apos;exercer tous vos droits relatifs aux données personnelles.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Vous êtes responsable de tout ce que vous postez sur le site et en conservez la propriété intellectuelle.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Vous vous engagez à publier uniquement du contenu dont vous détenez les droits.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Le contenu proposé par les utilisateurs n&apos;est pas modéré a priori et nous ne sommes pas responsables des éventuels contenus incorrects ou inappropriés mis en ligne par des utilisateurs.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Tout contenu ou élément graphique qui n&apos;a pas été proposé par un utilisateur nous appartient ou nous en avons les droits d&apos;usage et vous vous engagez à en respecter la propriété intellectuelle.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Nous mettons tout en œuvre pour garantir la sécurité et la disponibilité du site mais ne sommes tenus qu&apos;à une obligation de moyens.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-blue-600">•</span>
              <span>Nous ne sommes pas responsables des problèmes de navigation si votre matériel, logiciel ou réseau n&apos;est pas adapté.</span>
            </li>
          </ul>
        </div>

        {/* Legal Information Card */}
        <div className="mb-10 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-8 shadow-sm">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">
            Informations sur la société
          </h2>
          <div className="space-y-4 text-slate-700">
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
              <span className="text-sm font-medium text-slate-500">Raison sociale</span>
              <span className="font-medium">KINSHIP SAS</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
              <span className="text-sm font-medium text-slate-500">Capital social</span>
              <span>20.000 EUR</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
              <span className="text-sm font-medium text-slate-500">RCS</span>
              <span>MARSEILLE 920 958 479 000 16</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
              <span className="text-sm font-medium text-slate-500">Siège social</span>
              <span>35 C Boulevard Augustin Cieussa, 13007 MARSEILLE</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
              <span className="text-sm font-medium text-slate-500">Directeur de publication</span>
              <span>Monsieur François DUPONT, Président</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
              <span className="text-sm font-medium text-slate-500">Hébergement</span>
              <span>CLEVER CLOUD SAS - 3 rue de l&apos;Allier - 44000 NANTES</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Contact</span>
              <a 
                href="mailto:support@kinshipedu.fr" 
                className="font-medium text-blue-700 transition-colors hover:text-blue-900"
              >
                support@kinshipedu.fr
              </a>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Préambule */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Préambule
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                La société Kinship exploite une plateforme internet accessible à l&apos;adresse kinshipedu.fr et tous ses sous-domaines, au moyen des technologies disponibles et notamment, d&apos;un ordinateur ou d&apos;un terminal mobile, à destination des enseignants et de la communauté éducative du premier et second degré, des parents d&apos;élèves et de la communauté locale (familles, associations et professionnels) des établissements des dits enseignants, permettant aux premiers de rédiger et partager des fiches projets et de ressources, de rechercher, sélectionner et envoyer des liens d&apos;invitations à participer à un projet en fonction de la disponibilité, des compétences personnelles des seconds via la plateforme Kinship Édu : le réseau de confiance des partenaires et des parents, au service de la réussite du parcours scolaire et professionnel de leurs enfants.
              </p>
              <p>
                Ladite plateforme offre à leurs utilisateurs, un certain nombre de fonctionnalités, appelées Services, à titre gratuit, ne pouvant être dispensées qu&apos;après création d&apos;un compte personnel à titre gracieux.
              </p>
              <p>
                Toute utilisation des plateformes de la société KINSHIP, emporte acceptation des présentes conditions générales d&apos;utilisation sans aucune réserve, lesquelles sont téléchargeables sous format non modifiable.
              </p>
            </div>
          </section>

          {/* Article 1 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 1 - Informations légales
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Le site internet kinshipedu.fr est édité par la société KINSHIP, société par actions simplifiées au capital de 20.000 EUR, immatriculée au Registre du Commerce et des Sociétés de MARSEILLE sous le numéro 920 958 479 000 16 dont le siège social est 35 C Boulevard Augustin Cieussa 13007 MARSEILLE prise en la personne de ses représentants légaux domiciliés en leur qualité audit siège.
              </p>
              <p>
                Le directeur de la publication est Monsieur François DUPONT, Président de la SAS KINSHIP, lequel peut être joint au siège social de la société 35 C Boulevard Augustin Cieussa 13007 MARSEILLE, ainsi que par courriel à l&apos;adresse suivante : <a href="mailto:support@kinshipedu.fr" className="font-medium text-blue-700 transition-colors hover:text-blue-900">support@kinshipedu.fr</a>.
              </p>
              <p>
                Le site internet kinshipedu.fr est la propriété exclusive de la SAS KINSHIP.
              </p>
              <p>
                Le site internet kinshipedu.fr est hébergé par la société CLEVER CLOUD 3 rue de l&apos;allier - 44000 NANTES.
              </p>
              <p>
                La sauvegarde des données créées par les utilisateurs de la plateforme Kinship Édu est assurée par la société KINSHIP sur des serveurs fournis par la société CLEVER CLOUD ci-dessus désignée.
              </p>
            </div>
          </section>

          {/* Article 2 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 2 - Définitions
            </h2>
            <div className="space-y-5 text-slate-700 leading-relaxed">
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Le(s) Site(s) :</h3>
                <p>Ensemble des pages, base de données et ressources (images, sons, documents etc…) accessibles sur le nom de domaine kinshipedu.fr ainsi que tous ses sous-domaines. Par extension, l&apos;expression le Site désigne également le représentant légal du site.</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Le(s) Service(s) :</h3>
                <p>Sans mention particulière, définit l&apos;ensemble des services, fonctionnalités et outils proposés sur la plateforme Kinship Édu.</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">L&apos;Administrateur :</h3>
                <p>L&apos;administrateur du Site Kinship Édu est Monsieur François DUPONT, Président de la SAS KINSHIP, propriétaire de la plateforme. Il est le représentant légal du site au regard de la CNIL et de la Loi française, propriétaire du nom de domaine kinshipedu.fr. L&apos;Administrateur est joignable via le mail suivant : <a href="mailto:contact@kinshipedu.fr" className="font-medium text-blue-700 transition-colors hover:text-blue-900">contact@kinshipedu.fr</a></p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Les Utilisateurs :</h3>
                <p>Toute personne qui visite une ou plusieurs pages des sites. Les utilisateurs parents et autres partenaires enregistrés sont désignés les Utilisateurs PARENTS possédant un compte personnel. Les utilisateurs professeurs et autres membres de la communauté éducative enregistrés sont désignés les Utilisateurs ENSEIGNANTS possédant un compte personnel.</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Les Auteurs :</h3>
                <p>Tous Utilisateurs proposant des documents à la publication. Cette qualité ne leur est reconnue qu&apos;au regard des documents qu&apos;ils ont eux-mêmes rédigés dans les conditions visées aux présentes conditions générales d&apos;utilisation relatives à la propriété intellectuelle.</p>
              </div>
            </div>
          </section>

          {/* Article 3 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 3 - Accès aux services
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                L&apos;accès aux sites emporte connaissance et acceptation des présentes conditions générales d&apos;utilisation accessibles de toutes les pages des sites visités et téléchargeables sous fichier non modifiable.
              </p>
              <p>
                Tout Utilisateur peut en outre, solliciter auprès de l&apos;Administrateur du site visité aux adresses suivantes : <a href="mailto:support@kinshipedu.fr" className="font-medium text-blue-700 transition-colors hover:text-blue-900">support@kinshipedu.fr</a> que lui soit adressé dans un format pérenne les présentes conditions générales d&apos;utilisation à jour.
              </p>
              <p>
                L&apos;accès à certains services des Sites commande la création d&apos;un compte personnel par l&apos;Utilisateur désigné alors, Utilisateur enregistré comprenant les Utilisateurs PARENTS et les Utilisateurs ENSEIGNANTS enregistrés.
              </p>
              <p>
                Afin de bénéficier des dits services, l&apos;Utilisateur devra s&apos;inscrire en remplissant le formulaire d&apos;inscription accessible en ligne sur le Site visité.
              </p>
              <p>
                En remplissant le formulaire d&apos;inscription, l&apos;Utilisateur enregistré confirme avoir pris connaissance des présentes conditions générales d&apos;utilisation et accepte de s&apos;y soumettre sans réserve.
              </p>
              <p>
                L&apos;Utilisateur enregistré, s&apos;engage à informer KINSHIP immédiatement de toute utilisation non autorisée de son compte et de toute atteinte à la confidentialité et à la sécurité de ses moyens d&apos;identification en adressant un courriel à l&apos;adresse suivante : <a href="mailto:support@kinshipedu.fr" className="font-medium text-blue-700 transition-colors hover:text-blue-900">support@kinshipedu.fr</a>
              </p>
              <p>
                L&apos;Administrateur se réserve le droit de désactiver le compte d&apos;un Utilisateur enregistré à l&apos;issue d&apos;une période d&apos;inactivité totale de son compte égale ou supérieure à UNE (1) année calendaire.
              </p>
              <p>
                Chaque Utilisateur enregistré peut supprimer son compte sans préavis ainsi que toutes les données qui y sont associées dans les conditions prévues à l&apos;article 6 des présentes conditions générales d&apos;utilisation.
              </p>
            </div>
          </section>

          {/* Article 4 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 4 - Traitement et confidentialité des données à caractère personnel
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Les données à caractère personnel des Utilisateurs, sont stockées par KINSHIP en vue de leur traitement dans le cadre de l&apos;utilisation du Service, ledit traitement se faisant en conformité avec la législation française et européenne sur le traitement des données à caractère personnel, sous le contrôle de la CNIL.
              </p>
              <p>
                Conformément au Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 et à l&apos;article 32 de la Loi n°78-17 relative à l&apos;informatique, aux fichiers et aux libertés du 6 janvier 1978, modifié, la société KINSHIP agissant soit en tant que responsable de traitement soit en tant que sous-traitant, informe l&apos;Utilisateur qu&apos;il met en œuvre un traitement de données à caractère personnel le concernant.
              </p>
              <p>
                L&apos;Utilisateur dispose d&apos;un droit d&apos;accès, d&apos;interrogation, de modification, de rectification et de suppression des données à caractère personnel le concernant.
              </p>
              <p>
                L&apos;Utilisateur dispose également d&apos;un droit d&apos;opposition au traitement de ses données à caractère personnel, pour des motifs légitimes, ainsi qu&apos;un droit d&apos;opposition à ce que ses données soient utilisées à des fins de prospection commerciale.
              </p>
              <p>
                Pour exercer ses droits, l&apos;utilisateur doit adresser un courrier à la société KINSHIP, 35 C Boulevard Augustin Cieussa 13007 MARSEILLE ou un courrier électronique à l&apos;adresse <a href="mailto:support@kinshipedu.fr" className="font-medium text-blue-700 transition-colors hover:text-blue-900">support@kinshipedu.fr</a>
              </p>
              <p>
                Les données de l&apos;utilisateur concernant les établissements scolaires enregistrés seront supprimés chaque année au 31 Août afin de permettre aux utilisateurs de mettre à jour les nouvelles informations concernant les établissements de leurs enfants.
              </p>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
                <h4 className="mb-3 font-semibold text-slate-900">Sous-traitants autorisés :</h4>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Hébergement serveurs :</strong> CLEVER CLOUD SAS - 3 rue Allier - 44000 NANTES</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Maintenance :</strong> Société DRAKKAR - 52 avenue des impressionnistes - 44200 NANTES</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Article 5 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 5 - Propriété intellectuelle
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                La société KINSHIP est propriétaire des Sites, tant dans ses composants techniques que graphiques textuels ou autres, sous la seule réserve des contenus fournis par les Utilisateurs eux-mêmes.
              </p>
              <p>
                La société KINSHIP est donc seule titulaire de l&apos;ensemble des droits de propriété intellectuelle afférents aux Services, aux Sites, à leurs contenus ainsi qu&apos;aux logiciels et bases de données assurant leur fonctionnement.
              </p>
              <p>
                Toute représentation totale ou partielle des Sites ou de l&apos;un des éléments qui les composent sans l&apos;autorisation expresse de la société KINSHIP, est interdite et constituerait une contrefaçon sanctionnée par les articles L335-2 et suivants du Code de la Propriété Intellectuelle.
              </p>
              <p>
                Les Utilisateurs peuvent déposer du contenu sur les sites KINSHIP et s&apos;engage à le mettre à disposition des autres utilisateurs.
              </p>
              <p>
                Les Auteurs s&apos;engagent à ne proposer sur les sites que des contenus dont ils détiennent les droits.
              </p>
              <p>
                En outre, l&apos;Auteur publiant du contenu sur les Sites doit respecter les lois sur le droit d&apos;auteur et respecter les règles de la propriété intellectuelle. Dans le cas où des ressources externes peuvent être citées ou insérées dans la publication, l&apos;utilisateur doit se conformer à la licence d&apos;origine de la ressource, en citant notamment ses sources et leur auteur.
              </p>
              <p>
                Les Auteurs restent seuls responsables du contenu qu&apos;ils proposent.
              </p>
            </div>
          </section>

          {/* Article 6 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 6 - Durée et résiliation
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Le contrat est conclu pour une durée indéterminée à compter de l&apos;acceptation par l&apos;Utilisateur des présentes conditions générales d&apos;utilisation, laquelle acceptation résulte pour les Utilisateurs de la simple consultation du Site.
              </p>
              <p>
                De plein droit, KINSHIP pourra suspendre immédiatement l&apos;accès aux Sites et aux Services, en cas de non-respect des présentes conditions générales d&apos;utilisation par l&apos;Utilisateur.
              </p>
              <p>
                L&apos;Utilisateur enregistré peut se désinscrire à tout moment du Site, en y suivant la procédure prévue à cet effet et décrite ci-dessous : Sur le profil utilisateur, cliquer sur « Suppression du compte » et répondre « Oui » à la question. Un mail est envoyé à la boite mail de contact renseignée par l&apos;Utilisateur contenant un lien de confirmation de suppression du compte. Le compte est supprimé une fois la confirmation effectuée via ce lien.
              </p>
              <p>
                Dans les 48 heures (quarante-huit heures) suivant cette désinscription, toutes les données concernant l&apos;utilisateur ne seront plus accessibles via le Site et l&apos;Utilisateur n&apos;aura plus accès aux sites et/ou aux services. KINSHIP peut conserver les données supprimées de l&apos;Utilisateur pendant un an à compter de leur suppression. Sur demande expresse de l&apos;Utilisateur, ces données peuvent être définitivement supprimées sous 14 jours ouvrés (quatorze jours ouvrés).
              </p>
            </div>
          </section>

          {/* Article 7 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 7 - Responsabilités
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Tous matériels et logiciels nécessaires à l&apos;accès aux Sites, et à l&apos;utilisation des Services, restent exclusivement à la charge de l&apos;Utilisateur. Il lui appartient de prendre toutes mesures appropriées de façon à protéger ses propres données, système d&apos;informations et/ou logiciels de la contamination par d&apos;éventuels virus.
              </p>
              <p>
                L&apos;usage des informations, messages ou données de toute nature, disponibles par l&apos;intermédiaire des Services de KINSHIP, relève de la seule responsabilité de l&apos;Utilisateur et les décisions ou actions que celui-ci serait amené à prendre ou à mener, en considération de ces informations, ne sauraient engager d&apos;autres responsabilités que celles de l&apos;Utilisateur.
              </p>
              <p>
                L&apos;Utilisateur reconnaît que la société KINSHIP n&apos;exerce pas de contrôles à priori sur les dits contenus et données et qu&apos;elle n&apos;a pas l&apos;obligation générale de surveillance des données et contenus des Utilisateurs stockés et diffusés via les Sites.
              </p>
              <p>
                L&apos;Utilisateur Auteur, reconnaît que KINSHIP ne vérifie pas à priori la conformité des contenus pédagogiques au programme de l&apos;Education nationale.
              </p>
              <p>
                KINSHIP s&apos;engage à fournir les Services conformément aux conditions générales d&apos;utilisation.
              </p>
              <p>
                Du fait de la nature particulière du réseau internet, l&apos;accès au site peut être interrompu ou restreint pour une cause étrangère à KINSHIP. Dans cette occurrence, la responsabilité de KINSHIP ne pourra être recherchée.
              </p>
              <p>
                KINSHIP n&apos;est pas responsable du contenu des sites internet tiers, via lesquels renvoient des liens hypertextes présents sur le Site.
              </p>
            </div>
          </section>

          {/* Article 8 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 8 - Configuration technique minimale requise
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <h3 className="font-semibold text-slate-900">Sécurité :</h3>
              <p>
                L&apos;Utilisateur reconnaît disposer de la compétence et des moyens nécessaires pour accéder au Site et l&apos;utiliser. Il reconnaît avoir vérifié que la configuration informatique utilisée ne contient aucun virus et qu&apos;elle est en parfait état de fonctionnement.
              </p>
              <p>
                L&apos;utilisateur doit utiliser un navigateur moderne et à jour pour naviguer sur les Sites. Pour bénéficier de toutes les fonctionnalités, le java script doit être activé dans le navigateur et les cookies doivent être autorisés (configuration par défaut).
              </p>
              <p>
                Les équipements: (ordinateurs, téléphones mobiles, logiciels, moyens de télécommunication etc...) permettant l&apos;accès aux Sites et aux Services sont à la charge exclusive de l&apos;Utilisateur de même que les frais de télécommunication induits par leur utilisation.
              </p>
              <p>
                KINSHIP met tout en œuvre pour offrir aux Utilisateurs, les informations et outils disponibles et vérifiés, mais ne saurait être tenue responsable des erreurs, d&apos;une absence de disponibilité des informations et/ou la présence de virus ou autres infections logiques sur son Site.
              </p>
            </div>
          </section>

          {/* Article 9 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 9 - Modifications des conditions d&apos;utilisation
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Les présentes conditions générales d&apos;utilisation pourront être modifiées par KINSHIP à tout moment et sans préavis.
              </p>
              <p>
                L&apos;Utilisateur est donc invité à consulter régulièrement la dernière version mise à jour disponible à tous et accessible en permanence sur toutes les pages du site en cliquant sur l&apos;onglet « conditions générales d&apos;utilisation ».
              </p>
              <p>
                Les conditions générales d&apos;utilisation modifiées rentreront en vigueur à compter de leur mise en ligne, et s&apos;appliqueront dès lors de plein droit.
              </p>
              <p className="font-semibold text-slate-900">
                La dernière version des conditions générales d&apos;utilisation valide est celle au 27 Octobre 2023
              </p>
            </div>
          </section>

          {/* Article 10 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              Article 10 - Droit applicable
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                Les présentes conditions générales d&apos;utilisation sont régies par les Lois françaises, à l&apos;exclusion de toute autre.
              </p>
              <p className="font-semibold text-slate-900">
                Dernière mise à jour le 27 Octobre 2023
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">
            Pour toute question concernant ces conditions générales d&apos;utilisation, veuillez nous contacter à{' '}
            <a 
              href="mailto:support@kinshipedu.fr" 
              className="font-medium text-blue-700 transition-colors hover:text-blue-900"
            >
              support@kinshipedu.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default CGU;