<script setup>
import { imgUrl } from "../utils/imgUrl";
import { projectCardMetaLine } from "../utils/projectMeta";

defineProps({
  projects: { type: Array, default: () => [] }
});

const emit = defineEmits(["open-project"]);
</script>

<template>
  <section class="section calendar" id="calendar">
    <div class="container">
      <header class="section-header reveal is-visible">
        <h2>Афиша</h2>
        <div class="section-divider" />
        <p class="section-lead">Выберите спектакль для подробностей</p>
      </header>
      <div class="projects-grid" role="list">
        <button
          v-for="p in projects"
          :key="p.id"
          type="button"
          class="project-card glass-card reveal is-visible"
          role="listitem"
          :aria-label="`Подробнее о «${p.title}»`"
          @click="emit('open-project', p.id)"
        >
          <div class="project-poster">
            <img :src="imgUrl(p.poster)" :alt="`Постер: ${p.title}`" loading="lazy" />
            <span class="project-tag">{{ p.tag }}</span>
          </div>
          <div class="project-info">
            <h3>{{ p.title }}</h3>
            <p class="project-date">{{ p.date }}</p>
            <p v-if="projectCardMetaLine(p)" class="project-meta">{{ projectCardMetaLine(p) }}</p>
            <p class="project-hint">Нажмите для подробностей →</p>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>
