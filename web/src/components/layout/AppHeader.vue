<script setup lang="ts">
import { ref } from 'vue'

const projectTitle = ref('Без названия')
</script>

<template>
  <header class="header">
    <RouterLink to="/" class="header__logo">loopa</RouterLink>

    <input v-model="projectTitle" class="header__title" type="text" aria-label="Название проекта" />

    <nav class="header__actions">
      <RouterLink to="/projects" class="header__link">Проекты</RouterLink>
      <button type="button" class="header__button" disabled title="Появится на этапе 6">
        Сохранить
      </button>
      <button type="button" class="header__icon" aria-label="Меню проекта">⋯</button>
    </nav>
  </header>
</template>
