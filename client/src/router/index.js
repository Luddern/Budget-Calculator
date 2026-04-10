import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/LoginView.vue"),
    meta: { guest: true },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/views/RegisterView.vue"),
    meta: { guest: true },
  },
  {
    path: "/",
    component: () => import("@/components/AppLayout.vue"),
    meta: { auth: true },
    children: [
      {
        path: "",
        name: "Dashboard",
        component: () => import("@/views/DashboardView.vue"),
      },
      {
        path: "expenses",
        name: "Expenses",
        component: () => import("@/views/ExpensesView.vue"),
      },
      {
        path: "reports",
        name: "Reports",
        component: () => import("@/views/ReportsView.vue"),
      },
      {
        path: "budgets",
        name: "Budgets",
        component: () => import("@/views/BudgetView.vue"),
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.auth && !auth.token) return "/login";
  if (to.meta.guest && auth.token) return "/";
});

export default router;
