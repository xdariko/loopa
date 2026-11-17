<template>
  <section class="page">
    <h1 class="page__title">Общий проект</h1>
    <p class="page__hint">
      Открытие проекта по ссылке <code>{{ token }}</code> появится после подключения сервера.
    </p>
  </section>
</template>

<script setup lang="ts">
defineProps<{ token: string }>()
</script>
