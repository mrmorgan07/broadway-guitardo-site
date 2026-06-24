<script setup>
import { watch, ref } from "vue";
import Carousel from "./Carousel.vue";
import { imgUrl } from "../utils/imgUrl";
import { projectCardMetaLine } from "../utils/projectMeta";

const props = defineProps({
  project: { type: Object, default: null },
  open: { type: Boolean, default: false }
});

const emit = defineEmits(["close"]);
const dialog = ref(null);

watch(() => props.open, (v) => {
  if (v) {
    dialog.value?.showModal();
    document.body.style.overflow = "hidden";
  } else {
    dialog.value?.close();
    document.body.style.overflow = "";
  }
});

function onBackdrop(e) {
  const rect = dialog.value?.querySelector(".modal-inner")?.getBoundingClientRect();
  if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
    emit("close");
  }
}

function soloistText(s) {
  if (s && typeof s === "object") return [s.name, s.role].filter(Boolean).join(" — ");
  return String(s ?? "");
}
</script>

<template>
  <dialog ref="dialog" class="modal" @click="onBackdrop" @close="emit('close')">
    <div v-if="project" class="modal-inner glass-card">
      <button type="button" class="modal-close" aria-label="Закрыть" @click="emit('close')">&times;</button>
      <div class="modal-body">
        <img class="modal-poster" :src="imgUrl(project.poster)" :alt="project.title" />
        <h2>{{ project.title }}</h2>
        <p class="modal-meta">{{ project.date }} · {{ project.tag }}</p>
        <p v-if="projectCardMetaLine(project)" class="modal-extra">{{ projectCardMetaLine(project) }}</p>
        <p class="modal-description">{{ project.description }}</p>
        <Carousel v-if="project.gallery?.length" :images="project.gallery" class="modal-gallery" />
        <div class="modal-soloists">
          <h4>Солисты</h4>
          <ul>
            <li v-for="(s, i) in project.soloists" :key="i">{{ soloistText(s) }}</li>
          </ul>
        </div>
        <a :href="project.ticketLink" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
          Купить билеты
        </a>
      </div>
    </div>
  </dialog>
</template>
