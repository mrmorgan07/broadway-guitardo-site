<script setup>
import { ref, computed, watch } from "vue";
import { useSiteData } from "./composables/useSiteData";
import AppHeader from "./components/AppHeader.vue";
import HeroSection from "./components/HeroSection.vue";
import AboutSection from "./components/AboutSection.vue";
import TeamSection from "./components/TeamSection.vue";
import CalendarSection from "./components/CalendarSection.vue";
import ProjectHighlight from "./components/ProjectHighlight.vue";
import RecruitmentSection from "./components/RecruitmentSection.vue";
import SiteFooter from "./components/SiteFooter.vue";
import ProjectModal from "./components/ProjectModal.vue";
import VideoModal from "./components/VideoModal.vue";
import ScrollTopButton from "./components/ScrollTopButton.vue";

const { db, loading, error } = useSiteData();

const selectedProjectId = ref(null);
const videoOpen = ref(false);

const selectedProject = computed(() =>
  db.value?.projects?.find((p) => p.id === selectedProjectId.value) ?? null
);

const modalOpen = computed({
  get: () => !!selectedProjectId.value,
  set: (v) => { if (!v) selectedProjectId.value = null; }
});

function openProject(id) {
  selectedProjectId.value = id;
}

function applySeo(seo) {
  if (!seo) return;
  if (seo.title) document.title = seo.title;
  const set = (sel, val) => {
    const el = document.querySelector(sel);
    if (el && val) el.setAttribute("content", val);
  };
  set('meta[name="description"]', seo.description);
  set('meta[name="keywords"]', seo.keywords);
}

watch(db, (data) => {
  if (data?.seo) applySeo(data.seo);
}, { immediate: true });
</script>

<template>
  <div v-if="loading" class="loading-screen">Загрузка…</div>

  <div v-else-if="error" class="loading-screen error">
    {{ error }}. Запустите бэкенд: <code>npm start</code>
  </div>

  <template v-else-if="db">
    <ScrollTopButton />
    <AppHeader :brand-name="db.brand?.name" />

    <main>
      <HeroSection :hero="db.hero" @play-video="videoOpen = true" />
      <AboutSection :about="db.about" />
      <TeamSection
        :artistic-director="db.artisticDirector"
        :concertmaster="db.concertmaster"
      />
      <CalendarSection :projects="db.projects" @open-project="openProject" />
      <ProjectHighlight :projects="db.projects" />
      <RecruitmentSection :choir-invite="db.choirInvite" />
    </main>

    <SiteFooter :contacts="db.contacts" :brand="db.brand" />

    <ProjectModal
      :project="selectedProject"
      :open="modalOpen"
      @close="selectedProjectId = null"
    />
    <VideoModal
      :open="videoOpen"
      :video-url="db.hero?.videoTrailerUrl"
      :trailer-file="db.hero?.trailerFile"
      @close="videoOpen = false"
    />
  </template>
</template>

<style scoped>
.loading-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0a0a0c;
  color: #d4af37;
  font-family: Inter, sans-serif;
}
.loading-screen.error {
  color: #f5f5f5;
  padding: 2rem;
  text-align: center;
}
</style>
