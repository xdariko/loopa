<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app__main {
  flex: 1;
  min-height: 0;
}
</style>
