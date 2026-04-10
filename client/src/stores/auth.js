import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/services/api";

export const useAuthStore = defineStore(
  "auth",
  () => {
    const token = ref("");
    const user = ref(null);

    const isLoggedIn = computed(() => !!token.value);

    async function login(email, password) {
      const { data } = await api.post("/auth/login", { email, password });
      token.value = data.token;
      user.value = data.user;
    }

    async function register(username, email, password) {
      const { data } = await api.post("/auth/register", {
        username,
        email,
        password,
      });
      token.value = data.token;
      user.value = data.user;
    }

    async function fetchUser() {
      const { data } = await api.get("/auth/me");
      user.value = data.user;
    }

    function logout() {
      token.value = "";
      user.value = null;
    }

    return { token, user, isLoggedIn, login, register, fetchUser, logout };
  },
  { persist: { pick: ["token"] } },
);
