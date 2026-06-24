<script setup>
import { computed } from "vue";
import { imgUrl } from "../utils/imgUrl";

const props = defineProps({
  artisticDirector: { type: Object, required: true },
  concertmaster: { type: Object, required: true }
});

const members = computed(() => [
  { ...props.artisticDirector, role: "Художественный руководитель" },
  { ...props.concertmaster, role: "Концертмейстер" }
]);
</script>

<template>
  <section class="section team" id="team">
    <div class="container">
      <header class="section-header reveal is-visible">
        <h2>Команда</h2>
        <div class="section-divider" />
      </header>
      <div class="team-grid">
        <article v-for="m in members" :key="m.role" class="team-card glass-card reveal is-visible">
          <div class="team-photo">
            <img :src="imgUrl(m.photo)" :alt="m.name" loading="lazy" />
          </div>
          <div class="team-info">
            <h3>{{ m.name }}</h3>
            <p class="team-role">{{ m.role }}</p>
            <p class="team-bio">{{ m.bio }}</p>
            <div class="team-awards">
              <strong>Регалии и достижения</strong>
              {{ m.achievements }}
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
