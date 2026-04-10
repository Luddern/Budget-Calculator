import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/services/api";

export const useReportStore = defineStore("report", () => {
  const monthly = ref(null);
  const yearly = ref([]);
  const loading = ref(false);

  async function fetchMonthly(month) {
    loading.value = true;
    try {
      const { data } = await api.get("/reports/monthly", { params: { month } });
      monthly.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchYearly(year) {
    const { data } = await api.get("/reports/yearly", { params: { year } });
    yearly.value = data.monthly;
  }

  return { monthly, yearly, loading, fetchMonthly, fetchYearly };
});
