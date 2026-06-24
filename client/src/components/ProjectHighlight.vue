<script setup>
import { computed } from "vue";
import Carousel from "./Carousel.vue";
import { imgUrl } from "../utils/imgUrl";

const props = defineProps({
  projects: { type: Array, default: () => [] }
});

const project = computed(() => props.projects[0] || null);
</script>

<template>
  <section v-if="project" class="section project-details" id="project-details">
    <div class="container reveal is-visible">
      <header class="section-header">
        <h2>Текущий проект</h2>
        <div class="section-divider" />
      </header>
      <div class="project-highlight glass-card">
        <div class="project-highlight-poster">
          <img :src="imgUrl(project.poster)" :alt="project.title" />
        </div>
        <div>
          <h3>{{ project.title }}</h3>
          <p class="project-date">{{ project.date }} · {{ project.tag }}</p>
          <p>{{ project.description }}</p>
          <Carousel v-if="project.gallery?.length" :images="project.gallery" class="modal-gallery" />
          <a :href="project.ticketLink" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Купить билеты
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
