<script setup>
/**
 * VideoModal
 * Поддерживает:
 *  - YouTube/Vimeo embed (hero.videoTrailerUrl)
 *  - Локальный видеофайл (hero.trailerFile → /uploads/videos/...)
 */
import { watch, ref, computed } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  videoUrl: { type: String, default: "" },   // YouTube/Vimeo embed URL
  trailerFile: { type: String, default: "" } // локальный файл /uploads/videos/...
});

const emit = defineEmits(["close"]);
const dialog = ref(null);

const localVideoUrl = computed(() => {
  const f = props.trailerFile;
  if (!f) return null;
  return f.startsWith("/") || f.startsWith("http") ? f : `/uploads/videos/${f}`;
});

const videoType = computed(() => {
  const u = localVideoUrl.value || "";
  if (u.endsWith(".webm")) return "video/webm";
  if (u.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
});

watch(() => props.open, (v) => {
  if (v) {
    dialog.value?.showModal();
    document.body.style.overflow = "hidden";
  } else {
    dialog.value?.close();
    document.body.style.overflow = "";
  }
});
</script>

<template>
  <dialog ref="dialog" class="modal modal-video" @close="emit('close')">
    <div class="modal-inner">
      <button type="button" class="modal-close" aria-label="Закрыть" @click="emit('close')">&times;</button>

      <!-- Локальный видеофайл -->
      <div v-if="open && localVideoUrl" class="video-embed">
        <video controls autoplay style="object-fit:contain;background:#000">
          <source :src="localVideoUrl" :type="videoType">
        </video>
      </div>

      <!-- YouTube / Vimeo -->
      <div v-else-if="open && videoUrl" class="video-embed">
        <iframe
          :src="`${videoUrl}?autoplay=1`"
          title="Трейлер"
          allow="autoplay; encrypted-media"
          allowfullscreen
        />
      </div>
    </div>
  </dialog>
</template>
