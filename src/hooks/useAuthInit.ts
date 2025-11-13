import { use, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { getCurrentUser, refreshToken } from "../api/Authentication"; // adapte le chemin selon ton projet
import { PageType } from "../types";

export const useAuthInit = () => {
  const { state , setCurrentPage, setShowingPageType } = useAppContext();
  localStorage.setItem("current_page", state.currentPage as PageType);

  useEffect(() => {
    const refreshPage = async () => {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        setCurrentPage("Auth");
        return;
      }

      try {
        // Tente de refresh le token si nécessaire
        const refreshed = await refreshToken();
        if (refreshed?.data?.token) {
          localStorage.setItem("jwt_token", refreshed.data.token);
        }

        // Récupère les infos utilisateur
        const userResponse = await getCurrentUser();
        const user = userResponse.data;

        // const page = localStorage.getItem("current_page") as PageType;
        // setCurrentPage(page);

        // Si on a un user valide, on affiche la bonne interface
        /*
        if (user) {
          // Exemple de logique selon ton système de rôle
          if (user.available_contexts?.companies?.length > 0) {
            setShowingPageType("pro");
          } else if (user.available_contexts?.schools?.length > 0) {
            setShowingPageType("edu");
          } else if (user.available_contexts?.teacher_dashboard) {
            setShowingPageType("teacher");
          } else if (user.available_contexts?.user_dashboard) {
            setShowingPageType("user");
          }
        } else {
          throw new Error("Aucun utilisateur trouvé");
        }
          */
      } catch (err) {
        console.error("Erreur de reconnexion automatique :", err);
        localStorage.removeItem("jwt_token");
        setCurrentPage("Auth");
      }
    };

    refreshPage();
  }, [state.currentPage, state.showingPageType]);
};
