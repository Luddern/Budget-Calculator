<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile Header -->
    <header
      class="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3 shadow-sm lg:hidden"
    >
      <button
        @click="sidebarOpen = true"
        class="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
      >
        <svg
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <h1 class="text-lg font-bold text-primary-600">記帳小幫手</h1>
      <div class="w-8" />
    </header>

    <!-- Sidebar Overlay (mobile) -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex h-full flex-col">
        <!-- Logo -->
        <div class="flex items-center gap-2 px-5 py-5">
          <span class="text-2xl">💰</span>
          <h1 class="text-xl font-bold text-primary-600">記帳小幫手</h1>
        </div>

        <!-- Nav Links -->
        <nav class="flex-1 space-y-1 px-3">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
            :exact="item.exact"
            active-class="!bg-primary-50 !text-primary-700"
            @click="sidebarOpen = false"
          >
            <span class="text-lg">{{ item.icon }}</span>
            {{ item.label }}
          </router-link>
        </nav>

        <!-- User Info -->
        <div class="border-t border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700"
            >
              {{ auth.user?.username?.charAt(0)?.toUpperCase() || "?" }}
            </div>
            <div class="flex-1 truncate">
              <p class="text-sm font-medium text-gray-700 truncate">
                {{ auth.user?.username }}
              </p>
              <p class="text-xs text-gray-400 truncate">
                {{ auth.user?.email }}
              </p>
            </div>
            <button
              @click="handleLogout"
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
              title="登出"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="lg:pl-64">
      <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCategoryStore } from "@/stores/category";

const auth = useAuthStore();
const categoryStore = useCategoryStore();
const router = useRouter();
const sidebarOpen = ref(false);

const navItems = [
  { to: "/", icon: "📊", label: "總覽", exact: true },
  { to: "/expenses", icon: "📝", label: "記帳" },
  { to: "/reports", icon: "📈", label: "報表" },
  { to: "/budgets", icon: "🎯", label: "預算" },
];

onMounted(async () => {
  if (auth.token && !auth.user) {
    try {
      await auth.fetchUser();
    } catch {
      auth.logout();
      router.push("/login");
    }
  }
  categoryStore.fetchCategories();
});

function handleLogout() {
  auth.logout();
  router.push("/login");
}
</script>
