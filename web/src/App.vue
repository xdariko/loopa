<template>
  <div class="app">
    <AppHeader />
    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>
