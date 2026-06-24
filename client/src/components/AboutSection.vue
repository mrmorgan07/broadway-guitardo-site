<script setup>
import Carousel from "./Carousel.vue";

defineProps({
  about: { type: Object, required: true }
});
</script>

<template>
  <section class="section about" id="about">
    <div class="container">
      <header class="section-header reveal is-visible">
        <h2>О коллективе</h2>
        <div class="section-divider" />
      </header>
      <div class="about-grid">
        <div class="about-text reveal is-visible">
          <p>{{ about.text }}</p>
        </div>
        <div class="about-carousel-wrap reveal is-visible">
          <Carousel
            aspect-class="about-carousel"
            :images="about.photos || []"
            :captions="about.captions || []"
          />
        </div>
      </div>
    </div>
  </section>
</template>
