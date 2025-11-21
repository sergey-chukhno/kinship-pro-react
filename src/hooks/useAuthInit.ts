import { use, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { getCurrentUser, refreshToken } from "../api/Authentication"; // adapte le chemin selon ton projet
import { PageType } from "../types";
import { useLocation, useNavigate } from "react-router-dom";

export const useAuthInit = () => {
  const { state , setCurrentPage, setShowingPageType } = useAppContext();
  localStorage.setItem("current_page", state.currentPage as PageType);
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const refreshPage = async () => {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        navigate("/register")
        return;
      }

      try {
        // Tente de refresh le token si nécessaire
        const refreshed = await refreshToken();
        if (refreshed?.data?.token) {
          localStorage.setItem("jwt_token", refreshed.data.token);
        }

        if (location.pathname === "/register" || location.pathname === "/login" ){
          const userResponse = await getCurrentUser();
          const user = userResponse.data;
          console.log("UserData : " , user)
          if (user) {
            // Exemple de logique selon ton système de rôle
            if (user.available_contexts?.companies?.length > 0) {
              setShowingPageType("pro");
              setCurrentPage("dashboard")
              navigate("/dashboard")
            } else if (user.available_contexts?.schools?.length > 0) {
              setShowingPageType("edu");
              setCurrentPage("dashboard")
              navigate("/dashboard")
            } else if (user.available_contexts?.teacher_dashboard) {
              setShowingPageType("teacher");
              setCurrentPage("dashboard")
              navigate("/dashboard")
            } else if (user.available_contexts?.user_dashboard) {
              setShowingPageType("user");
              setCurrentPage("projects")
              navigate("/projects")
            }
          }
        }
      } catch (err) {
        console.error("Erreur de reconnexion automatique :", err);
        localStorage.removeItem("jwt_token");
        setCurrentPage("Auth");
      }
    };

    refreshPage();
  }, [state.currentPage, state.showingPageType]);
};
