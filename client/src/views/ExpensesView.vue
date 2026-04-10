<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-xl font-bold text-gray-800">記帳</h2>
      <div class="flex flex-wrap items-center gap-2">
        <input type="month" v-model="filterMonth" class="input w-auto" />
        <select v-model="filterCategory" class="input w-auto">
          <option value="">全部分類</option>
          <option
            v-for="cat in categoryStore.categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.icon }} {{ cat.name }}
          </option>
        </select>
        <button
          @click="expenseStore.exportCSV(filterMonth)"
          class="btn-secondary text-xs"
        >
          📥 匯出 CSV
        </button>
        <button @click="openForm()" class="btn-primary text-xs">＋ 新增</button>
      </div>
    </div>

    <!-- Expense Form Modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      @click.self="showForm = false"
    >
      <div class="card w-full max-w-md">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">
          {{ editingId ? "編輯" : "新增" }}記錄
        </h3>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >金額</label
            >
            <input
              v-model.number="form.amount"
              type="number"
              step="1"
              min="1"
              class="input"
              placeholder="0"
              required
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >分類</label
            >
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="cat in categoryStore.categories"
                :key="cat.id"
                type="button"
                @click="form.category_id = cat.id"
                :class="[
                  'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors',
                  form.category_id === cat.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:bg-gray-50',
                ]"
              >
                <span class="text-lg">{{ cat.icon }}</span>
                {{ cat.name }}
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >日期</label
            >
            <input v-model="form.date" type="date" class="input" required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >備註</label
            >
            <input
              v-model="form.note"
              type="text"
              class="input"
              placeholder="選填"
              maxlength="200"
            />
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              @click="showForm = false"
              class="btn-secondary flex-1"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="btn-primary flex-1"
            >
              {{ submitting ? "儲存中..." : "儲存" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Expense List -->
    <div
      v-if="expenseStore.loading"
      class="py-12 text-center text-sm text-gray-400"
    >
      載入中...
    </div>
    <div v-else-if="expenseStore.expenses.length" class="space-y-2">
      <div
        v-for="exp in expenseStore.expenses"
        :key="exp.id"
        class="card flex items-center justify-between !p-3 sm:!p-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
            :style="{ backgroundColor: exp.category_color + '20' }"
          >
            {{ exp.category_icon }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700">
              {{ exp.category_name }}
            </p>
            <p class="text-xs text-gray-400">
              {{ exp.date }}{{ exp.note ? " · " + exp.note : "" }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-red-600"
            >-${{ Number(exp.amount).toLocaleString() }}</span
          >
          <div class="flex gap-1">
            <button
              @click="openForm(exp)"
              class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600"
              title="編輯"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="handleDelete(exp.id)"
              class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="刪除"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="py-12 text-center text-sm text-gray-400">
      本月尚無記錄，按右上角「＋ 新增」來記一筆吧
    </p>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from "vue";
import { useExpenseStore } from "@/stores/expense";
import { useCategoryStore } from "@/stores/category";

const expenseStore = useExpenseStore();
const categoryStore = useCategoryStore();

const now = new Date();
const filterMonth = ref(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
);
const filterCategory = ref("");
const showForm = ref(false);
const editingId = ref(null);
const submitting = ref(false);

const form = reactive({
  amount: "",
  category_id: null,
  date: new Date().toISOString().slice(0, 10),
  note: "",
});

function openForm(expense) {
  if (expense) {
    editingId.value = expense.id;
    form.amount = expense.amount;
    form.category_id = expense.category_id;
    form.date = expense.date;
    form.note = expense.note || "";
  } else {
    editingId.value = null;
    form.amount = "";
    form.category_id = categoryStore.categories[0]?.id || null;
    form.date = new Date().toISOString().slice(0, 10);
    form.note = "";
  }
  showForm.value = true;
}

async function handleSubmit() {
  if (!form.amount || !form.category_id) return;
  submitting.value = true;
  try {
    if (editingId.value) {
      await expenseStore.updateExpense(editingId.value, { ...form });
    } else {
      await expenseStore.createExpense({ ...form });
    }
    showForm.value = false;
  } catch (e) {
    alert(e.response?.data?.message || "操作失敗，請稍後再試");
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(id) {
  if (!confirm("確定要刪除這筆記錄嗎？")) return;
  try {
    await expenseStore.deleteExpense(id);
  } catch (e) {
    alert(e.response?.data?.message || "刪除失敗，請稍後再試");
  }
}

function loadExpenses() {
  expenseStore.fetchExpenses({
    month: filterMonth.value,
    category_id: filterCategory.value || undefined,
  });
}

watch([filterMonth, filterCategory], loadExpenses);
onMounted(loadExpenses);
</script>
