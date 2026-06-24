import { ref, onMounted } from "vue";

export function useSiteData() {
  const db = ref(null);
  const loading = ref(true);
  const error = ref(null);

  onMounted(async () => {
    try {
      const res = await fetch("/api/content");
      if (!res.ok) throw new Error("Не удалось загрузить данные");
      db.value = await res.json();
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  });

  return { db, loading, error };
}
