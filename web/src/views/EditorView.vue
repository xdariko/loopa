<script setup lang="ts">
import TrackPanel from '@/components/editor/TrackPanel.vue'
import TransportBar from '@/components/editor/TransportBar.vue'
import ArrangementPanel from '@/components/editor/ArrangementPanel.vue'
</script>

<template>
  <div class="editor">
    <TrackPanel class="editor__tracks" />

    <section class="editor__workspace">
      <TransportBar />
      <div class="editor__grid" data-testid="grid-area">
        <p class="editor__placeholder">Сетка паттерна</p>
      </div>
      <ArrangementPanel class="editor__arrangement" />
    </section>
  </div>
</template>
