<script setup>
/**
 * HeroSection
 * Фон: приоритет — локальный видеофайл (hero.videoFile),
 * затем изображение (hero.background).
 * Кнопка Play — открывает трейлер (локальный видеофайл или YouTube).
 */
import { computed } from "vue";
import { imgUrl } from "../utils/imgUrl";

const props = defineProps({
  hero: { type: Object, required: true }
});

const emit = defineEmits(["play-video"]);

// Определяем URL локального фонового видео
const bgVideoUrl = computed(() => {
  const v = props.hero?.videoFile;
  if (!v) return null;
  return v.startsWith("/") || v.startsWith("http") ? v : `/uploads/videos/${v}`;
});

// Расширение файла для атрибута type
const bgVideoType = computed(() => {
  const v = bgVideoUrl.value || "";
  if (v.endsWith(".webm")) return "video/webm";
  if (v.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
});

// Есть ли трейлер для воспроизведения (кнопка Play видна)
const hasTrailer = computed(() =>
  !!(props.hero?.videoTrailerUrl || props.hero?.trailerFile)
);
</script>

<template>
  <section class="hero" id="hero" aria-label="Главный экран">

    <!-- Фоновое видео (локальный файл) -->
    <div v-if="bgVideoUrl" class="hero-video-wrap" aria-hidden="true">
      <video
        autoplay
        muted
        loop
        playsinline
        class="hero-bg-video"
      >
        <source :src="bgVideoUrl" :type="bgVideoType">
      </video>
    </div>

    <!-- Фоновое изображение (если видео не задано) -->
    <div v-else class="hero-video-placeholder" aria-hidden="true">
      <img v-if="hero.background" :src="imgUrl(hero.background)" alt="" class="hero-bg-img" />
    </div>

    <!-- Кнопка Play для трейлера -->
    <button
      v-if="hasTrailer"
      type="button"
      class="hero-play-btn"
      style="z-index:3"
      aria-label="Смотреть трейлер"
      @click="emit('play-video')"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
    </button>

    <div class="hero-overlay" />

    <div class="container hero-content reveal is-visible">
      <p class="hero-eyebrow">{{ hero.eyebrow }}</p>
      <h1 class="hero-title">{{ hero.title }}</h1>
      <p class="hero-subtitle">{{ hero.subtitle }}</p>
      <div class="hero-actions">
        <a href="#calendar" class="btn btn-primary">Купить билеты</a>
        <a href="#project-details" class="btn btn-outline">О проекте</a>
      </div>
    </div>
  </section>
</template>
