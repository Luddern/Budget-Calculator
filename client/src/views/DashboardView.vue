<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-xl font-bold text-gray-800">總覽</h2>
      <input type="month" v-model="currentMonth" class="input w-auto" />
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="card">
        <p class="text-sm text-gray-500">本月支出</p>
        <p class="mt-1 text-2xl font-bold text-red-600">
          ${{ formatNum(report?.totalSpent || 0) }}
        </p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">交易筆數</p>
        <p class="mt-1 text-2xl font-bold text-gray-800">
          {{ report?.transactionCount || 0 }}
        </p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">日均花費</p>
        <p class="mt-1 text-2xl font-bold text-primary-600">
          ${{ formatNum(dailyAvg) }}
        </p>
      </div>
    </div>

    <!-- Budget Alerts -->
    <div v-if="overBudgets.length" class="space-y-2">
      <div
        v-for="b in overBudgets"
        :key="b.id"
        class="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3"
      >
        <span class="text-xl">⚠️</span>
        <p class="text-sm text-red-700">
          <strong>{{ b.category_name || "總預算" }}</strong> 已超支！預算 ${{
            formatNum(b.amount)
          }}，已花 ${{ formatNum(b.spent) }}
        </p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="card">
        <h3 class="mb-4 text-sm font-semibold text-gray-700">分類支出</h3>
        <div class="mx-auto max-w-xs">
          <PieChart v-if="report?.byCategory?.length" :data="pieData" />
          <p v-else class="py-12 text-center text-sm text-gray-400">
            本月尚無記錄
          </p>
        </div>
      </div>
      <div class="card">
        <h3 class="mb-4 text-sm font-semibold text-gray-700">每日支出</h3>
        <LineChart v-if="report?.daily?.length" :data="lineData" />
        <p v-else class="py-12 text-center text-sm text-gray-400">
          本月尚無記錄
        </p>
      </div>
    </div>

    <!-- Recent Expenses -->
    <div class="card">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700">近期消費</h3>
        <router-link
          to="/expenses"
          class="text-sm font-medium text-primary-600 hover:text-primary-700"
          >查看全部</router-link
        >
      </div>
      <div v-if="expenseStore.expenses.length" class="divide-y divide-gray-100">
        <div
          v-for="exp in expenseStore.expenses.slice(0, 5)"
          :key="exp.id"
          class="flex items-center justify-between py-3"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl" :style="{ filter: 'saturate(0.8)' }">{{
              exp.category_icon
            }}</span>
            <div>
              <p class="text-sm font-medium text-gray-700">
                {{ exp.category_name }}
              </p>
              <p class="text-xs text-gray-400">
                {{ exp.date }}{{ exp.note ? " · " + exp.note : "" }}
              </p>
            </div>
          </div>
          <span class="text-sm font-semibold text-red-600"
            >-${{ formatNum(exp.amount) }}</span
          >
        </div>
      </div>
      <p v-else class="py-6 text-center text-sm text-gray-400">
        還沒有任何紀錄，快去記一筆吧！
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useExpenseStore } from "@/stores/expense";
import { useReportStore } from "@/stores/report";
import { useBudgetStore } from "@/stores/budget";
import PieChart from "@/components/ChartPie.vue";
import LineChart from "@/components/ChartLine.vue";

const expenseStore = useExpenseStore();
const reportStore = useReportStore();
const budgetStore = useBudgetStore();

const now = new Date();
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
);

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

const overBudgets = computed(() =>
  budgetStore.budgets.filter((b) => b.spent > b.amount),
);

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
        label: "支出金額",
        data: report.value.daily.map((d) => d.total),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.3,
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
    expenseStore.fetchExpenses({ month: currentMonth.value }),
    budgetStore.fetchBudgets(currentMonth.value),
  ]);
}

watch(currentMonth, loadData);
onMounted(loadData);
</script>
