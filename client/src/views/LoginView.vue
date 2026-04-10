<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-emerald-100 px-4"
  >
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <span class="text-5xl">💰</span>
        <h1 class="mt-3 text-2xl font-bold text-gray-800">登入記帳小幫手</h1>
        <p class="mt-1 text-sm text-gray-500">管理你的每一筆花費</p>
      </div>

      <form @submit.prevent="handleLogin" class="card space-y-4">
        <div v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {{ error }}
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"
            >Email</label
          >
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700"
            >密碼</label
          >
          <input
            v-model="form.password"
            type="password"
            class="input"
            placeholder="••••••"
            required
          />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full">
          {{ loading ? "登入中..." : "登入" }}
        </button>

        <p class="text-center text-sm text-gray-500">
          還沒有帳號？
          <router-link
            to="/register"
            class="font-medium text-primary-600 hover:text-primary-700"
            >立即註冊</router-link
          >
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const loading = ref(false);
const error = ref("");
const form = reactive({ email: "", password: "" });

async function handleLogin() {
  loading.value = true;
  error.value = "";
  try {
    await auth.login(form.email, form.password);
    router.push("/");
  } catch (e) {
    error.value = e.response?.data?.message || "登入失敗";
  } finally {
    loading.value = false;
  }
}
</script>
