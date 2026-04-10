import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/services/api";

export const useExpenseStore = defineStore("expense", () => {
  const expenses = ref([]);
  const total = ref(0);
  const loading = ref(false);

  async function fetchExpenses({ month, category_id, page = 1 } = {}) {
    loading.value = true;
    try {
      const params = { page, limit: 50 };
      if (month) params.month = month;
      if (category_id) params.category_id = category_id;
      const { data } = await api.get("/expenses", { params });
      expenses.value = data.expenses;
      total.value = data.total;
    } finally {
      loading.value = false;
    }
  }

  async function createExpense(payload) {
    const { data } = await api.post("/expenses", payload);
    expenses.value.unshift(data.expense);
    total.value++;
    return data.expense;
  }

  async function updateExpense(id, payload) {
    const { data } = await api.put(`/expenses/${id}`, payload);
    const idx = expenses.value.findIndex((e) => e.id === id);
    if (idx !== -1) expenses.value[idx] = data.expense;
    return data.expense;
  }

  async function deleteExpense(id) {
    await api.delete(`/expenses/${id}`);
    expenses.value = expenses.value.filter((e) => e.id !== id);
    total.value--;
  }

  async function exportCSV(month) {
    const params = month ? { month } : {};
    const { data } = await api.get("/expenses/export", {
      params,
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${month || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    expenses,
    total,
    loading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    exportCSV,
  };
});
