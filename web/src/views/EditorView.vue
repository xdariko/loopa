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

<style scoped>
.editor {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  height: 100%;
}

.editor__tracks {
  border-right: 1px solid var(--color-border);
}

.editor__workspace {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.editor__grid {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 0;
  margin: 0 var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.editor__placeholder {
  color: var(--color-text-muted);
}

.editor__arrangement {
  height: var(--arrangement-height);
  flex-shrink: 0;
}
</style>
