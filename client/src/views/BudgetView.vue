<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-xl font-bold text-gray-800">預算管理</h2>
      <input type="month" v-model="currentMonth" class="input w-auto" />
    </div>

    <!-- Total Budget -->
    <div class="card">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h3 class="text-sm font-semibold text-gray-700">總預算</h3>
          <p class="text-xs text-gray-400">設定本月總預算上限</p>
        </div>
        <form @submit.prevent="setTotalBudget" class="flex items-center gap-2">
          <span class="text-sm text-gray-500">$</span>
          <input
            v-model.number="totalBudgetAmount"
            type="number"
            min="0"
            step="100"
            class="input w-32"
            placeholder="0"
          />
          <button type="submit" class="btn-primary text-xs">儲存</button>
        </form>
      </div>
      <div v-if="totalBudget" class="mt-4">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500"
            >已花費 ${{ formatNum(totalBudget.spent) }} / ${{
              formatNum(totalBudget.amount)
            }}</span
          >
          <span
            :class="
              totalBudget.spent > totalBudget.amount
                ? 'text-red-600 font-bold'
                : 'text-primary-600'
            "
          >
            {{
              totalBudget.amount
                ? Math.round((totalBudget.spent / totalBudget.amount) * 100)
                : 0
            }}%
          </span>
        </div>
        <div class="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            class="h-full rounded-full transition-all"
            :class="
              totalBudget.spent > totalBudget.amount
                ? 'bg-red-500'
                : 'bg-primary-500'
            "
            :style="{
              width:
                Math.min(
                  totalBudget.amount
                    ? (totalBudget.spent / totalBudget.amount) * 100
                    : 0,
                  100,
                ) + '%',
            }"
          />
        </div>
      </div>
    </div>

    <!-- Category Budgets -->
    <div class="card">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-gray-700">分類預算</h3>
          <p class="text-xs text-gray-400">為各分類設定獨立預算</p>
        </div>
        <button @click="showAddForm = !showAddForm" class="btn-primary text-xs">
          ＋ 新增
        </button>
      </div>

      <!-- Add Form -->
      <form
        v-if="showAddForm"
        @submit.prevent="addCategoryBudget"
        class="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3"
      >
        <div>
          <label class="mb-1 block text-xs text-gray-500">分類</label>
          <select v-model.number="newBudget.category_id" class="input text-sm">
            <option
              v-for="cat in availableCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.icon }} {{ cat.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs text-gray-500">預算金額</label>
          <input
            v-model.number="newBudget.amount"
            type="number"
            min="0"
            step="100"
            class="input w-28 text-sm"
            placeholder="0"
          />
        </div>
        <button type="submit" class="btn-primary text-xs">新增</button>
      </form>

      <!-- Budget List -->
      <div v-if="categoryBudgets.length" class="space-y-4">
        <div
          v-for="b in categoryBudgets"
          :key="b.id"
          class="rounded-lg border border-gray-100 p-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ b.category_icon }}</span>
              <span class="text-sm font-medium text-gray-700">{{
                b.category_name
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500"
                >${{ formatNum(b.spent) }} / ${{ formatNum(b.amount) }}</span
              >
              <button
                @click="removeBudget(b.id)"
                class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-full rounded-full transition-all"
              :class="b.spent > b.amount ? 'bg-red-500' : 'bg-primary-500'"
              :style="{
                width:
                  Math.min(b.amount ? (b.spent / b.amount) * 100 : 0, 100) +
                  '%',
              }"
            />
          </div>
          <p v-if="b.spent > b.amount" class="mt-1 text-xs text-red-500">
            ⚠️ 超支 ${{ formatNum(b.spent - b.amount) }}
          </p>
        </div>
      </div>
      <p v-else class="py-4 text-center text-sm text-gray-400">
        尚未設定分類預算
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useBudgetStore } from "@/stores/budget";
import { useCategoryStore } from "@/stores/category";

const budgetStore = useBudgetStore();
const categoryStore = useCategoryStore();

const now = new Date();
const currentMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
);
const totalBudgetAmount = ref(0);
const showAddForm = ref(false);
const newBudget = reactive({ category_id: null, amount: 0 });

const totalBudget = computed(() =>
  budgetStore.budgets.find((b) => !b.category_id),
);
const categoryBudgets = computed(() =>
  budgetStore.budgets.filter((b) => b.category_id),
);

const availableCategories = computed(() => {
  const usedIds = new Set(categoryBudgets.value.map((b) => b.category_id));
  return categoryStore.categories.filter((c) => !usedIds.has(c.id));
});

function formatNum(n) {
  return Number(n).toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function setTotalBudget() {
  try {
    await budgetStore.setBudget({
      amount: totalBudgetAmount.value,
      month: currentMonth.value,
      category_id: null,
    });
  } catch (e) {
    alert(e.response?.data?.message || "儲存失敗，請稍後再試");
  }
}

async function addCategoryBudget() {
  if (!newBudget.category_id || !newBudget.amount) return;
  try {
    await budgetStore.setBudget({
      ...newBudget,
      month: currentMonth.value,
    });
    newBudget.amount = 0;
    showAddForm.value = false;
  } catch (e) {
    alert(e.response?.data?.message || "新增失敗，請稍後再試");
  }
}

async function removeBudget(id) {
  try {
    await budgetStore.deleteBudget(id, currentMonth.value);
  } catch (e) {
    alert(e.response?.data?.message || "刪除失敗，請稍後再試");
  }
}

async function loadData() {
  await budgetStore.fetchBudgets(currentMonth.value);
  if (totalBudget.value) totalBudgetAmount.value = totalBudget.value.amount;
  if (availableCategories.value.length)
    newBudget.category_id = availableCategories.value[0].id;
}

watch(currentMonth, loadData);
onMounted(loadData);
</script>
