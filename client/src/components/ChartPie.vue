<template>
  <Pie :data="data" :options="options" />
</template>

<script setup>
import { Pie } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

defineProps({ data: { type: Object, required: true } });

const options = {
  responsive: true,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyle: "circle",
        font: { size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` $${Number(ctx.parsed).toLocaleString()}`,
      },
    },
  },
};
</script>
