<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-xl font-bold text-gray-800">報表分析</h2>
      <div class="flex items-center gap-2">
        <input type="month" v-model="currentMonth" class="input w-auto" />
      </div>
    </div>

    <div
      v-if="reportStore.loading"
      class="py-12 text-center text-sm text-gray-400"
    >
      載入中...
    </div>

    <template v-else-if="report">
      <!-- Summary -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="card text-center">
          <p class="text-xs text-gray-500">總支出</p>
          <p class="mt-1 text-lg font-bold text-red-600">
            ${{ formatNum(report.totalSpent) }}
          </p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500">筆數</p>
          <p class="mt-1 text-lg font-bold text-gray-800">
            {{ report.transactionCount }}
          </p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500">日均</p>
          <p class="mt-1 text-lg font-bold text-primary-600">
            ${{ formatNum(dailyAvg) }}
          </p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500">分類數</p>
          <p class="mt-1 text-lg font-bold text-gray-800">
            {{ report.byCategory?.length || 0 }}
          </p>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="card">
          <h3 class="mb-4 text-sm font-semibold text-gray-700">分類佔比</h3>
          <div class="mx-auto max-w-xs">
            <PieChart v-if="pieData" :data="pieData" />
            <p v-else class="py-8 text-center text-sm text-gray-400">無資料</p>
          </div>
        </div>
        <div class="card">
          <h3 class="mb-4 text-sm font-semibold text-gray-700">每日趨勢</h3>
          <LineChart v-if="lineData" :data="lineData" />
          <p v-else class="py-8 text-center text-sm text-gray-400">無資料</p>
        </div>
      </div>

      <!-- Yearly Trend -->
      <div class="card">
        <h3 class="mb-4 text-sm font-semibold text-gray-700">
          {{ currentYear }} 年月度趨勢
        </h3>
        <BarChart v-if="yearlyData" :data="yearlyData" />
        <p v-else class="py-8 text-center text-sm text-gray-400">無資料</p>
      </div>

      <!-- Category Breakdown -->
      <div class="card">
        <h3 class="mb-4 text-sm font-semibold text-gray-700">分類明細</h3>
        <div v-if="report.byCategory?.length" class="space-y-3">
          <div
            v-for="cat in report.byCategory"
            :key="cat.id"
            class="flex items-center gap-3"
          >
            <span class="text-xl">{{ cat.icon }}</span>
            <div class="flex-1">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700">{{ cat.name }}</span>
                <span class="text-gray-500"
                  >${{ formatNum(cat.total) }} ({{ cat.count }}筆)</span
                >
              </div>
              <div
                class="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100"
              >
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width:
                      (report.totalSpent
                        ? (cat.total / report.totalSpent) * 100
                        : 0) + '%',
                    backgroundColor: cat.color,
                  }"
                />
              </div>
            </div>
          </div>
        </div>
        <p v-else class="py-4 text-center text-sm text-gray-400">無資料</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useReportStore } from "@/stores/report";
import PieChart from "@/components/ChartPie.vue";
import LineChart from "@/components/ChartLine.vue";
import BarChart from "@/components/ChartBar.vue";

const reportStore = useReportStore();
const now = new Date();
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
);
const currentYear = computed(() => currentMonth.value.split("-")[0]);

const report = computed(() => reportStore.monthly);

const dailyAvg = computed(() => {
  if (!report.value?.totalSpent) return 0;
  const daysInMonth = new Date(
    +currentMonth.value.split("-")[0],
    +currentMonth.value.split("-")[1],
    0,
  ).getDate();
  const today = new Date();
  const isCurrentMonth =
    currentMonth.value ===
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const days = isCurrentMonth ? today.getDate() : daysInMonth;
  return report.value.totalSpent / days;
});

const pieData = computed(() => {
  if (!report.value?.byCategory?.length) return null;
  return {
    labels: report.value.byCategory.map((c) => `${c.icon} ${c.name}`),
    datasets: [
      {
        data: report.value.byCategory.map((c) => c.total),
        backgroundColor: report.value.byCategory.map((c) => c.color),
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
});

const lineData = computed(() => {
  if (!report.value?.daily?.length) return null;
  return {
    labels: report.value.daily.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: "支出",
        data: report.value.daily.map((d) => d.total),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };
});

const yearlyData = computed(() => {
  if (!reportStore.yearly?.length) return null;
  const months = Array.from(
    { length: 12 },
    (_, i) => `${currentYear.value}-${String(i + 1).padStart(2, "0")}`,
  );
  const dataMap = Object.fromEntries(
    reportStore.yearly.map((m) => [m.month, m.total]),
  );
  return {
    labels: months.map((m) => m.slice(5) + "月"),
    datasets: [
      {
        label: "月支出",
        data: months.map((m) => dataMap[m] || 0),
        backgroundColor: "#10b981",
        borderRadius: 6,
      },
    ],
  };
});

function formatNum(n) {
  return Number(n).toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function loadData() {
  await Promise.all([
    reportStore.fetchMonthly(currentMonth.value),
    reportStore.fetchYearly(currentYear.value),
  ]);
}

watch(currentMonth, loadData);
onMounted(loadData);
</script>
