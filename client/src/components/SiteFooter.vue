<script setup>
const props = defineProps({
  contacts: { type: Object, required: true },
  brand: { type: Object, default: () => ({}) }
});

const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer" id="contacts">
    <div class="container footer-grid">
      <div class="footer-brand">
        <p class="footer-logo">{{ brand.name || "Broadway Guitardo" }}</p>
        <p class="footer-tagline">{{ brand.tagline || "Мюзиклы в живом исполнении" }}</p>
      </div>
      <div class="footer-contacts">
        <h3>Контакты</h3>
        <p><a :href="`mailto:${contacts.email}`">{{ contacts.email }}</a></p>
        <p><a :href="`tel:${contacts.phone?.replace(/\D/g, '')}`">{{ contacts.phone }}</a></p>
      </div>
      <div class="footer-social">
        <h3>Соцсети</h3>
        <div class="social-links">
          <a
            v-if="contacts.social?.vk"
            :href="contacts.social.vk"
            class="social-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ВКонтакте"
          >VK</a>
          <a
            v-if="contacts.social?.telegram"
            :href="contacts.social.telegram"
            class="social-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
          >TG</a>
          <a
            v-if="contacts.social?.youtube"
            :href="contacts.social.youtube"
            class="social-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
          >YT</a>
        </div>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>&copy; {{ year }} Broadway Guitardo</p>
    </div>
  </footer>
</template>
