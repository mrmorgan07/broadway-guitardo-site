<script setup>
import { imgUrl } from "../utils/imgUrl";

defineProps({
  choirInvite: { type: Object, required: true }
});
</script>

<template>
  <section class="section recruitment" id="recruitment">
    <div class="recruitment-bg">
      <img v-if="choirInvite.background" :src="imgUrl(choirInvite.background)" alt="" />
    </div>
    <div class="recruitment-overlay" />
    <div class="container recruitment-content reveal is-visible">
      <h2>Присоединяйся к нам</h2>
      <p>{{ choirInvite.text }}</p>
      <a :href="choirInvite.link" class="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
        Записаться в хор / Купить абонемент
      </a>
    </div>
  </section>
</template>
