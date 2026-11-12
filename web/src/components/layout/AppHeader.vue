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

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: var(--header-height);
  padding: 0 var(--space-4);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.header__logo {
  font-weight: 700;
  font-size: var(--font-size-lg);
  letter-spacing: -0.02em;
}

.header__title {
  min-width: 0;
  max-width: 280px;
  padding: var(--space-1) var(--space-2);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
}

.header__title:hover,
.header__title:focus {
  border-color: var(--color-border);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.header__link {
  padding: var(--space-1) var(--space-2);
  color: var(--color-text-muted);
}

.header__link:hover,
.header__link.router-link-exact-active {
  color: var(--color-text);
}

.header__button {
  padding: var(--space-1) var(--space-3);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-sm);
}

.header__button:disabled {
  opacity: 0.5;
  cursor: default;
}

.header__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}

.header__icon:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}
</style>
