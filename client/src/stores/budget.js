import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/services/api";

export const useBudgetStore = defineStore("budget", () => {
  const budgets = ref([]);
  const loading = ref(false);

  async function fetchBudgets(month) {
    loading.value = true;
    try {
      const { data } = await api.get("/budgets", { params: { month } });
      budgets.value = data.budgets;
    } finally {
      loading.value = false;
    }
  }

  async function setBudget(payload) {
    await api.post("/budgets", payload);
    await fetchBudgets(payload.month);
  }

  async function deleteBudget(id, month) {
    await api.delete(`/budgets/${id}`);
    await fetchBudgets(month);
  }

  return { budgets, loading, fetchBudgets, setBudget, deleteBudget };
});
