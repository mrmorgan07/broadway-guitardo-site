<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const menuOpen = ref(false);
const scrolled = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  document.body.style.overflow = menuOpen.value ? "hidden" : "";
}

function closeMenu() {
  menuOpen.value = false;
  document.body.style.overflow = "";
}

function onScroll() {
  scrolled.value = window.scrollY > 50;
}

onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));

defineProps({ brandName: { type: String, default: "Broadway Guitardo" } });
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }" id="top">
    <div class="container header-inner">
      <a href="#top" class="logo" @click="closeMenu">
        <span class="logo-text">{{ brandName }}</span>
      </a>
      <button
        type="button"
        class="burger"
        :class="{ 'is-active': menuOpen }"
        :aria-expanded="menuOpen"
        aria-label="Меню"
        @click="toggleMenu"
      >
        <span /><span /><span />
      </button>
      <nav class="main-nav" :class="{ 'is-open': menuOpen }" id="mainNav">
        <ul>
          <li><a href="#about" @click="closeMenu">О нас</a></li>
          <li><a href="#team" @click="closeMenu">Команда</a></li>
          <li><a href="#calendar" @click="closeMenu">Афиша</a></li>
          <li><a href="#recruitment" @click="closeMenu">В хор</a></li>
          <li><a href="#contacts" @click="closeMenu">Контакты</a></li>
        </ul>
      </nav>
    </div>
  </header>
</template>
