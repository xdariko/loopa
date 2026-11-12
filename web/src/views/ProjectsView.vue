<template>
  <section class="page">
    <h1 class="page__title">Проекты</h1>
    <p class="page__hint">Список сохранённых проектов появится после подключения сервера.</p>
  </section>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4);
}

.page__title {
  margin-bottom: var(--space-2);
  font-size: 20px;
}

.page__hint {
  color: var(--color-text-muted);
}
</style>
