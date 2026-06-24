<script setup>
/**
 * Карусель — autoplay 4с, пауза при hover, translateX-анимация.
 * Настройка: props interval, autoplay, pauseOnHover
 */
import { ref, onMounted, onUnmounted, watch } from "vue";
import { imgUrl } from "../utils/imgUrl";

const props = defineProps({
  images: { type: Array, default: () => [] },
  captions: { type: Array, default: () => [] },
  autoplay: { type: Boolean, default: true },
  interval: { type: Number, default: 4000 },
  pauseOnHover: { type: Boolean, default: true },
  aspectClass: { type: String, default: "" }
});

const current = ref(0);
const paused = ref(false);
let timer = null;

function goTo(index, animate = true) {
  if (!props.images.length) return;
  current.value = ((index % props.images.length) + props.images.length) % props.images.length;
}

function next() {
  goTo(current.value + 1);
  if (props.autoplay && !paused.value) startAutoplay();
}

function prev() {
  goTo(current.value - 1);
  if (props.autoplay && !paused.value) startAutoplay();
}

function startAutoplay() {
  stopAutoplay();
  if (props.images.length <= 1) return;
  timer = setInterval(() => {
    if (!paused.value) goTo(current.value + 1);
  }, props.interval);
}

function stopAutoplay() {
  clearInterval(timer);
  timer = null;
}

function onKey(e) {
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
}

function onEnter() {
  if (!props.pauseOnHover) return;
  paused.value = true;
  stopAutoplay();
}

function onLeave() {
  if (!props.pauseOnHover) return;
  paused.value = false;
  if (props.autoplay) startAutoplay();
}

let touchX = 0;
function onTouchStart(e) { touchX = e.changedTouches[0].screenX; }
function onTouchEnd(e) {
  const d = e.changedTouches[0].screenX - touchX;
  if (Math.abs(d) < 40) return;
  d > 0 ? prev() : next();
}

onMounted(() => {
  document.addEventListener("keydown", onKey);
  if (props.autoplay) startAutoplay();
});

onUnmounted(() => {
  stopAutoplay();
  document.removeEventListener("keydown", onKey);
});

watch(() => props.images, () => {
  current.value = 0;
  if (props.autoplay) startAutoplay();
});
</script>

<template>
  <div
    v-if="images.length"
    class="carousel"
    :class="aspectClass"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
  >
    <div class="carousel-track" :style="{ transform: `translateX(-${current * 100}%)` }">
      <div
        v-for="(src, i) in images"
        :key="i"
        class="carousel-slide"
        :aria-hidden="i !== current"
      >
        <img :src="imgUrl(src)" :alt="captions[i] || `Слайд ${i + 1}`" :loading="i === 0 ? 'eager' : 'lazy'" />
        <p v-if="captions[i]" class="carousel-caption">{{ captions[i] }}</p>
      </div>
    </div>

    <template v-if="images.length > 1">
      <button type="button" class="carousel-btn carousel-btn--prev" aria-label="Назад" @click="prev">&#10094;</button>
      <button type="button" class="carousel-btn carousel-btn--next" aria-label="Вперёд" @click="next">&#10095;</button>
      <div class="carousel-dots" role="tablist">
        <button
          v-for="(_, i) in images"
          :key="i"
          type="button"
          class="carousel-dot"
          :class="{ 'is-active': i === current }"
          :aria-selected="i === current"
          :aria-label="`Слайд ${i + 1}`"
          @click="goTo(i)"
        />
      </div>
    </template>
  </div>
  <p v-else class="carousel-empty">Нет изображений</p>
</template>
