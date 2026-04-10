import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/services/api";

export const useCategoryStore = defineStore("category", () => {
  const categories = ref([]);

  async function fetchCategories() {
    const { data } = await api.get("/categories");
    categories.value = data.categories;
  }

  async function createCategory(payload) {
    const { data } = await api.post("/categories", payload);
    categories.value.push(data.category);
    return data.category;
  }

  async function deleteCategory(id) {
    await api.delete(`/categories/${id}`);
    categories.value = categories.value.filter((c) => c.id !== id);
  }

  return { categories, fetchCategories, createCategory, deleteCategory };
});
