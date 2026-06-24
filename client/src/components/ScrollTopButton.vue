<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const visible = ref(false);

function onScroll() {
  visible.value = window.scrollY > 300;
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <button
    type="button"
    class="scroll-top"
    :class="{ 'is-visible': visible }"
    aria-label="Наверх"
    @click="scrollTop"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </button>
</template>
