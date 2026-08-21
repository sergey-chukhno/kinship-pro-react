import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { getCurrentUser, refreshToken } from "../api/Authentication"; // adapte le chemin selon ton projet
import { applySpaceTheme } from "../utils/spaceTheme";
import { PageType } from "../types";
import { useLocation, useNavigate } from "react-router-dom";

const isPublicFollowPath = (pathname: string) => pathname.startsWith("/follow/");

export const useAuthInit = () => {
  const { setCurrentPage, setShowingPageType, setUser } = useAppContext();
  const location = useLocation()
  const navigate = useNavigate()
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Fonction pour mapper le path à currentPage
  const getPageFromPath = (pathname: string): PageType => {
    // Nettoyer le path (enlever / initial et trailing slashes)
    let path = pathname.substring(1).replace(/\/$/, '');

    // Si c'est une page d'auth
    if (pathname === "/register" || pathname === "/login" || pathname.startsWith("/register/")) {
      return "Auth";
    }

    // Mapper les routes aux pages
    const validPages: PageType[] = [
      "dashboard", "members", "events", "projects", "formations", "badges",
      "analytics", "network", "notifications", "settings",
      "personal-settings", "pik",
      "membership-requests", "partnership-requests", "funder-attachments", "project-management",
      "presence-session", "formation-detail", "formation-affiche", "preuve-formation",
      "create", "project-space", "project-affiche", "funded-projects"
    ];

    if (validPages.includes(path as PageType)) {
      return path as PageType;
    }

    // formation-detail / affiche / preuve-formation (id hors URL)
    if (path.startsWith('formation-detail')) {
      return 'formation-detail';
    }

    if (path.startsWith('formation-affiche')) {
      return 'formation-affiche';
    }

    if (path.startsWith('preuve-formation')) {
      return 'preuve-formation';
    }

    if (path.startsWith('project-space')) {
      return 'project-space';
    }

    if (path.startsWith('project-affiche')) {
      return 'project-affiche';
    }

    if (path.startsWith('funded-projects')) {
      return 'funded-projects';
    }

    if (path.startsWith('pik')) {
      return 'pik';
    }

    if (path.startsWith('follow/')) {
      return 'funder-follow';
    }

    // Par défaut, retourner dashboard
    return "dashboard";
  };

  useEffect(() => {
    const refreshPage = async () => {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        setIsAuthChecking(false);
        // Lien public follow/:token : consultable sans compte. Sinon, page d'auth.
        if (
          location.pathname !== "/register" &&
          location.pathname !== "/login" &&
          !location.pathname.startsWith("/register/") &&
          !isPublicFollowPath(location.pathname)
        ) {
          navigate("/register")
        }
        return;
      }

      try {
        // Tente de refresh le token si nécessaire
        const refreshed = await refreshToken();
        if (refreshed?.data?.token) {
          localStorage.setItem("jwt_token", refreshed.data.token);
        }

        // Récupérer l'utilisateur pour toutes les routes
        const userResponse = await getCurrentUser();
        const user = userResponse.data;

        if (user) {
          // Store user data in AppContext
          setUser({
            id: user.id.toString(),
            name: user.full_name || `${user.first_name} ${user.last_name}`,
            email: user.email,
            role: user.role,
            avatar: user.avatar_url || '/default-avatar.png',
            organization: user.available_contexts?.companies?.[0]?.name ||
              user.available_contexts?.schools?.[0]?.name || '',
            available_contexts: user.available_contexts,
            birthday: user.birthday
          });

          const isAuthPage = location.pathname === "/register" || location.pathname === "/login" || location.pathname.startsWith("/register/");

          // Vérifier s'il y a un contexte sauvegardé et valide
          const savedPageType = localStorage.getItem('selectedPageType') as "pro" | "edu" | "teacher" | "user" | "of" | null;
          const savedContextId = localStorage.getItem('selectedContextId');
          const savedContextType = localStorage.getItem('selectedContextType') as 'school' | 'company' | 'teacher' | 'user' | 'formation' | null;

          // Fonction pour vérifier si le contexte sauvegardé est toujours valide
          const isSavedContextValid = (): boolean => {
            if (!savedPageType || !savedContextType) return false;

            switch (savedContextType) {
              case 'user':
                return !!user.available_contexts?.user_dashboard;
              case 'teacher':
                return !!user.available_contexts?.teacher_dashboard;
              case 'school':
                if (!savedContextId) return false;
                return user.available_contexts?.schools?.some(
                  (s: any) => s.id.toString() === savedContextId && (s.role === 'admin' || s.role === 'superadmin')
                ) || false;
              case 'company':
                if (!savedContextId) return false;
                return user.available_contexts?.companies?.some(
                  (c: any) => c.id.toString() === savedContextId && (c.role === 'admin' || c.role === 'superadmin')
                ) || false;
              case 'formation':
                if (user.available_contexts?.formation_organizations?.length) {
                  return user.available_contexts.formation_organizations.some(
                    (o: any) => o.id.toString() === savedContextId && (o.role === 'admin' || o.role === 'superadmin')
                  );
                }
                // Demo OF space always available until API provides formation_organizations
                return savedPageType === 'of';
              default:
                return false;
            }
          };

          // Déterminer le type de page et la page de destination
          let pageType: "pro" | "edu" | "teacher" | "user" | "of" = "pro";
          let defaultPage: PageType = "dashboard";

          // Si le contexte sauvegardé est valide, l'utiliser
          if (isSavedContextValid() && savedPageType) {
            pageType = savedPageType;
            if (savedContextType === 'user') {
              defaultPage = "dashboard";
            } else {
              defaultPage = "dashboard";
            }
          } else {
            // Sinon, appliquer la logique de priorité par défaut
            // Check if user has admin access to any company
            const hasAdminCompany = user.available_contexts?.companies?.some(
              (c: any) => c.role === 'admin' || c.role === 'superadmin'
            );

            // Check if user has admin access to any school
            const hasAdminSchool = user.available_contexts?.schools?.some(
              (s: any) => s.role === 'admin' || s.role === 'superadmin'
            );

            // Priority 1: Personal dashboard
            if (user.available_contexts?.user_dashboard) {
              pageType = "user";
              defaultPage = "dashboard";
              localStorage.setItem('selectedPageType', 'user');
              localStorage.setItem('selectedContextId', 'user-dashboard');
              localStorage.setItem('selectedContextType', 'user');
            }
            // Priority 2: Teacher dashboard (vérifié avant les accès admin)
            else if (user.available_contexts?.teacher_dashboard) {
              pageType = "teacher";
              defaultPage = "dashboard";
              localStorage.setItem('selectedPageType', 'teacher');
              localStorage.setItem('selectedContextId', 'teacher-dashboard');
              localStorage.setItem('selectedContextType', 'teacher');
            }
            // Priority 3: Companies (only if admin/superadmin)
            else if (hasAdminCompany) {
              pageType = "pro";
              defaultPage = "dashboard";
              // Prendre la première entreprise où l'utilisateur est admin
              const firstAdminCompany = user.available_contexts?.companies?.find(
                (c: any) => c.role === 'admin' || c.role === 'superadmin'
              );
              localStorage.setItem('selectedPageType', 'pro');
              localStorage.setItem('selectedContextId', firstAdminCompany?.id?.toString() || '');
              localStorage.setItem('selectedContextType', 'company');
            }
            // Priority 4: Schools (only if admin/superadmin)
            else if (hasAdminSchool) {
              pageType = "edu";
              defaultPage = "dashboard";
              // Prendre la première école où l'utilisateur est admin
              const firstAdminSchool = user.available_contexts?.schools?.find(
                (s: any) => s.role === 'admin' || s.role === 'superadmin'
              );
              localStorage.setItem('selectedPageType', 'edu');
              localStorage.setItem('selectedContextId', firstAdminSchool?.id?.toString() || '');
              localStorage.setItem('selectedContextType', 'school');
            }
          }

          // Appliquer la couleur d'espace (--couleur-espace) IMMÉDIATEMENT
          applySpaceTheme(pageType);

          setShowingPageType(pageType);

          // Si on est sur une page d'auth, rediriger vers la page par défaut
          if (isAuthPage) {
            setCurrentPage(defaultPage);
            navigate(`/${defaultPage}`);
          } else {
            // Sinon, mettre à jour le currentPage en fonction de la route actuelle
            const currentPageFromPath = getPageFromPath(location.pathname);
            setCurrentPage(currentPageFromPath);
          }
        }
      } catch (err) {
        console.error("Erreur de reconnexion automatique :", err);
        localStorage.removeItem("jwt_token");
        localStorage.removeItem('selectedPageType');
        localStorage.removeItem('selectedContextId');
        localStorage.removeItem('selectedContextType');
        setCurrentPage("Auth");
        if (!isPublicFollowPath(location.pathname)) {
          navigate("/register")
        }
      } finally {
        setIsAuthChecking(false);
      }
    };

    refreshPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuter seulement au montage initial pour vérifier l'authentification

  return { isAuthChecking };
};
